import { z } from 'zod';
import { handle, HttpError, json, preflight, readJson, requireMobileUser } from '@/lib/mobile/http';
import { getVerses } from '@/lib/quran/client';
import { nextKey, prevKey } from '@/lib/quran/verseKey';
import { getRepo } from '@/lib/repo';

export const OPTIONS = preflight;

async function setId(ctx: RouteContext<'/api/mobile/sets/[id]'>) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, 'Set not found.');
  return id;
}

/** GET → { set, context: { "2:57": "…" } } — context holds the ayahs before/after each member. */
export async function GET(req: Request, ctx: RouteContext<'/api/mobile/sets/[id]'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    const set = await getRepo().getSet(user.id, await setId(ctx));
    if (!set) throw new HttpError(404, 'Set not found.');
    const keys = set.members.flatMap((m) => [prevKey(m.verseKey), nextKey(m.verseKey)]).filter((k): k is string => !!k);
    const verses = await getVerses(keys);
    const context = Object.fromEntries(Object.values(verses).map((v) => [v.key, v.text]));
    return json({ set, context });
  });
}

/** PATCH { title } → { set } */
export async function PATCH(req: Request, ctx: RouteContext<'/api/mobile/sets/[id]'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    const { title } = z.object({ title: z.string().trim().min(1).max(120) }).parse(await readJson(req));
    return json({ set: await getRepo().renameSet(user.id, await setId(ctx), title) });
  });
}

/** DELETE → { deleted: true } */
export async function DELETE(req: Request, ctx: RouteContext<'/api/mobile/sets/[id]'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    await getRepo().deleteSet(user.id, await setId(ctx));
    return json({ deleted: true });
  });
}
