import pg from 'pg';

// Un "Queryable" es el pool o un cliente dentro de una transacción: los repositorios aceptan cualquiera.
export type Queryable = Pick<pg.Pool, 'query'> | pg.PoolClient;

export interface Db {
  pool: pg.Pool;
  tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createDb(url: string, statementTimeoutMs: number): Db {
  // statement_timeout: ninguna consulta puede colgar al cliente más de lo debido.
  const pool = new pg.Pool({ connectionString: url, max: 20, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 3_000, statement_timeout: statementTimeoutMs });
  pool.on('error', () => { /* conexión inactiva caída: el pool la reemplaza */ });
  return {
    pool,
    async tx(fn) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const out = await fn(c);
        await c.query('commit');
        return out;
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end()
  };
}
