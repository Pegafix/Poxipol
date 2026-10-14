import type { Queryable } from '../infra/db.js';

export interface ImportRow { id: string; status: string; error: string | null; roadmap_id: string | null; created_at: Date; updated_at: Date }

export async function createImport(c: Queryable, userId: string, sha: string, bytes: Buffer): Promise<{ row: ImportRow; created: boolean }> {
  const ins = await c.query<ImportRow>(
    `insert into pdf_imports (user_id, file_sha256, file_bytes) values ($1,$2,$3) on conflict (user_id, file_sha256) do nothing
     returning id, status, error, roadmap_id, created_at, updated_at`, [userId, sha, bytes]);
  if (ins.rows[0]) return { row: ins.rows[0], created: true };
  const ex = await c.query<ImportRow>('select id, status, error, roadmap_id, created_at, updated_at from pdf_imports where user_id = $1 and file_sha256 = $2', [userId, sha]);
  return { row: ex.rows[0]!, created: false };
}
export const getImport = async (q: Queryable, userId: string, id: string) =>
  (await q.query<ImportRow>('select id, status, error, roadmap_id, created_at, updated_at from pdf_imports where id = $1 and user_id = $2', [id, userId])).rows[0] ?? null;

// Cola sobre Postgres: "for update skip locked" deja que varios workers tomen trabajos distintos sin pisarse.
export async function claimNextImport(c: Queryable) {
  const { rows } = await c.query<{ id: string; user_id: string; file_bytes: Buffer }>(
    `update pdf_imports set status = 'parsing', attempts = attempts + 1, updated_at = now()
      where id = (select id from pdf_imports where status = 'queued' order by created_at for update skip locked limit 1)
      returning id, user_id, file_bytes`);
  return rows[0] ?? null;
}
export async function finishImport(c: Queryable, id: string, roadmapId: string) {
  await c.query(`update pdf_imports set status = 'done', roadmap_id = $2, file_bytes = null, error = null, updated_at = now() where id = $1`, [id, roadmapId]);
}
export async function failImport(c: Queryable, id: string, error: string, retry: boolean) {
  await c.query(`update pdf_imports set status = case when $3 and attempts < 3 then 'queued' else 'failed' end, error = $2, updated_at = now() where id = $1`, [id, error.slice(0, 300), retry]);
}
