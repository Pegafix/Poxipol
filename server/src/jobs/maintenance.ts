import type { Db } from '../infra/db.js';

// Mantenimiento periódico para que las tablas de soporte no crezcan sin límite.
// Si un dispositivo pide sincronizar desde una revisión ya podada, recibe 410 y recarga el estado completo.
export async function runMaintenance(db: Db, now = new Date()) {
  await db.pool.query(`delete from change_log where at < now() - interval '30 days'`);
  await db.pool.query(`delete from idempotency_keys where created_at < now() - interval '24 hours'`);
  // Partición del mes siguiente para craft_log (así casi nada cae en la partición por defecto).
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const after = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 1));
  const name = `craft_log_${next.getUTCFullYear()}_${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
  await db.pool.query(`create table if not exists ${name} partition of craft_log for values from ('${next.toISOString()}') to ('${after.toISOString()}')`);
}

export function startMaintenance(db: Db, log: (m: string) => void, everyMs = 3600_000) {
  const run = () => runMaintenance(db).catch(e => log(`mantenimiento: ${(e as Error).message}`));
  run();
  const t = setInterval(run, everyMs);
  return () => clearInterval(t);
}
