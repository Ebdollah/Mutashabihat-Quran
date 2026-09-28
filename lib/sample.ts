import sample from '@/data/sample-sets.json';
import type { NewMember, Repository } from '@/lib/repo/types';

type SampleSet = { title: string; members: NewMember[] };

/** Adds the sample mutashabihat sets (data/sample-sets.json) to a user. Skips titles the user already has. */
export async function addSampleSets(repo: Repository, userId: string): Promise<number> {
  const existing = new Set((await repo.listSets(userId)).map((s) => s.title));
  let added = 0;
  // Reverse so the first sample ends up as the most recently updated (top of the list).
  for (const s of [...(sample.sets as SampleSet[])].reverse()) {
    if (existing.has(s.title)) continue;
    await repo.createSet(userId, { title: s.title, members: s.members });
    added++;
  }
  return added;
}
