import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ok, parse } from '../kit.js';
import type { App } from '../../app.js';

const Device = { platform: z.enum(['desktop', 'mobile', 'web']), deviceLabel: z.string().trim().max(60).default('') };
const Register = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10, 'Mínimo 10 caracteres').max(200),
  displayName: z.string().trim().min(1).max(40),
  timezone: z.string().min(1).max(64).default('UTC'),
  ...Device
}).strict();
const Login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200), ...Device }).strict();
const Refresh = z.object({ refreshToken: z.string().min(20).max(200) }).strict();

export async function authRoutes(app: FastifyInstance, { s }: { s: App['services'] }) {
  app.post('/v1/auth/register', { config: { public: true } }, async (req, reply) => ok(reply, await s.auth.register(parse(Register, req.body)), { status: 201 }));
  app.post('/v1/auth/login', { config: { public: true } }, async (req, reply) => ok(reply, await s.auth.login(parse(Login, req.body))));
  app.post('/v1/auth/refresh', { config: { public: true } }, async (req, reply) => ok(reply, await s.auth.refresh(parse(Refresh, req.body).refreshToken)));
  app.post('/v1/auth/logout', async (req, reply) => { await s.auth.logout(req.auth.deviceId); return reply.status(204).send(); });
}
