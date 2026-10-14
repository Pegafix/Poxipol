import type { Queryable } from '../infra/db.js';

export interface UserRow { id: string; email: string; password_hash: string; display_name: string; timezone: string; tz_changed_at: Date | null }

export async function insertUser(c: Queryable, email: string, passwordHash: string, displayName: string, timezone: string): Promise<UserRow> {
  const { rows } = await c.query<UserRow>(
    'insert into users (email, password_hash, display_name, timezone) values ($1,$2,$3,$4) returning *', [email, passwordHash, displayName, timezone]);
  const u = rows[0]!;
  await c.query('insert into pet_state (user_id) values ($1)', [u.id]);
  await c.query('insert into user_rev (user_id) values ($1)', [u.id]);
  return u;
}
export const findUserByEmail = async (q: Queryable, email: string) =>
  (await q.query<UserRow>('select * from users where lower(email) = lower($1)', [email])).rows[0] ?? null;
export const findUser = async (q: Queryable, id: string) =>
  (await q.query<UserRow>('select * from users where id = $1', [id])).rows[0] ?? null;
export async function setTimezone(c: Queryable, id: string, tz: string) {
  await c.query('update users set timezone = $2, tz_changed_at = now() where id = $1', [id, tz]);
}

export async function insertDevice(c: Queryable, userId: string, platform: string, label: string) {
  const { rows } = await c.query<{ id: string }>('insert into devices (user_id, platform, label) values ($1,$2,$3) returning id', [userId, platform, label]);
  return rows[0]!.id;
}
export async function insertRefreshToken(c: Queryable, deviceId: string, userId: string, hash: Buffer, expiresAt: Date) {
  await c.query('insert into refresh_tokens (device_id, user_id, token_hash, expires_at) values ($1,$2,$3,$4)', [deviceId, userId, hash, expiresAt]);
}
export async function findRefreshToken(c: Queryable, hash: Buffer) {
  const { rows } = await c.query<{ id: string; device_id: string; user_id: string; expires_at: Date; revoked_at: Date | null }>(
    'select id, device_id, user_id, expires_at, revoked_at from refresh_tokens where token_hash = $1 for update', [hash]);
  return rows[0] ?? null;
}
export async function revokeRefreshToken(c: Queryable, id: string) {
  await c.query('update refresh_tokens set revoked_at = now() where id = $1 and revoked_at is null', [id]);
}
export async function revokeDevice(c: Queryable, deviceId: string) {
  await c.query('update refresh_tokens set revoked_at = now() where device_id = $1 and revoked_at is null', [deviceId]);
}
export async function touchDevice(c: Queryable, deviceId: string) {
  await c.query('update devices set last_seen_at = now() where id = $1', [deviceId]);
}
