import dns from 'node:dns';
import net from 'node:net';

/**
 * Node tries each of a host's addresses for only 250 ms ("Happy Eyeballs") before moving on.
 * On slow or IPv6-broken networks every attempt to Neon (us-east-2) can time out that way,
 * which surfaces as "NeonDbError: fetch failed". Trying IPv4 first with a longer per-address
 * timeout fixes it and costs nothing on fast networks.
 */
export function configureNetwork() {
  dns.setDefaultResultOrder('ipv4first');
  net.setDefaultAutoSelectFamilyAttemptTimeout(2500);
}

// Errors raised while opening the connection, i.e. before any bytes of the request were sent.
const CONNECT_ERRORS = new Set(['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'EACCES', 'EAI_AGAIN']);

function isConnectError(err: unknown): boolean {
  const cause = (err as { cause?: { code?: string; errors?: { code?: string }[] } })?.cause;
  if (!cause) return false;
  if (cause.errors?.length) return cause.errors.every((e) => CONNECT_ERRORS.has(e.code ?? ''));
  return CONNECT_ERRORS.has(cause.code ?? '');
}

/**
 * fetch() that retries when the connection could not be opened. Safe for writes too:
 * a connect failure means the request never reached the server, so it cannot run twice.
 */
export async function fetchWithConnectRetry(input: RequestInfo | URL, init?: RequestInit, attempts = 4): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (i >= attempts || !isConnectError(err)) throw err;
      await new Promise((r) => setTimeout(r, 250 * i));
    }
  }
}
