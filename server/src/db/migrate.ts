import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

// Migraciones numeradas, aplicadas una sola vez y dentro de una transacción cada una.
export async function migrate(databaseUrl: string): Promise<string[]> {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations');
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    await client.query('select pg_advisory_lock(727001)'); // dos instancias arrancando a la vez no migran dos veces
    const done = new Set((await client.query('select name from schema_migrations')).rows.map(r => r.name));
    for (const f of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await client.query('begin');
      try {
        await client.query(await readFile(path.join(dir, f), 'utf8'));
        await client.query('insert into schema_migrations (name) values ($1)', [f]);
        await client.query('commit');
        applied.push(f);
      } catch (e) { await client.query('rollback'); throw e; }
    }
  } finally {
    await client.query('select pg_advisory_unlock(727001)').catch(() => {});
    await client.end();
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate(process.env.DATABASE_URL!).then(a => console.log(a.length ? `Aplicadas: ${a.join(', ')}` : 'Sin migraciones pendientes'), e => { console.error(e); process.exit(1); });
}
