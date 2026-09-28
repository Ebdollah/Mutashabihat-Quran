import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { sets, setMembers, users } from '@/db/schema';
import { assertNoDuplicateKeys, defaultTitle, normalizeEmail, prepareMember } from './shared';
import { RepoError, type MutashabihSet, type Repository, type SetMember, type User } from './types';

/**
 * Postgres (Neon) implementation of the same Repository interface as json-repo.ts.
 * No interactive transactions are used, so it works with every DB_DRIVER including neon-http.
 */

type SetRow = typeof sets.$inferSelect & { members: (typeof setMembers.$inferSelect)[] };
type UserRow = typeof users.$inferSelect;

const iso = (d: Date) => d.toISOString();

const toUser = (r: UserRow): User => ({ ...r, createdAt: iso(r.createdAt) });

function toSet(r: SetRow): MutashabihSet {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    note: r.note,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    members: [...r.members]
      .sort((a, b) => a.position - b.position)
      .map((m): SetMember => ({
        id: m.id,
        setId: m.setId,
        verseKey: m.verseKey,
        surah: m.surah,
        ayah: m.ayah,
        phraseStart: m.phraseStart,
        phraseEnd: m.phraseEnd,
        phraseText: m.phraseText,
        textSnapshot: m.textSnapshot,
        position: m.position,
        createdAt: iso(m.createdAt),
      })),
  };
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

const withMembers = { members: { orderBy: [asc(setMembers.position)] } };

async function loadSet(userId: string, setId: string): Promise<MutashabihSet | null> {
  const row = await getDb().query.sets.findFirst({
    where: and(eq(sets.id, setId), eq(sets.userId, userId)),
    with: withMembers,
  });
  return row ? toSet(row) : null;
}

async function mustLoadSet(userId: string, setId: string): Promise<MutashabihSet> {
  const set = await loadSet(userId, setId);
  if (!set) throw new RepoError('not_found', 'Set not found.');
  return set;
}

async function touch(setId: string) {
  await getDb().update(sets).set({ updatedAt: new Date() }).where(eq(sets.id, setId));
}

async function memberOwner(userId: string, memberId: string) {
  const [m] = await getDb()
    .select()
    .from(setMembers)
    .where(and(eq(setMembers.id, memberId), eq(setMembers.userId, userId)));
  if (!m) throw new RepoError('not_found', 'Ayah not found in your sets.');
  return m;
}

export const drizzleRepo: Repository = {
  // ---- users ----
  async getUserByEmail(email) {
    const [r] = await getDb().select().from(users).where(eq(users.email, normalizeEmail(email)));
    return r ? toUser(r) : null;
  },
  async getUserById(id) {
    const [r] = await getDb().select().from(users).where(eq(users.id, id));
    return r ? toUser(r) : null;
  },
  async createUser(input) {
    try {
      const [r] = await getDb()
        .insert(users)
        .values({ email: normalizeEmail(input.email), name: input.name, passwordHash: input.passwordHash })
        .returning();
      return toUser(r);
    } catch (err) {
      if (isUniqueViolation(err)) throw new RepoError('email_taken', 'An account with this email already exists.');
      throw err;
    }
  },
  async updatePassword(userId, passwordHash) {
    await getDb().update(users).set({ passwordHash }).where(eq(users.id, userId));
  },

  // ---- sets ----
  async listSets(userId) {
    const rows = await getDb().query.sets.findMany({
      where: eq(sets.userId, userId),
      orderBy: [desc(sets.updatedAt)],
      with: withMembers,
    });
    return rows.map(toSet);
  },
  getSet: loadSet,
  async findSetsByVerse(userId, verseKey) {
    const hits = await getDb()
      .selectDistinct({ setId: setMembers.setId })
      .from(setMembers)
      .where(and(eq(setMembers.userId, userId), eq(setMembers.verseKey, verseKey)));
    if (hits.length === 0) return [];
    const rows = await getDb().query.sets.findMany({
      where: and(eq(sets.userId, userId), inArray(sets.id, hits.map((h) => h.setId))),
      orderBy: [desc(sets.updatedAt)],
      with: withMembers,
    });
    return rows.map(toSet);
  },
  async createSet(userId, input) {
    if (input.members.length === 0) throw new RepoError('invalid', 'A set needs at least one ayah.');
    assertNoDuplicateKeys(input.members.map((m) => m.verseKey));
    const prepared = input.members.map(prepareMember);
    const db = getDb();
    const [set] = await db
      .insert(sets)
      .values({ userId, title: input.title?.trim() || defaultTitle(input.members) })
      .returning();
    try {
      await db.insert(setMembers).values(prepared.map((m, i) => ({ ...m, setId: set.id, userId, position: i })));
    } catch (err) {
      await db.delete(sets).where(eq(sets.id, set.id)); // manual rollback (no transactions on neon-http)
      throw err;
    }
    return mustLoadSet(userId, set.id);
  },
  async addMember(userId, setId, member) {
    const set = await mustLoadSet(userId, setId);
    assertNoDuplicateKeys([...set.members.map((m) => m.verseKey), member.verseKey]);
    try {
      await getDb()
        .insert(setMembers)
        .values({ ...prepareMember(member), setId, userId, position: set.members.length });
    } catch (err) {
      if (isUniqueViolation(err)) throw new RepoError('duplicate_member', 'This ayah is already in the set.');
      throw err;
    }
    await touch(setId);
    return mustLoadSet(userId, setId);
  },
  async updateMemberPhrase(userId, memberId, phraseStart, phraseEnd) {
    const m = await memberOwner(userId, memberId);
    const p = prepareMember({ verseKey: m.verseKey, textSnapshot: m.textSnapshot, phraseStart, phraseEnd });
    await getDb()
      .update(setMembers)
      .set({ phraseStart: p.phraseStart, phraseEnd: p.phraseEnd, phraseText: p.phraseText })
      .where(eq(setMembers.id, memberId));
    await touch(m.setId);
    return mustLoadSet(userId, m.setId);
  },
  async removeMember(userId, memberId) {
    const m = await memberOwner(userId, memberId);
    const db = getDb();
    await db.delete(setMembers).where(eq(setMembers.id, memberId));
    const rest = await db
      .select({ id: setMembers.id })
      .from(setMembers)
      .where(eq(setMembers.setId, m.setId))
      .orderBy(asc(setMembers.position));
    if (rest.length === 0) {
      await db.delete(sets).where(eq(sets.id, m.setId));
      return null;
    }
    for (const [i, r] of rest.entries()) {
      await db.update(setMembers).set({ position: i }).where(eq(setMembers.id, r.id));
    }
    await touch(m.setId);
    return mustLoadSet(userId, m.setId);
  },
  async renameSet(userId, setId, title) {
    await mustLoadSet(userId, setId);
    if (title.trim()) {
      await getDb().update(sets).set({ title: title.trim(), updatedAt: new Date() }).where(eq(sets.id, setId));
    }
    return mustLoadSet(userId, setId);
  },
  async reorderMembers(userId, setId, memberIds) {
    const set = await mustLoadSet(userId, setId);
    const ids = new Set(set.members.map((m) => m.id));
    if (memberIds.length !== ids.size || memberIds.some((id) => !ids.has(id))) {
      throw new RepoError('invalid', 'Member list does not match the set.');
    }
    for (const [i, id] of memberIds.entries()) {
      await getDb().update(setMembers).set({ position: i }).where(eq(setMembers.id, id));
    }
    await touch(setId);
    return mustLoadSet(userId, setId);
  },
  async deleteSet(userId, setId) {
    await mustLoadSet(userId, setId);
    await getDb().delete(sets).where(eq(sets.id, setId));
  },
};
