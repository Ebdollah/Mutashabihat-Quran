import { handle, json, preflight, publicUser, readJson } from '@/lib/mobile/http';
import { signMobileToken } from '@/lib/mobile/token';
import { createAccount, signupSchema } from '@/lib/services/accounts';

export const OPTIONS = preflight;

/** POST { name?, email, password, confirm } → { token, user } */
export async function POST(req: Request) {
  return handle(async () => {
    const data = signupSchema.parse(await readJson(req));
    const user = await createAccount(data);
    return json({ token: await signMobileToken(user.id), user: publicUser(user) }, 201);
  });
}
