import { jwtVerify, SignJWT } from 'jose';

/**
 * Bearer tokens for the mobile app. Signed with AUTH_SECRET (HS256), like the website's sessions,
 * but with their own audience so a mobile token can't be used as a website cookie or vice versa.
 */
const AUDIENCE = 'mutashabihat-mobile';
const TTL = '90d';

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return new TextEncoder().encode(secret);
}

export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(key());
}

/** The user id in a valid token, or null. */
export async function verifyMobileToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUDIENCE, algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
