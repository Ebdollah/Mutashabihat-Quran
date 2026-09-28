import { z } from 'zod';
import { QuranApiError } from '@/lib/quran/client';
import { getRepo, RepoError, type User } from '@/lib/repo';
import { verifyMobileToken } from './token';

// Bearer tokens (no cookies), so allowing any origin is safe. Needed for the Flutter web build.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: CORS });
export const error = (message: string, status: number) => json({ error: message }, status);
export const preflight = () => new Response(null, { status: 204, headers: CORS });

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const REPO_STATUS: Record<RepoError['code'], number> = { not_found: 404, duplicate_member: 409, email_taken: 409, invalid: 400 };

/** Runs a handler and turns known errors into JSON responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status);
    if (err instanceof z.ZodError) return error(err.issues[0].message, 400);
    if (err instanceof RepoError) return error(err.message, REPO_STATUS[err.code]);
    if (err instanceof QuranApiError) return error('Couldn’t load the ayah text. Try again.', 502);
    console.error('[mobile api]', err);
    return error('Something went wrong. Try again.', 500);
  }
}

/** The signed-in user from `Authorization: Bearer <token>`, or a 401. */
export async function requireMobileUser(req: Request): Promise<User> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? await verifyMobileToken(token) : null;
  const user = userId ? await getRepo().getUserById(userId) : null;
  if (!user) throw new HttpError(401, 'Please log in again.');
  return user;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Request body must be JSON.');
  }
}

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name });
