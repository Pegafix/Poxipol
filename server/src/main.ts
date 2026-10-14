import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { createDb } from './infra/db.js';
import { createMemoryCache, createRedisCache } from './infra/cache.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { startImportWorker } from './jobs/importWorker.js';
import { startMaintenance } from './jobs/maintenance.js';

const config = loadConfig();
await migrate(config.DATABASE_URL);
await seed(config.DATABASE_URL);
const db = createDb(config.DATABASE_URL, config.DB_STATEMENT_TIMEOUT_MS);
const cache = config.REDIS_URL ? createRedisCache(config.REDIS_URL) : createMemoryCache();
const { app, services } = await buildApp({ config, db, cache, logger: true });
const stopWorker = config.RUN_IMPORT_WORKER ? startImportWorker(services, m => app.log.warn(m)) : () => {};
const stopMaintenance = startMaintenance(db, m => app.log.warn(m));

await app.listen({ port: config.PORT, host: '0.0.0.0' });

// Apagado ordenado: deja de aceptar solicitudes, termina las que están en curso y cierra conexiones.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    stopWorker();
    stopMaintenance();
    await app.close();
    await db.close();
    await cache.close();
    process.exit(0);
  });
}
