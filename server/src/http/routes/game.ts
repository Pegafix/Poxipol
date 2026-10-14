import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PROCESSES } from '../../domain/crafting.js';
import { idempotencyKey, ifMatchVersion, ok, parse, Slug, Uuid } from '../kit.js';
import type { App } from '../../app.js';

const Rename = z.object({ name: z.string().trim().min(1).max(24) }).strict();
const Feed = z.object({ itemId: Slug }).strict();
const Equip = z.object({ itemId: Slug.nullable() }).strict();
const SlotParam = z.object({ slot: z.enum(['head', 'face', 'neck', 'joya', 'base', 'aura']) });
const Interact = z.object({ tone: z.enum(['warm', 'ok', 'cold']) }).strict();
const Tz = z.object({ timezone: z.string().min(1).max(64) }).strict();
const Tree = z.object({ root: Slug.optional(), depth: z.coerce.number().int().min(1).max(6).default(3) });
const Craft = z.object({ ingredients: z.array(Slug).min(1).max(3), process: z.enum(PROCESSES) }).strict();
const Since = z.object({ since: z.coerce.number().int().min(0) });

export async function gameRoutes(app: FastifyInstance, { s }: { s: App['services'] }) {
  // ── Estado y sincronización ──
  app.get('/v1/me/state', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    const data = await s.sync.bootstrap(req.auth.userId);
    return ok(reply, data, { rev: data.rev });
  });
  app.get('/v1/sync', async (req, reply) => {
    const { since } = parse(Since, req.query);
    const data = await s.sync.since(req.auth.userId, since);
    return ok(reply, data, { rev: data.rev });
  });
  app.put('/v1/me/timezone', async (req, reply) => ok(reply, await s.pet.setTimezone(req.auth.userId, parse(Tz, req.body).timezone)));

  // ── Compañero ──
  app.get('/v1/pet', async (req, reply) => {
    const snap = await s.pet.snapshot(req.auth.userId);
    reply.header('Cache-Control', 'no-store').header('ETag', `"v${snap.version}-r${snap.rev}"`);
    return ok(reply, snap, { rev: snap.rev });
  });
  app.patch('/v1/pet', async (req, reply) => ok(reply, await s.pet.rename(req.auth.userId, parse(Rename, req.body).name, ifMatchVersion(req))));
  app.post('/v1/pet/poke', async (req, reply) => ok(reply, await s.pet.poke(req.auth.userId)));
  app.post('/v1/pet/feed', async (req, reply) => ok(reply, await s.pet.feed(req.auth.userId, parse(Feed, req.body).itemId, idempotencyKey(req))));
  app.post('/v1/pet/interactions', async (req, reply) => ok(reply, await s.pet.interact(req.auth.userId, parse(Interact, req.body).tone)));
  app.put('/v1/pet/equipment/:slot', async (req, reply) => {
    const { slot } = parse(SlotParam, req.params);
    return ok(reply, await s.pet.equip(req.auth.userId, slot, parse(Equip, req.body).itemId));
  });

  // ── Árbol de habilidades ──
  app.get('/v1/skills/tree', async (req, reply) => {
    const q = parse(Tree, req.query);
    reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
    return ok(reply, { nodes: await s.skills.tree(req.auth.userId, q.root, q.depth) });
  });
  app.post('/v1/skills/:slug/unlock', async (req, reply) => {
    const { slug } = parse(z.object({ slug: Slug }), req.params);
    const r = await s.skills.unlock(req.auth.userId, slug, idempotencyKey(req));
    return ok(reply, r.body, { status: r.status, replayed: r.replayed });
  });

  // ── Taller ──
  app.post('/v1/craft', async (req, reply) => {
    const b = parse(Craft, req.body);
    const r = await s.craft.craft(req.auth.userId, b.ingredients, b.process, idempotencyKey(req));
    return ok(reply, r.body, { status: r.status, replayed: r.replayed });
  });
  app.get('/v1/discoveries', async (req, reply) => ok(reply, await s.craft.discoveries(req.auth.userId)));

  // ── Misiones desde PDF ──
  app.post('/v1/imports', { bodyLimit: 15 * 1024 * 1024 }, async (req, reply) => {
    if (!Buffer.isBuffer(req.body)) return reply.status(415).send({ error: { code: 'UNSUPPORTED_MEDIA', message: 'Envía el PDF con Content-Type: application/pdf.', requestId: req.id } });
    const r = await s.roadmaps.enqueueImport(req.auth.userId, req.body);
    reply.header('Location', `/v1/imports/${r.import.id}`);
    return ok(reply, r.import, { status: r.created ? 202 : 200 });
  });
  app.get('/v1/imports/:id', async (req, reply) => ok(reply, await s.roadmaps.getImport(req.auth.userId, parse(z.object({ id: Uuid }), req.params).id)));
  app.get('/v1/roadmaps', async (req, reply) => ok(reply, { roadmaps: await s.roadmaps.list(req.auth.userId) }));
  app.get('/v1/roadmaps/:id', async (req, reply) => ok(reply, await s.roadmaps.get(req.auth.userId, parse(z.object({ id: Uuid }), req.params).id)));
  // PUT/DELETE sobre "completion": idempotentes por naturaleza (marcar dos veces = una vez).
  app.put('/v1/tasks/:id/completion', async (req, reply) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const r = await s.roadmaps.completeTask(req.auth.userId, id, idempotencyKey(req));
    return ok(reply, r.body, { replayed: r.replayed });
  });
  app.delete('/v1/tasks/:id/completion', async (req, reply) => ok(reply, await s.roadmaps.uncompleteTask(req.auth.userId, parse(z.object({ id: Uuid }), req.params).id)));
}
