import { env } from '@/lib/env';
import { drizzleRepo } from './drizzle-repo';
import { jsonRepo } from './json-repo';
import type { Repository } from './types';

/** The single place that decides where data lives. UI and actions only ever call getRepo(). */
export function getRepo(): Repository {
  return env.STORAGE === 'db' ? drizzleRepo : jsonRepo;
}

export * from './types';
