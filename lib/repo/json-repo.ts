import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import { assertNoDuplicateKeys, defaultTitle, normalizeEmail, prepareMember } from './shared';
import { RepoError, type MutashabihSet, type NewMember, type Repository, type SetMember, type User } from './types';

/**
 * Local file store that mirrors the DB repository. Used while STORAGE=json.
 * Writes go to a temp file and are renamed over the real one, so a crash never leaves half a file.
 */

type Store = { version: 1; users: User[]; sets: MutashabihSet[] };

// The JSON store is runtime data, not code: keep it out of the build's file tracing.
const file = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.JSON_STORE_PATH);

async function load(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(file(), 'utf8')) as Store;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, users: [], sets: [] };
    throw err;
  }
}

async function save(store: Store) {
  const target = file();
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, target);
}

// Serialises read-modify-write cycles inside this process.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const store = await load();
    const result = await fn(store);
    await save(store);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const now = () => new Date().toISOString();
const byUpdated = (a: MutashabihSet, b: MutashabihSet) => b.updatedAt.localeCompare(a.updatedAt);

function ownedSet(store: Store, userId: string, setId: string): MutashabihSet {
  const set = store.sets.find((s) => s.id === setId && s.userId === userId);
  if (!set) throw new RepoError('not_found', 'Set not found.');
  return set;
}

function ownedMember(store: Store, userId: string, memberId: string) {
  for (const set of store.sets) {
    if (set.userId !== userId) continue;
    const member = set.members.find((m) => m.id === memberId);
    if (member) return { set, member };
  }
  throw new RepoError('not_found', 'Ayah not found in your sets.');
}

function makeMember(setId: string, m: NewMember, position: number): SetMember {
  return { id: randomUUID(), setId, position, createdAt: now(), ...prepareMember(m) };
}

const renumber = (set: MutashabihSet) => set.members.forEach((m, i) => (m.position = i));

export const jsonRepo: Repository = {
  // ---- users ----
  async getUserByEmail(email) {
    const e = normalizeEmail(email);
    return (await load()).users.find((u) => u.email === e) ?? null;
  },
  async getUserById(id) {
    return (await load()).users.find((u) => u.id === id) ?? null;
  },
  createUser(input) {
    return mutate((store) => {
      const email = normalizeEmail(input.email);
      if (store.users.some((u) => u.email === email)) throw new RepoError('email_taken', 'An account with this email already exists.');
      const user: User = { id: randomUUID(), email, name: input.name, passwordHash: input.passwordHash, createdAt: now() };
      store.users.push(user);
      return user;
    });
  },
  updatePassword(userId, passwordHash) {
    return mutate((store) => {
      const user = store.users.find((u) => u.id === userId);
      if (!user) throw new RepoError('not_found', 'User not found.');
      user.passwordHash = passwordHash;
    });
  },

  // ---- sets ----
  async listSets(userId) {
    return (await load()).sets.filter((s) => s.userId === userId).sort(byUpdated);
  },
  async getSet(userId, setId) {
    return (await load()).sets.find((s) => s.id === setId && s.userId === userId) ?? null;
  },
  async findSetsByVerse(userId, verseKey) {
    return (await load()).sets
      .filter((s) => s.userId === userId && s.members.some((m) => m.verseKey === verseKey))
      .sort(byUpdated);
  },
  createSet(userId, input) {
    return mutate((store) => {
      if (input.members.length === 0) throw new RepoError('invalid', 'A set needs at least one ayah.');
      assertNoDuplicateKeys(input.members.map((m) => m.verseKey));
      const id = randomUUID();
      const set: MutashabihSet = {
        id,
        userId,
        title: input.title?.trim() || defaultTitle(input.members),
        note: null,
        members: input.members.map((m, i) => makeMember(id, m, i)),
        createdAt: now(),
        updatedAt: now(),
      };
      store.sets.push(set);
      return set;
    });
  },
  addMember(userId, setId, member) {
    return mutate((store) => {
      const set = ownedSet(store, userId, setId);
      assertNoDuplicateKeys([...set.members.map((m) => m.verseKey), member.verseKey]);
      set.members.push(makeMember(set.id, member, set.members.length));
      set.updatedAt = now();
      return set;
    });
  },
  updateMemberPhrase(userId, memberId, phraseStart, phraseEnd) {
    return mutate((store) => {
      const { set, member } = ownedMember(store, userId, memberId);
      Object.assign(member, prepareMember({ ...member, phraseStart, phraseEnd }));
      set.updatedAt = now();
      return set;
    });
  },
  removeMember(userId, memberId) {
    return mutate((store) => {
      const { set } = ownedMember(store, userId, memberId);
      set.members = set.members.filter((m) => m.id !== memberId);
      if (set.members.length === 0) {
        store.sets = store.sets.filter((s) => s.id !== set.id);
        return null;
      }
      renumber(set);
      set.updatedAt = now();
      return set;
    });
  },
  renameSet(userId, setId, title) {
    return mutate((store) => {
      const set = ownedSet(store, userId, setId);
      set.title = title.trim() || set.title;
      set.updatedAt = now();
      return set;
    });
  },
  reorderMembers(userId, setId, memberIds) {
    return mutate((store) => {
      const set = ownedSet(store, userId, setId);
      const byId = new Map(set.members.map((m) => [m.id, m]));
      if (memberIds.length !== set.members.length || memberIds.some((id) => !byId.has(id))) {
        throw new RepoError('invalid', 'Member list does not match the set.');
      }
      set.members = memberIds.map((id) => byId.get(id)!);
      renumber(set);
      set.updatedAt = now();
      return set;
    });
  },
  deleteSet(userId, setId) {
    return mutate((store) => {
      ownedSet(store, userId, setId);
      store.sets = store.sets.filter((s) => s.id !== setId);
    });
  },
};
