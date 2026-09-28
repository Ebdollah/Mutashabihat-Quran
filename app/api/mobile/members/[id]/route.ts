import { z } from 'zod';
import { handle, HttpError, json, preflight, readJson, requireMobileUser } from '@/lib/mobile/http';
import { getRepo } from '@/lib/repo';
import { wordIndex } from '@/lib/services/members';

export const OPTIONS = preflight;

async function memberId(ctx: RouteContext<'/api/mobile/members/[id]'>) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, 'Ayah not found in your sets.');
  return id;
}

/** PATCH { s, e } → { set } — changes the marked similar words. */
export async function PATCH(req: Request, ctx: RouteContext<'/api/mobile/members/[id]'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    const { s, e } = z.object({ s: wordIndex, e: wordIndex }).parse(await readJson(req));
    return json({ set: await getRepo().updateMemberPhrase(user.id, await memberId(ctx), s, e) });
  });
}

/** DELETE → { set } or { set: null } when that was the set's last ayah (the set is deleted). */
export async function DELETE(req: Request, ctx: RouteContext<'/api/mobile/members/[id]'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    return json({ set: await getRepo().removeMember(user.id, await memberId(ctx)) });
  });
}
