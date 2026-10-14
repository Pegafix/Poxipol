import type { Queryable } from '../infra/db.js';
import type { DailyCounters, Effect, PetAnchors } from '../domain/pet.js';

export interface PetRow extends PetAnchors { name: string; version: number; skillPoints: number }

export async function getPet(q: Queryable, userId: string, forUpdate = false): Promise<PetRow | null> {
  const { rows } = await q.query(
    `select name, version, xp_total, skill_points, empathy, last_activity_at, streak_days, streak_day::text
     from pet_state where user_id = $1 ${forUpdate ? 'for update' : ''}`, [userId]);
  const r = rows[0];
  if (!r) return null;
  return { name: r.name, version: r.version, xpTotal: Number(r.xp_total), skillPoints: r.skill_points, empathy: r.empathy,
    lastActivityAt: r.last_activity_at, streakDays: r.streak_days, streakDay: r.streak_day };
}

// Edición directa con concurrencia optimista: solo aplica si la versión coincide.
export async function renamePet(c: Queryable, userId: string, name: string, expectedVersion: number): Promise<number | null> {
  const { rows } = await c.query<{ version: number }>(
    'update pet_state set name = $2, version = version + 1, updated_at = now() where user_id = $1 and version = $3 returning version',
    [userId, name, expectedVersion]);
  return rows[0]?.version ?? null;
}

export async function applyProgress(c: Queryable, userId: string, p: { xp: number; skillPoints: number; activityAt?: Date; streakDays?: number; streakDay?: string; empathyDelta?: number }) {
  await c.query(
    `update pet_state set xp_total = greatest(0, xp_total + $2), skill_points = skill_points + $3,
       last_activity_at = coalesce($4, last_activity_at), streak_days = coalesce($5, streak_days), streak_day = coalesce($6::date, streak_day),
       empathy = least(100, greatest(0, empathy + $7)), version = version + 1, updated_at = now()
     where user_id = $1`,
    [userId, p.xp, p.skillPoints, p.activityAt ?? null, p.streakDays ?? null, p.streakDay ?? null, p.empathyDelta ?? 0]);
}

function rowToDaily(r: Record<string, any> | undefined): DailyCounters | null {
  if (!r) return null;
  return { tasksDone: r.tasks_done, learnActions: r.learn_actions, effects: r.effects as Effect[] | null, cured: r.cured as Effect[],
    boostHp: r.boost_hp, boostMp: r.boost_mp, boostSta: r.boost_sta };
}
export async function getDaily(q: Queryable, userId: string, day: string) {
  const { rows } = await q.query('select * from pet_daily where user_id = $1 and day = $2', [userId, day]);
  return { counters: rowToDaily(rows[0]), wakes: (rows[0]?.wakes as number | undefined) ?? 0 };
}

// Suma a los contadores del día (crea la fila si no existe). Una sola sentencia, sin leer antes.
export async function bumpDaily(c: Queryable, userId: string, day: string, d: { tasks?: number; learn?: number; wakes?: number; hp?: number; mp?: number; sta?: number; cure?: string[] }) {
  const { rows } = await c.query(
    `insert into pet_daily (user_id, day, tasks_done, learn_actions, wakes, boost_hp, boost_mp, boost_sta, cured)
     values ($1, $2, greatest(0,$3), greatest(0,$4), $5, $6, $7, $8, $9)
     on conflict (user_id, day) do update set
       tasks_done = greatest(0, pet_daily.tasks_done + $3), learn_actions = greatest(0, pet_daily.learn_actions + $4),
       wakes = least(32000, pet_daily.wakes + $5),
       boost_hp = least(100, pet_daily.boost_hp + $6), boost_mp = least(100, pet_daily.boost_mp + $7), boost_sta = least(100, pet_daily.boost_sta + $8),
       cured = (select array(select distinct unnest(pet_daily.cured || $9::text[])))
     returning wakes`,
    [userId, day, d.tasks ?? 0, d.learn ?? 0, d.wakes ?? 0, d.hp ?? 0, d.mp ?? 0, d.sta ?? 0, d.cure ?? []]);
  return rows[0]!.wakes as number;
}

// El sorteo de efectos se guarda la primera vez que se calcula en el día: queda fijo y es del servidor.
export async function setEffectsIfMissing(c: Queryable, userId: string, day: string, effects: Effect[]) {
  await c.query(
    `insert into pet_daily (user_id, day, effects) values ($1, $2, $3)
     on conflict (user_id, day) do update set effects = coalesce(pet_daily.effects, excluded.effects)`, [userId, day, effects]);
}
