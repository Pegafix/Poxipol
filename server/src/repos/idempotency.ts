import type { Queryable } from '../infra/db.js';

export async function findIdempotent(q: Queryable, userId: string, key: string) {
  const { rows } = await q.query<{ request_hash: string; status_code: number; response: unknown }>(
    'select request_hash, status_code, response from idempotency_keys where user_id = $1 and key = $2', [userId, key]);
  return rows[0] ?? null;
}
// Se guarda dentro de la misma transacción del comando: o queda todo (efecto + respuesta) o nada.
export async function saveIdempotent(c: Queryable, userId: string, key: string, requestHash: string, status: number, response: unknown) {
  await c.query('insert into idempotency_keys (user_id, key, request_hash, status_code, response) values ($1,$2,$3,$4,$5)', [userId, key, requestHash, status, JSON.stringify(response)]);
}
