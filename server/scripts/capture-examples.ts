// Genera docs/examples/*.json con respuestas REALES de la API (base temporal). Uso: npx tsx scripts/capture-examples.ts
import pg from 'pg';
import { writeFile } from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { createDb } from '../src/infra/db.js';
import { createMemoryCache } from '../src/infra/cache.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { loadConfig } from '../src/config.js';
const ADMIN = process.env.TEST_PG_ADMIN ?? 'postgres://postgres@127.0.0.1:5433/postgres', url = ADMIN.replace(/\/[^/]*$/, '/mochi_capture');
const a = new pg.Client({ connectionString: ADMIN }); await a.connect(); await a.query('drop database if exists mochi_capture with (force)'); await a.query('create database mochi_capture'); await a.end();
await migrate(url); await seed(url);
let clock = new Date('2026-10-14T13:00:00Z');
const db = createDb(url, 4000);
const { app } = await buildApp({ config: loadConfig({ DATABASE_URL: url, JWT_SECRET: 'x'.repeat(40) } as any), db, cache: createMemoryCache(), now: () => clock });
const call = async (m: string, u: string, t?: string, body?: unknown) => (await app.inject({ method: m as any, url: u, headers: t ? { authorization: `Bearer ${t}` } : {}, payload: body as any })).json();
const t = (await call('POST', '/v1/auth/register', undefined, { email: 'demo@example.com', password: 'clave-demo-larga', displayName: 'Demo', timezone: 'America/Santiago', platform: 'mobile' })).data.accessToken;
const out = new URL('../docs/examples/', import.meta.url).pathname;
// 3 días de práctica espaciada de lógica
// Los tokens duran 15 minutos: al pasar los días hay que volver a entrar (como haría el cliente con /refresh).
const login = async () => (await call('POST', '/v1/auth/login', undefined, { email: 'demo@example.com', password: 'clave-demo-larga', platform: 'mobile' })).data.accessToken;
for (let d = 0; d < 3; d++) {
  const tk = d === 0 ? t : await login();
  for (let i = 0; i < 3; i++) {
    const r = await call('POST', '/v1/practice', tk, { skill: 'logica', outcome: 'success', difficulty: 2 + d, durationMin: 25 });
    if (!r.data) throw new Error('práctica rechazada: ' + JSON.stringify(r));
  }
  clock = new Date(clock.getTime() + 86_400_000);
}
const tt = (await call('POST', '/v1/auth/login', undefined, { email: 'demo@example.com', password: 'clave-demo-larga', platform: 'mobile' })).data.accessToken;
await writeFile(out + 'practice-success.json', JSON.stringify(await call('POST', '/v1/practice', tt, { skill: 'logica', outcome: 'success', difficulty: 3, durationMin: 30, predictedDifficulty: 4 }), null, 2));
await call('POST', '/v1/practice', tt, { skill: 'quimica_basica', outcome: 'fail', difficulty: 7, durationMin: 20 });
await writeFile(out + 'practice-abandon.json', JSON.stringify(await call('POST', '/v1/practice', tt, { skill: 'quimica_basica', outcome: 'abandon', difficulty: 8, durationMin: 15 }), null, 2));
await writeFile(out + 'character.json', JSON.stringify(await call('GET', '/v1/character', tt), null, 2));
await app.close(); await db.close();
const b = new pg.Client({ connectionString: ADMIN }); await b.connect(); await b.query('drop database mochi_capture with (force)'); await b.end();
console.log('ok');
