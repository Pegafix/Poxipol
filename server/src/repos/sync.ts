import type { Queryable } from '../infra/db.js';

export type Entity = 'pet' | 'task' | 'phase' | 'inventory' | 'skill' | 'discovery' | 'roadmap' | 'equipment';
export interface Change { entity: Entity; id: string; op: 'upsert' | 'delete' }

// Sube la revisión del usuario y registra qué cambió, en la MISMA transacción que la mutación.
// "update ... returning" serializa a los escritores del mismo usuario sin bloquear a los demás.
export async function bumpRev(c: Queryable, userId: string, changes: Change[]): Promise<number> {
  const n = Math.max(1, changes.length);
  const { rows } = await c.query<{ rev: string }>('update user_rev set rev = rev + $2 where user_id = $1 returning rev', [userId, n]);
  const rev = Number(rows[0]!.rev);
  if (changes.length) {
    const vals: unknown[] = [userId];
    const tuples = changes.map((ch, i) => {
      vals.push(rev - n + 1 + i, ch.entity, ch.id, ch.op);
      const b = vals.length - 3;
      return `($1, $${b}, $${b + 1}, $${b + 2}, $${b + 3})`;
    });
    await c.query(`insert into change_log (user_id, rev, entity, entity_id, op) values ${tuples.join(',')}`, vals);
  }
  return rev;
}

export async function currentRev(q: Queryable, userId: string): Promise<number> {
  const { rows } = await q.query<{ rev: string }>('select rev from user_rev where user_id = $1', [userId]);
  return rows[0] ? Number(rows[0].rev) : 0;
}

export async function changesSince(q: Queryable, userId: string, since: number, limit: number) {
  const { rows } = await q.query<{ rev: string; entity: Entity; entity_id: string; op: 'upsert' | 'delete' }>(
    'select rev, entity, entity_id, op from change_log where user_id = $1 and rev > $2 order by rev limit $3', [userId, since, limit]);
  return rows.map(r => ({ rev: Number(r.rev), entity: r.entity, id: r.entity_id, op: r.op }));
}

export async function oldestRev(q: Queryable, userId: string): Promise<number | null> {
  const { rows } = await q.query<{ rev: string | null }>('select min(rev) as rev from change_log where user_id = $1', [userId]);
  return rows[0]?.rev == null ? null : Number(rows[0].rev);
}
