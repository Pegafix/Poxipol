// Pruebas de integración contra PostgreSQL y Redis reales.
// Variables: TEST_PG_ADMIN (conexión a la base "postgres") y TEST_REDIS. Cada corrida crea su propia base.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pg from 'pg';
import { buildApp, type App } from '../src/app.js';
import { createDb, type Db } from '../src/infra/db.js';
import { createRedisCache, type Cache } from '../src/infra/cache.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { loadConfig } from '../src/config.js';
import { runMaintenance } from '../src/jobs/maintenance.js';

const ADMIN = process.env.TEST_PG_ADMIN ?? 'postgres://postgres@127.0.0.1:5433/postgres';
const REDIS = process.env.TEST_REDIS ?? 'redis://127.0.0.1:6380';
const PDF = process.env.TEST_PDF ?? '';
const dbName = `mochi_test_${Date.now().toString(36)}`;
const url = ADMIN.replace(/\/[^/]*$/, `/${dbName}`);

// Reloj del servidor controlado por la prueba (zona del usuario: UTC).
let clock = new Date('2026-10-14T10:00:00Z');
let ctx: App, db: Db, cache: Cache;

async function call(method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: Buffer; type?: string } = {}) {
  const res = await ctx.app.inject({
    method: method as 'GET', url: path,
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...(opts.type ? { 'content-type': opts.type } : {}), ...(opts.headers ?? {}) },
    payload: opts.raw ?? (opts.body === undefined ? undefined : (opts.body as object))
  });
  return { status: res.statusCode, body: res.body ? res.json() : null, headers: res.headers };
}

before(async () => {
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect(); await admin.query(`create database ${dbName}`); await admin.end();
  await migrate(url); await seed(url);
  db = createDb(url, 4000);
  cache = createRedisCache(REDIS);
  const config = loadConfig({ DATABASE_URL: url, REDIS_URL: REDIS, JWT_SECRET: 'x'.repeat(40), ACCESS_TOKEN_TTL_SECONDS: '900' } as NodeJS.ProcessEnv);
  ctx = await buildApp({ config, db, cache, now: () => clock });
});
after(async () => {
  await ctx.app.close(); await db.close(); await cache.close();
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect(); await admin.query(`drop database if exists ${dbName} with (force)`); await admin.end();
});

let desktop: string, mobile: string, refresh: string;
// Al mover el reloj del servidor, los tokens de 15 minutos vencen (como debe ser): se vuelve a entrar.
async function travel(to: string) {
  clock = new Date(to);
  const login = async (platform: string) => (await call('POST', '/v1/auth/login', { body: { email: 'ana@example.com', password: 'una-clave-larga', platform } })).body.data.accessToken;
  desktop = await login('desktop'); mobile = await login('mobile');
}

test('registro en escritorio y login en móvil: mismo usuario, dos dispositivos, sin sesión en el servidor', async () => {
  const r = await call('POST', '/v1/auth/register', { body: { email: 'ana@example.com', password: 'una-clave-larga', displayName: 'Ana', timezone: 'UTC', platform: 'desktop' } });
  assert.equal(r.status, 201);
  desktop = r.body.data.accessToken; refresh = r.body.data.refreshToken;
  const l = await call('POST', '/v1/auth/login', { body: { email: 'ANA@example.com', password: 'una-clave-larga', platform: 'mobile' } });
  assert.equal(l.status, 200);
  mobile = l.body.data.accessToken;
  const a = await call('GET', '/v1/me/state', { token: desktop });
  const b = await call('GET', '/v1/me/state', { token: mobile });
  assert.equal(a.status, 200);
  assert.deepEqual(a.body.data.inventory, b.body.data.inventory);
  assert.equal(a.body.data.pet.name, 'Mochi');
});

test('errores con forma única y códigos HTTP significativos', async () => {
  const noAuth = await call('GET', '/v1/pet');
  assert.equal(noAuth.status, 401); assert.equal(noAuth.body.error.code, 'UNAUTHENTICATED'); assert.ok(noAuth.body.error.requestId);
  const bad = await call('POST', '/v1/craft', { token: desktop, body: { ingredients: [], process: 'licuar' } });
  assert.equal(bad.status, 400); assert.equal(bad.body.error.code, 'VALIDATION_FAILED'); assert.ok(Array.isArray(bad.body.error.details));
  const nf = await call('GET', '/v1/nada', { token: desktop });
  assert.equal(nf.status, 404);
  const dup = await call('POST', '/v1/auth/register', { body: { email: 'ana@example.com', password: 'una-clave-larga', displayName: 'Ana', platform: 'web' } });
  assert.equal(dup.status, 409); assert.equal(dup.body.error.code, 'ALREADY_EXISTS');
});

test('el token de refresco rota y reusarlo cierra ese dispositivo', async () => {
  const r1 = await call('POST', '/v1/auth/refresh', { body: { refreshToken: refresh } });
  assert.equal(r1.status, 200);
  const reuse = await call('POST', '/v1/auth/refresh', { body: { refreshToken: refresh } });
  assert.equal(reuse.status, 401);
  const r2 = await call('POST', '/v1/auth/refresh', { body: { refreshToken: r1.body.data.refreshToken } });
  assert.equal(r2.status, 401, 'la familia del dispositivo quedó revocada');
  desktop = (await call('POST', '/v1/auth/login', { body: { email: 'ana@example.com', password: 'una-clave-larga', platform: 'desktop' } })).body.data.accessToken;
});

test('concurrencia optimista: editar con una versión vieja da 409 con el estado actual', async () => {
  const p = await call('GET', '/v1/pet', { token: desktop });
  const v = p.body.data.version;
  const a = await call('PATCH', '/v1/pet', { token: desktop, body: { name: 'Bolita' }, headers: { 'if-match': `"v${v}"` } });
  assert.equal(a.status, 200);
  const b = await call('PATCH', '/v1/pet', { token: mobile, body: { name: 'Pompón' }, headers: { 'if-match': `"v${v}"` } });
  assert.equal(b.status, 409); assert.equal(b.body.error.code, 'VERSION_CONFLICT'); assert.equal(b.body.error.details.current.name, 'Bolita');
});

let roadmapId = '', taskIds: string[] = [];
test('PDF: se encola (202), el worker lo procesa y la misión aparece en los dos dispositivos', { skip: !PDF || !existsSync(PDF) }, async () => {
  const bytes = await readFile(PDF);
  const up = await call('POST', '/v1/imports', { token: mobile, raw: bytes, type: 'application/pdf' });
  assert.equal(up.status, 202); assert.ok(up.headers.location);
  const again = await call('POST', '/v1/imports', { token: desktop, raw: bytes, type: 'application/pdf' });
  assert.equal(again.status, 200, 'el mismo archivo no se procesa dos veces');
  assert.equal(await ctx.services.roadmaps.processNextImport(), true);
  const st = await call('GET', `/v1/imports/${up.body.data.id}`, { token: desktop });
  assert.equal(st.body.data.status, 'done');
  roadmapId = st.body.data.roadmap_id;
  const rm = await call('GET', `/v1/roadmaps/${roadmapId}`, { token: desktop });
  assert.equal(rm.body.data.phases.length, 13);
  taskIds = rm.body.data.phases.flatMap((p: { tasks: { id: string }[] }) => p.tasks.map(t => t.id));
  assert.equal(taskIds.length, 77);
});

test('completar tareas: idempotente al reintentar y sin pérdidas cuando dos dispositivos escriben a la vez', { skip: !taskIds.length && (!PDF || !existsSync(PDF)) }, async () => {
  const key = { 'idempotency-key': 'tarea-uno-intento-1' };
  const first = await call('PUT', `/v1/tasks/${taskIds[0]}/completion`, { token: mobile, headers: key });
  const retry = await call('PUT', `/v1/tasks/${taskIds[0]}/completion`, { token: mobile, headers: key });
  assert.equal(first.status, 200);
  assert.equal(retry.headers['idempotent-replayed'], 'true');
  assert.equal(retry.body.data.xp, first.body.data.xp);
  assert.ok(first.body.data.reward, 'cada tarea entrega un material real');
  // escritorio y móvil completan tareas distintas al mismo tiempo
  const results = await Promise.all(taskIds.slice(1, 7).map((id, i) => call('PUT', `/v1/tasks/${id}/completion`, { token: i % 2 ? mobile : desktop })));
  assert.ok(results.every(r => r.status === 200));
  const pet = await call('GET', '/v1/pet', { token: desktop });
  const total = first.body.data.xp + results.reduce((s, r) => s + r.body.data.xp, 0);
  assert.equal(pet.body.data.level.level >= 1, true);
  const st = await call('GET', '/v1/me/state', { token: mobile });
  assert.equal(st.body.data.roadmaps[0].done, 7, 'las 7 tareas quedaron registradas');
  assert.equal(pet.body.data.vitals.sta, 100, '7 tareas hoy llenan la estamina');
  assert.ok(total > 0);
});

test('sincronización incremental: el otro dispositivo pide solo lo que cambió', async () => {
  const s0 = await call('GET', '/v1/me/state', { token: mobile });
  const rev = s0.body.meta.rev;
  await call('PUT', '/v1/me/timezone', { token: desktop, body: { timezone: 'America/Santiago' } });
  const d = await call('GET', `/v1/sync?since=${rev}`, { token: mobile });
  assert.equal(d.status, 200);
  assert.ok(d.body.data.rev > rev);
  assert.ok(d.body.data.changes.some((c: { entity: string }) => c.entity === 'pet'));
  assert.ok(d.body.data.data.pet, 'trae la instantánea del compañero ya calculada');
  const none = await call('GET', `/v1/sync?since=${d.body.data.rev}`, { token: mobile });
  assert.deepEqual(none.body.data.changes, []);
  const future = await call('GET', `/v1/sync?since=${d.body.data.rev + 100}`, { token: mobile });
  assert.equal(future.status, 400);
  const tz = await call('PUT', '/v1/me/timezone', { token: desktop, body: { timezone: 'Asia/Tokyo' } });
  assert.equal(tz.status, 422); assert.equal(tz.body.error.code, 'TIMEZONE_COOLDOWN'); assert.ok(tz.headers['retry-after']);
});

test('el servidor decide si duerme: despertarlo de noche cuenta y al otro día se nota', async () => {
  const old = mobile;
  clock = new Date('2026-10-15T05:00:00Z');
  const expired = await call('GET', '/v1/pet', { token: old });
  assert.equal(expired.status, 401); assert.equal(expired.body.error.code, 'TOKEN_EXPIRED');
  await travel('2026-10-15T05:00:00Z');   // 02:00 en Santiago
  const night = await call('GET', '/v1/pet', { token: mobile });
  assert.equal(night.body.data.sleeping, true);
  let last;
  const talk = await call('POST', '/v1/pet/interactions', { token: mobile, body: { tone: 'warm' } });
  assert.equal(talk.status, 422); assert.equal(talk.body.error.code, 'PET_ASLEEP');
  for (let i = 0; i < 6; i++) last = await call('POST', '/v1/pet/poke', { token: mobile });
  assert.equal(last!.body.data.reaction, 'angry');
  assert.equal(last!.body.data.wakesTonight, 6);
  await travel('2026-10-15T13:30:00Z');   // 10:30 en Santiago
  const morning = await call('GET', '/v1/pet', { token: desktop });
  assert.equal(morning.body.data.sleeping, false);
  assert.equal(morning.body.data.effects[0].id, 'agotado');
  assert.equal(morning.body.data.mood, 'apathetic');
  const again = await call('GET', '/v1/pet', { token: mobile });
  assert.deepEqual(again.body.data.effects, morning.body.data.effects, 'el sorteo queda fijo para todos los dispositivos');
});

test('paciencia de día: tierno, límite y pausa (422 con Retry-After)', async () => {
  const reactions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const r = await call('POST', '/v1/pet/poke', { token: desktop });
    if (r.status === 422) { assert.equal(r.body.error.code, 'PET_ON_PAUSE'); assert.ok(r.headers['retry-after']); reactions.push('blocked'); break; }
    reactions.push(r.body.data.reaction);
  }
  assert.equal(reactions[0], 'cute');
  assert.ok(reactions.includes('pause'), `reacciones: ${reactions.join(',')}`);
  assert.equal(reactions.at(-1), 'blocked');
});

test('árbol de habilidades: rama en una consulta; se desbloquea por dominio practicado, no por nivel general', async () => {
  const t = await call('GET', '/v1/skills/tree?root=ciencias&depth=3', { token: desktop });
  assert.equal(t.status, 200);
  const slugs = t.body.data.nodes.map((n: { slug: string }) => n.slug);
  assert.deepEqual(slugs, ['ciencias', 'quimica_basica', 'metalurgia', 'orfebreria', 'vidrieria']);
  const locked = await call('POST', '/v1/skills/metalurgia/unlock', { token: desktop });
  assert.equal(locked.status, 422); assert.equal(locked.body.error.code, 'SKILL_LOCKED');
  assert.deepEqual(locked.body.error.details.missing, [{ skill: 'quimica_basica', needLevel: 3, level: 0 }]);
  // Las habilidades de primera fila están abiertas desde el inicio: se pueden practicar sin desbloquear.
  const p = await call('POST', '/v1/practice', { token: desktop, body: { skill: 'coccion', outcome: 'success', difficulty: 2, durationMin: 25 } });
  assert.equal(p.status, 200);
  const notYet = await call('POST', '/v1/skills/horneado/unlock', { token: desktop });
  assert.equal(notYet.status, 422, 'un intento no alcanza para abrir la siguiente');
  // Atajo de prueba: simular días de práctica de cocción hasta nivel 3.
  await db.pool.query("update user_skill_progress set level = 3 where skill_id = (select id from skill_nodes where slug = 'coccion')");
  assert.equal((await call('POST', '/v1/skills/horneado/unlock', { token: mobile })).status, 201);
  const again = await call('POST', '/v1/skills/horneado/unlock', { token: desktop });
  assert.equal(again.status, 200); assert.equal(again.body.data.alreadyUnlocked, true);
});

test('taller: recetas reales, habilidad por proceso y la API nunca revela recetas no descubiertas', async () => {
  const noSkill = await call('POST', '/v1/craft', { token: desktop, body: { ingredients: ['cobre', 'estano'], process: 'fundir' } });
  assert.equal(noSkill.status, 422); assert.equal(noSkill.body.error.code, 'SKILL_REQUIRED');
  const fail = await call('POST', '/v1/craft', { token: desktop, body: { ingredients: ['azucar', 'limon'], process: 'hornear' } });
  assert.equal(fail.status, 200); assert.equal(fail.body.data.success, false); assert.equal(fail.body.data.fact, undefined);
  const missing = await call('POST', '/v1/craft', { token: desktop, body: { ingredients: ['cacao', 'leche'], process: 'calentar' } });
  assert.equal(missing.status, 422); assert.equal(missing.body.error.code, 'INSUFFICIENT_MATERIALS');
  const disc0 = await call('GET', '/v1/discoveries', { token: mobile });
  assert.equal(disc0.body.data.discovered.length, 0);
  assert.equal(disc0.body.data.total, 33);
});

test('carrera: dos dispositivos gastan la última levadura a la vez y solo uno lo logra', async () => {
  const body = { ingredients: ['agua', 'harina', 'levadura'], process: 'hornear' };
  const [a, b] = await Promise.all([call('POST', '/v1/craft', { token: desktop, body }), call('POST', '/v1/craft', { token: mobile, body })]);
  const codes = [a.status, b.status].sort();
  assert.deepEqual(codes, [200, 422]);
  const winner = a.status === 200 ? a : b;
  assert.equal(winner.body.data.name, 'Pan'); assert.equal(winner.body.data.isNew, true); assert.match(winner.body.data.fact, /levadura/);
  const disc = await call('GET', '/v1/discoveries', { token: desktop });
  assert.deepEqual(disc.body.data.discovered.map((d: { key: string }) => d.key), ['agua+harina+levadura|hornear']);
  const fed = await call('POST', '/v1/pet/feed', { token: mobile, body: { itemId: 'pan' }, headers: { 'idempotency-key': 'comer-pan-0001' } });
  assert.equal(fed.status, 200);
  const replay = await call('POST', '/v1/pet/feed', { token: mobile, body: { itemId: 'pan' }, headers: { 'idempotency-key': 'comer-pan-0001' } });
  assert.equal(replay.status, 200, 'reintentar no come dos panes');
  const misuse = await call('POST', '/v1/pet/feed', { token: mobile, body: { itemId: 'te' }, headers: { 'idempotency-key': 'comer-pan-0001' } });
  assert.equal(misuse.status, 422); assert.equal(misuse.body.error.code, 'IDEMPOTENCY_MISMATCH');
});

test('mantenimiento: crea la partición del mes siguiente y es seguro repetirlo', async () => {
  await runMaintenance(db, new Date('2026-10-14T00:00:00Z'));
  await runMaintenance(db, new Date('2026-10-14T00:00:00Z'));
  const { rows } = await db.pool.query("select 1 from pg_tables where tablename = 'craft_log_2026_11'");
  assert.equal(rows.length, 1);
});

test('práctica estilo Final Fantasy II: rinde menos repetir lo mismo el mismo día, y fallar también suma', async () => {
  const body = { skill: 'logica', outcome: 'success', difficulty: 2, durationMin: 25 };
  const repsBefore = ((await call('GET', '/v1/character', { token: desktop })).body.data.skills.find((s: { slug: string }) => s.slug === 'logica')?.reps) ?? 0;
  if (taskIds.length) assert.ok(repsBefore >= 1, 'completar una tarea de tipo CLAUDE ya practicó lógica');
  const gains: number[] = [];
  for (let i = 0; i < 5; i++) gains.push((await call('POST', '/v1/practice', { token: mobile, body })).body.data.gain.points);
  for (let i = 1; i < gains.length; i++) assert.ok(gains[i]! < gains[i - 1]!, `rendimientos decrecientes: ${gains.join(' > ')}`);
  const fail = await call('POST', '/v1/practice', { token: mobile, body: { ...body, outcome: 'fail', reflection: 'Me confundí con el orden de las condiciones' } });
  assert.ok(fail.body.data.gain.points > 0, 'el error trabajado deja aprendizaje');
  assert.ok(fail.body.data.attributes.metacognicion, 'reflexionar entrena la metacognición');
  const ch = await call('GET', '/v1/character', { token: desktop });
  const logica = ch.body.data.skills.find((s: { slug: string }) => s.slug === 'logica');
  assert.equal(logica.reps, repsBefore + 6);
  assert.ok(ch.body.data.attributes.cognitive.find((a: { id: string }) => a.id === 'logica').reps > 0, 'el atributo creció por usar la habilidad');
});

test('abandonar por frustración: Mochi valida, normaliza y propone una estrategia; tres abandonos llevan a agotamiento', async () => {
  const hard = { skill: 'quimica_basica', outcome: 'abandon', difficulty: 9, durationMin: 20 };
  const a1 = await call('POST', '/v1/practice', { token: desktop, body: hard });
  assert.equal(a1.status, 200);
  assert.ok(a1.body.data.mochi.strategy, `respuesta con estrategia: ${a1.body.data.mochi.key}`);
  assert.doesNotMatch(a1.body.data.mochi.text, /culpa|flojo|no sirves/i);
  await call('POST', '/v1/practice', { token: desktop, body: hard });
  const a3 = await call('POST', '/v1/practice', { token: desktop, body: hard });
  assert.equal(a3.body.data.emotion.burnout, true);
  assert.equal(a3.body.data.mochi.key, 'burnout');
  const tired = await call('POST', '/v1/practice', { token: desktop, body: { skill: 'logica', outcome: 'success', difficulty: 2, durationMin: 25 } });
  assert.equal(tired.body.data.emotion.efficiency, 0.25, 'agotado, la práctica técnica rinde un cuarto');
  const r = await call('POST', '/v1/rest', { token: desktop, body: { minutes: 30 } });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.emotion.stamina > tired.body.data.emotion.stamina, 'descansar devuelve energía');
});

test('curva del olvido: semanas sin practicar bajan un poco la barra, nunca los niveles consolidados', async () => {
  const before = (await call('GET', '/v1/character', { token: desktop })).body.data.skills.find((s: { slug: string }) => s.slug === 'logica');
  await travel(new Date(clock.getTime() + 21 * 86_400_000).toISOString());
  const ch = (await call('GET', '/v1/character', { token: desktop })).body.data;
  const after = ch.skills.find((s: { slug: string }) => s.slug === 'logica');
  assert.ok(after.level >= before.consolidatedLevel);
  assert.ok(after.consolidatedLevel >= before.level, 'la noche consolidó el nivel alcanzado');
  assert.ok(after.fading && after.fading.pointsLost > 0, 'se olvidó un poco');
  assert.equal(ch.mochi.key, 'forgetting');
  assert.equal(ch.emotion.burnout, false, 'con días de descanso salió del agotamiento');
});
