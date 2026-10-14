import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { AppError, errors } from '../http/errors.js';
import { isValidTimeZone } from '../domain/time.js';
import { STARTER_KIT } from '../catalog/catalog.js';
import * as users from '../repos/users.js';
import { addItem } from '../repos/inventory.js';
import type { Deps } from './context.js';

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

// API sin estado: el token de acceso (JWT corto) trae usuario y dispositivo; ningún servidor guarda sesiones.
// El token de refresco es opaco, rota en cada uso y se guarda solo su hash.
export interface AuthClaims { userId: string; deviceId: string }

async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt, 64)).toString('base64')}`;
}
async function checkPassword(pw: string, stored: string) {
  const [, s, h] = stored.split('$');
  if (!s || !h) return false;
  const got = await scrypt(pw, Buffer.from(s, 'base64'), 64);
  const want = Buffer.from(h, 'base64');
  return got.length === want.length && timingSafeEqual(got, want);
}
const tokenHash = (t: string) => createHash('sha256').update(t).digest();

export function authService(deps: Deps) {
  const secret = new TextEncoder().encode(deps.config.JWT_SECRET);

  async function issue(userId: string, deviceId: string, c: Parameters<typeof users.insertRefreshToken>[0]) {
    const now = deps.now();
    const accessToken = await new SignJWT({ did: deviceId }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId)
      .setIssuedAt(Math.floor(now.getTime() / 1000)).setExpirationTime(Math.floor(now.getTime() / 1000) + deps.config.ACCESS_TOKEN_TTL_SECONDS).sign(secret);
    const refreshToken = randomBytes(32).toString('base64url');
    const exp = new Date(now.getTime() + deps.config.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    await users.insertRefreshToken(c, deviceId, userId, tokenHash(refreshToken), exp);
    return { accessToken, refreshToken, expiresIn: deps.config.ACCESS_TOKEN_TTL_SECONDS, deviceId };
  }

  return {
    async register(i: { email: string; password: string; displayName: string; timezone: string; platform: string; deviceLabel: string }) {
      if (!isValidTimeZone(i.timezone)) throw errors.validation([{ path: 'timezone', message: 'Zona horaria desconocida' }]);
      const pwHash = await hashPassword(i.password);
      try {
        return await deps.db.tx(async c => {
          const u = await users.insertUser(c, i.email, pwHash, i.displayName, i.timezone);
          for (const [item, qty] of Object.entries(STARTER_KIT)) await addItem(c, u.id, item, qty);
          const deviceId = await users.insertDevice(c, u.id, i.platform, i.deviceLabel);
          return { userId: u.id, ...(await issue(u.id, deviceId, c)) };
        });
      } catch (e) {
        if ((e as { code?: string }).code === '23505') throw errors.exists('Una cuenta con ese correo');
        throw e;
      }
    },

    async login(i: { email: string; password: string; platform: string; deviceLabel: string }) {
      const u = await users.findUserByEmail(deps.db.pool, i.email);
      // Mismo mensaje y mismo trabajo si el correo no existe: no se filtra quién tiene cuenta.
      const ok = u ? await checkPassword(i.password, u.password_hash) : (await hashPassword(i.password), false);
      if (!u || !ok) throw errors.unauthenticated('Correo o contraseña incorrectos.');
      return deps.db.tx(async c => {
        const deviceId = await users.insertDevice(c, u.id, i.platform, i.deviceLabel);
        return { userId: u.id, ...(await issue(u.id, deviceId, c)) };
      });
    },

    // Rotación con detección de reuso: si alguien presenta un token ya rotado, se revoca todo el dispositivo.
    async refresh(refreshToken: string) {
      // La revocación por reuso se CONFIRMA antes de responder 401 (si se lanzara dentro de la transacción, se desharía).
      const out = await deps.db.tx(async c => {
        const row = await users.findRefreshToken(c, tokenHash(refreshToken));
        if (!row) return { fail: 'invalid' as const };
        if (row.revoked_at) { await users.revokeDevice(c, row.device_id); return { fail: 'reused' as const }; }
        if (row.expires_at.getTime() < deps.now().getTime()) return { fail: 'expired' as const };
        await users.revokeRefreshToken(c, row.id);
        await users.touchDevice(c, row.device_id);
        return { ok: { userId: row.user_id, ...(await issue(row.user_id, row.device_id, c)) } };
      });
      if ('ok' in out) return out.ok;
      throw errors.unauthenticated({
        invalid: 'Token de refresco inválido.',
        reused: 'Token de refresco reutilizado: cerramos la sesión de ese dispositivo por seguridad.',
        expired: 'La sesión expiró. Inicia sesión de nuevo.'
      }[out.fail]);
    },

    async logout(deviceId: string) { await users.revokeDevice(deps.db.pool, deviceId); },

    async verify(token: string): Promise<AuthClaims> {
      try {
        const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'], currentDate: deps.now() });
        if (!payload.sub || typeof payload.did !== 'string') throw errors.unauthenticated();
        return { userId: payload.sub, deviceId: payload.did };
      } catch (e) {
        if (e instanceof joseErrors.JWTExpired) throw errors.tokenExpired();
        if (e instanceof AppError) throw e;
        throw errors.unauthenticated('Token de acceso inválido.');
      }
    }
  };
}
export type AuthService = ReturnType<typeof authService>;
