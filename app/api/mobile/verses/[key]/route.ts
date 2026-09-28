import { handle, HttpError, json, preflight, requireMobileUser } from '@/lib/mobile/http';
import { getVerse } from '@/lib/quran/client';
import { getRepo } from '@/lib/repo';
import { verseKeySchema } from '@/lib/services/members';

export const OPTIONS = preflight;

/** GET /verses/2:58 → { verse: { key, surah, ayah, text }, sets } — sets = the user's sets containing it. */
export async function GET(req: Request, ctx: RouteContext<'/api/mobile/verses/[key]'>) {
  return handle(async () => {
    const user = await requireMobileUser(req);
    const key = verseKeySchema.parse(decodeURIComponent((await ctx.params).key));
    const verse = await getVerse(key);
    if (!verse) throw new HttpError(404, `Ayah ${key} was not found.`);
    return json({ verse, sets: await getRepo().findSetsByVerse(user.id, key) });
  });
}
