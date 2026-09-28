import { z } from 'zod';
import { handle, HttpError, json, preflight, readJson, requireMobileUser } from '@/lib/mobile/http';
import { getRepo } from '@/lib/repo';
import { memberInput, toNewMember } from '@/lib/services/members';

export const OPTIONS = preflight;

/** POST { key, s, e } → { set } — adds a similar ayah to the set. */
export async function POST(req: Request, ctx: RouteContext<'/api/mobile/sets/[id]/members'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, 'Set not found.');
    const member = await toNewMember(memberInput.parse(await readJson(req)));
    return json({ set: await getRepo().addMember(user.id, id, member) }, 201);
  });
}
