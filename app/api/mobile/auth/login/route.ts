import { handle, HttpError, json, preflight, publicUser, readJson } from '@/lib/mobile/http';
import { signMobileToken } from '@/lib/mobile/token';
import { credentialsSchema, verifyCredentials } from '@/lib/services/accounts';

export const OPTIONS = preflight;

/** POST { email, password } → { token, user } */
export async function POST(req: Request) {
  return handle(async () => {
    const parsed = credentialsSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, 'Enter your email and password.');
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) throw new HttpError(401, 'Email or password is incorrect.');
    return json({ token: await signMobileToken(user.id), user: publicUser(user) });
  });
}
