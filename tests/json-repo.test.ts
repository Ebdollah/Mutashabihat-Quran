import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import sample from '@/data/sample-sets.json';
import type { Repository } from '@/lib/repo/types';

const dir = mkdtempSync(path.join(tmpdir(), 'mutashabihat-'));
let repo: Repository;

beforeAll(async () => {
  vi.stubEnv('STORAGE', 'json');
  vi.stubEnv('JSON_STORE_PATH', path.join(dir, 'store.json'));
  repo = (await import('@/lib/repo/json-repo')).jsonRepo;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const [m1, m2] = sample.sets[1].members; // 2:58, 7:161

describe('json repository', () => {
  it('creates users with unique emails (case-insensitive)', async () => {
    await repo.createUser({ email: 'A@Example.com', name: null, passwordHash: 'x' });
    await expect(repo.createUser({ email: 'a@example.com', name: null, passwordHash: 'y' })).rejects.toThrow(/already exists/);
    expect((await repo.getUserByEmail('A@EXAMPLE.COM'))?.email).toBe('a@example.com');
  });

  it('creates sets, finds them by verse, and keeps users apart', async () => {
    const set = await repo.createSet('u1', { members: [m1] });
    expect(set.title.length).toBeGreaterThan(0);
    expect(set.members[0].phraseText.length).toBeGreaterThan(0);

    await repo.addMember('u1', set.id, m2);
    await expect(repo.addMember('u1', set.id, m2)).rejects.toThrow(/twice/);

    expect(await repo.findSetsByVerse('u1', '7:161')).toHaveLength(1);
    expect(await repo.findSetsByVerse('u2', '7:161')).toHaveLength(0);
    expect(await repo.getSet('u2', set.id)).toBeNull();
    await expect(repo.renameSet('u2', set.id, 'hack')).rejects.toThrow(/not found/);
  });

  it('rejects invalid phrase ranges', async () => {
    await expect(repo.createSet('u1', { members: [{ ...m1, phraseEnd: 999 }] })).rejects.toThrow(/phrase/);
  });

  it('deletes the set when its last ayah is removed', async () => {
    const set = await repo.createSet('u3', { title: 'Temp', members: [m1, m2] });
    expect(await repo.removeMember('u3', set.members[0].id)).not.toBeNull();
    expect(await repo.removeMember('u3', set.members[1].id)).toBeNull();
    expect(await repo.listSets('u3')).toHaveLength(0);
  });

  it('survives concurrent writes', async () => {
    const set = await repo.createSet('u4', { title: 'Race', members: [m1] });
    await Promise.all([repo.renameSet('u4', set.id, 'A'), repo.addMember('u4', set.id, m2), repo.createSet('u4', { members: [m2] })]);
    const sets = await repo.listSets('u4');
    expect(sets).toHaveLength(2);
    expect(sets.find((s) => s.id === set.id)?.members).toHaveLength(2);
  });
});
