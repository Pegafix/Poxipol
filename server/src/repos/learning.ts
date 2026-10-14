import type { Queryable } from '../infra/db.js';
import type { Proficiency } from '../domain/learning.js';
import type { EmotionState } from '../domain/emotion.js';

const toProf = (r: any): Proficiency & { practiceDays: number } => ({
  level: r.level, progress: r.progress, consolidatedLevel: r.consolidated_level, stabilityDays: r.stability_days,
  lastPracticedAt: r.last_practiced_at, gainedDay: r.gained_day, gainedToday: r.gained_today, repsToday: r.reps_today, reps: r.reps, practiceDays: r.practice_days
});
const COLS = `level, progress, consolidated_level, stability_days, last_practiced_at, gained_day::text as gained_day, gained_today, reps_today, reps, practice_days`;

export async function getSkillProgress(q: Queryable, userId: string, skillId: number, forUpdate = false) {
  const { rows } = await q.query(`select ${COLS} from user_skill_progress where user_id = $1 and skill_id = $2 ${forUpdate ? 'for update' : ''}`, [userId, skillId]);
  return rows[0] ? toProf(rows[0]) : null;
}
export async function listSkillProgress(q: Queryable, userId: string) {
  const { rows } = await q.query(
    `select n.slug, n.title, n.attr_weights, ${COLS.replace(/(^|, )(?=level|progress|consolidated|stability|last|gained|reps|practice)/g, '$1p.')}
       from user_skill_progress p join skill_nodes n on n.id = p.skill_id where p.user_id = $1 order by n.path`, [userId]);
  return rows.map(r => ({ slug: r.slug as string, title: r.title as string, prof: toProf(r) }));
}
export async function getAttributes(q: Queryable, userId: string, forUpdate = false) {
  const { rows } = await q.query(`select attr, ${COLS} from user_attributes where user_id = $1 order by attr ${forUpdate ? 'for update' : ''}`, [userId]);
  return new Map(rows.map(r => [r.attr as string, toProf(r)]));
}

async function upsert(c: Queryable, table: 'user_skill_progress' | 'user_attributes', keyCol: string, userId: string, key: string | number, p: Proficiency & { practiceDays: number }) {
  await c.query(
    `insert into ${table} (user_id, ${keyCol}, level, progress, consolidated_level, stability_days, last_practiced_at, gained_day, gained_today, reps_today, reps, practice_days)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (user_id, ${keyCol}) do update set level = excluded.level, progress = excluded.progress, consolidated_level = excluded.consolidated_level,
       stability_days = excluded.stability_days, last_practiced_at = excluded.last_practiced_at, gained_day = excluded.gained_day,
       gained_today = excluded.gained_today, reps_today = excluded.reps_today, reps = excluded.reps, practice_days = excluded.practice_days`,
    [userId, key, p.level, p.progress, p.consolidatedLevel, p.stabilityDays, p.lastPracticedAt, p.gainedDay, p.gainedToday, p.repsToday, p.reps, p.practiceDays]);
}
export const saveSkillProgress = (c: Queryable, userId: string, skillId: number, p: Proficiency & { practiceDays: number }) => upsert(c, 'user_skill_progress', 'skill_id', userId, skillId, p);
export const saveAttribute = (c: Queryable, userId: string, attr: string, p: Proficiency & { practiceDays: number }) => upsert(c, 'user_attributes', 'attr', userId, attr, p);

export async function lockEmotion(c: Queryable, userId: string, now: Date) {
  await c.query('insert into learner_emotion (user_id, updated_at) values ($1, $2) on conflict do nothing', [userId, now]);
  return getEmotion(c, userId, true);
}
export async function getEmotion(q: Queryable, userId: string, forUpdate = false) {
  const { rows } = await q.query(`select *, rests_day::text as rests_day from learner_emotion where user_id = $1 ${forUpdate ? 'for update' : ''}`, [userId]);
  const r = rows[0];
  if (!r) return null;
  const state: EmotionState = { frustration: r.frustration, stamina: r.stamina, burnoutSince: r.burnout_since, abandons: r.abandons ?? [], lastFailAt: r.last_fail_at, updatedAt: r.updated_at };
  return { state, restsDay: r.rests_day as string | null, restsToday: r.rests_today as number };
}
export async function saveEmotion(c: Queryable, userId: string, s: EmotionState, rests?: { day: string; count: number }) {
  await c.query(
    `update learner_emotion set frustration = $2, stamina = $3, burnout_since = $4, abandons = $5, last_fail_at = $6, updated_at = $7,
       rests_day = coalesce($8::date, rests_day), rests_today = coalesce($9, rests_today) where user_id = $1`,
    [userId, Math.round(s.frustration * 10) / 10, Math.round(s.stamina * 10) / 10, s.burnoutSince, s.abandons, s.lastFailAt, s.updatedAt, rests?.day ?? null, rests?.count ?? null]);
}

export async function logPractice(c: Queryable, userId: string, skillId: number, e: { outcome: string; difficulty: number; durationMin: number; predictedDifficulty?: number; reflection?: string; points: number; efficiency: number; source: string; at: Date }) {
  await c.query(
    `insert into practice_log (user_id, skill_id, outcome, difficulty, duration_min, predicted_difficulty, reflection, points, efficiency, source, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [userId, skillId, e.outcome, e.difficulty, e.durationMin, e.predictedDifficulty ?? null, e.reflection ?? null, e.points, e.efficiency, e.source, e.at]);
}

export async function skillNodeForPractice(q: Queryable, userId: string, slug: string) {
  const { rows } = await q.query(
    `select n.id, n.kind, n.title, n.attr_weights, p.kind as parent_kind,
            exists (select 1 from user_skills u where u.user_id = $1 and u.skill_id = n.id) as unlocked
       from skill_nodes n left join skill_nodes p on p.id = n.parent_id where n.slug = $2`, [userId, slug]);
  const r = rows[0];
  if (!r) return null;
  // Las habilidades de primera fila de cada rama están abiertas desde el inicio.
  return { id: Number(r.id), kind: r.kind as string, title: r.title as string, weights: r.attr_weights as Record<string, number>, accessible: r.kind === 'skill' && (r.unlocked || r.parent_kind === 'branch' || r.parent_kind === null) };
}
