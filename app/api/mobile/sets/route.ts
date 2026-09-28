import { z } from 'zod';
import { handle, json, preflight, readJson, requireMobileUser } from '@/lib/mobile/http';
import { getRepo } from '@/lib/repo';
import { memberInput, toNewMember } from '@/lib/services/members';

export const OPTIONS = preflight;

/** GET → { sets } (most recently updated first) */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    return json({ sets: await getRepo().listSets(user.id) });
  });
}

const createInput = z.object({ title: z.string().max(120).optional(), members: z.array(memberInput).min(1).max(20) });

/** POST { title?, members: [{ key, s, e }] } → { set } */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    const data = createInput.parse(await readJson(req));
    const members = await Promise.all(data.members.map(toNewMember));
    return json({ set: await getRepo().createSet(user.id, { title: data.title, members }) }, 201);
  });
}
