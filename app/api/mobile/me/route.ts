import { handle, json, preflight, publicUser, requireMobileUser } from '@/lib/mobile/http';

export const OPTIONS = preflight;

/** GET → { user } (also a cheap "is my token still valid?" check) */
export async function GET(req: Request) {
  return handle(async () => json({ user: publicUser(await requireMobileUser(req)) }));
}
