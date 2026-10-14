import { createHash } from 'node:crypto';
import type pg from 'pg';
import type { Config } from '../config.js';
import type { Cache } from '../infra/cache.js';
import type { Db } from '../infra/db.js';
import { AppError } from '../http/errors.js';
import { findIdempotent, saveIdempotent } from '../repos/idempotency.js';

// Dependencias que reciben los servicios. "now" es inyectable: las pruebas controlan el reloj del servidor.
export interface Deps { db: Db; cache: Cache; config: Config; now: () => Date }

export const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

// Ejecuta un comando de forma idempotente y atómica.
// Reintentar con la misma Idempotency-Key devuelve la misma respuesta sin repetir el efecto;
// reusar la llave con otro contenido es un error del cliente (422).
export async function runCommand<T>(deps: Deps, userId: string, idemKey: string | undefined, requestBody: unknown, fn: (c: pg.PoolClient) => Promise<{ status: number; body: T }>): Promise<{ status: number; body: T; replayed: boolean }> {
  const reqHash = sha256(JSON.stringify(requestBody ?? null));
  if (idemKey) {
    const prev = await findIdempotent(deps.db.pool, userId, idemKey);
    if (prev) return replay(prev, reqHash);
  }
  try {
    const out = await deps.db.tx(async c => {
      const res = await fn(c);
      if (idemKey) await saveIdempotent(c, userId, idemKey, reqHash, res.status, res.body);
      return res;
    });
    return { ...out, replayed: false };
  } catch (e) {
    // Dos solicitudes con la misma llave a la vez: la segunda choca con la clave primaria y devuelve la primera.
    if (idemKey && (e as { code?: string }).code === '23505' && String((e as { constraint?: string }).constraint).startsWith('idempotency_keys')) {
      const prev = await findIdempotent(deps.db.pool, userId, idemKey);
      if (prev) return replay(prev, reqHash);
    }
    throw e;
  }
}
function replay<T>(prev: { request_hash: string; status_code: number; response: unknown }, reqHash: string) {
  if (prev.request_hash !== reqHash) throw new AppError(422, 'IDEMPOTENCY_MISMATCH', 'Esa Idempotency-Key ya se usó con otro contenido.');
  return { status: prev.status_code, body: prev.response as T, replayed: true };
}
