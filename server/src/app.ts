import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Config } from './config.js';
import type { Cache } from './infra/cache.js';
import type { Db } from './infra/db.js';
import { errors, registerErrorHandling } from './http/errors.js';
import { authRoutes } from './http/routes/auth.js';
import { gameRoutes } from './http/routes/game.js';
import { authService, type AuthClaims } from './services/auth.js';
import { petService } from './services/pet.js';
import { skillService } from './services/skills.js';
import { craftService } from './services/craft.js';
import { roadmapService } from './services/roadmaps.js';
import { syncService } from './services/sync.js';
import type { Deps } from './services/context.js';

declare module 'fastify' {
  interface FastifyRequest { auth: AuthClaims }
  interface FastifyContextConfig { public?: boolean }
}

export function buildServices(deps: Deps) {
  const pet = petService(deps);
  return {
    auth: authService(deps), pet, skills: skillService(deps, pet), craft: craftService(deps, pet),
    roadmaps: roadmapService(deps, pet), sync: syncService(deps, pet)
  };
}
export interface App { app: FastifyInstance; services: ReturnType<typeof buildServices> }

export async function buildApp(opts: { config: Config; db: Db; cache: Cache; now?: () => Date; logger?: boolean }): Promise<App> {
  const deps: Deps = { db: opts.db, cache: opts.cache, config: opts.config, now: opts.now ?? (() => new Date()) };
  const services = buildServices(deps);
  const app = Fastify({
    logger: opts.logger ?? false,
    genReqId: req => (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length <= 64 ? req.headers['x-request-id'] : randomUUID()),
    bodyLimit: 256 * 1024,
    connectionTimeout: 15_000,
    requestTimeout: 20_000           // ninguna solicitud queda colgada indefinidamente
  });
  app.addContentTypeParser('application/pdf', { parseAs: 'buffer', bodyLimit: 15 * 1024 * 1024 }, (_req, body, done) => done(null, body));
  registerErrorHandling(app);
  app.addHook('onSend', async (req, reply) => { reply.header('X-Request-Id', req.id); });

  // Autenticación sin estado en cada solicitud + límite de tasa por usuario (en Redis: vale entre instancias).
  app.decorateRequest('auth', null as unknown as AuthClaims);
  app.addHook('onRequest', async req => {
    if (req.routeOptions.config?.public || req.url === '/health') return;
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw errors.unauthenticated();
    req.auth = await services.auth.verify(h.slice(7));
    try {
      const { count, ttl } = await deps.cache.incrFixed(`rl:${req.auth.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
      if (count > 300) throw errors.rateLimited(ttl);
    } catch (e) { if ((e as { code?: string }).code === 'RATE_LIMITED') throw e; /* sin caché no se bloquea al usuario */ }
  });

  app.get('/health', { config: { public: true } }, async () => {
    await opts.db.pool.query('select 1');
    return { ok: true };
  });
  await app.register(authRoutes, { s: services });
  await app.register(gameRoutes, { s: services });
  return { app, services };
}
