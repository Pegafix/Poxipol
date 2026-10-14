import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idempotencyKey, ok, parse, Slug } from '../kit.js';
import type { App } from '../../app.js';

// Un intento de práctica. "reflection" es opcional y vale la pena: anotar qué pasó entrena la metacognición.
const Practice = z.object({
  skill: Slug,
  outcome: z.enum(['success', 'fail', 'abandon']),
  difficulty: z.number().int().min(1).max(10),
  durationMin: z.number().int().min(1).max(240),
  predictedDifficulty: z.number().int().min(1).max(10).optional(),
  reflection: z.string().trim().min(3).max(500).optional()
}).strict();
const Rest = z.object({ minutes: z.number().int().min(5).max(120) }).strict();

export async function learningRoutes(app: FastifyInstance, { s }: { s: App['services'] }) {
  app.get('/v1/character', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return ok(reply, await s.learning.character(req.auth.userId));
  });
  app.post('/v1/practice', async (req, reply) => {
    const b = parse(Practice, req.body);
    const r = await s.learning.practice(req.auth.userId, { ...b, reflected: !!b.reflection }, idempotencyKey(req));
    return ok(reply, r.body, { replayed: r.replayed });
  });
  app.post('/v1/rest', async (req, reply) => ok(reply, await s.learning.rest(req.auth.userId, parse(Rest, req.body).minutes)));
}
