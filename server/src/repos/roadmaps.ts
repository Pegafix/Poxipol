import type { Queryable } from '../infra/db.js';

export interface ParsedRoadmap {
  key: string; title: string; subtitle: string;
  phases: { n: number; title: string; meta: string; hours: number; weeks: string; prompt: string; fields: { k: string; v: string }[]; tasks: { id: string; text: string; tag: string }[] }[];
}

// Guarda una guía leída del PDF. Si ya existía (misma content_key), actualiza sin perder el progreso:
// las tareas se identifican por task_key, derivado del texto.
export async function upsertRoadmap(c: Queryable, userId: string, rm: ParsedRoadmap, familyOf: (tag: string) => string): Promise<string> {
  const { rows } = await c.query<{ id: string }>(
    `insert into roadmaps (user_id, content_key, title, subtitle) values ($1,$2,$3,$4)
     on conflict (user_id, content_key) do update set title = excluded.title, subtitle = excluded.subtitle, updated_at = now()
     returning id`, [userId, rm.key, rm.title, rm.subtitle]);
  const roadmapId = rows[0]!.id;
  for (const ph of rm.phases) {
    const p = await c.query<{ id: string }>(
      `insert into roadmap_phases (roadmap_id, n, title, meta, hours_est, weeks, prompt, fields) values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (roadmap_id, n) do update set title = excluded.title, meta = excluded.meta, hours_est = excluded.hours_est,
         weeks = excluded.weeks, prompt = excluded.prompt, fields = excluded.fields
       returning id`, [roadmapId, ph.n, ph.title, ph.meta, ph.hours, ph.weeks, ph.prompt, JSON.stringify(ph.fields)]);
    const phaseId = p.rows[0]!.id;
    const keys = ph.tasks.map(t => t.id);
    await c.query('delete from roadmap_tasks where phase_id = $1 and not (task_key = any($2::text[]))', [phaseId, keys]);
    for (const [i, t] of ph.tasks.entries()) {
      await c.query(
        `insert into roadmap_tasks (phase_id, task_key, text, tag, family, position) values ($1,$2,$3,$4,$5,$6)
         on conflict (phase_id, task_key) do update set text = excluded.text, tag = excluded.tag, family = excluded.family, position = excluded.position`,
        [phaseId, t.id, t.text, t.tag, familyOf(t.tag), i]);
    }
  }
  return roadmapId;
}

export async function listRoadmaps(q: Queryable, userId: string) {
  const { rows } = await q.query(
    `select r.id, r.title, r.subtitle, r.updated_at,
            count(t.id)::int as tasks, count(utp.task_id)::int as done,
            count(distinct ph.id)::int as phases, count(distinct upp.phase_id) filter (where upp.done_at is not null)::int as phases_done
       from roadmaps r
       left join roadmap_phases ph on ph.roadmap_id = r.id
       left join roadmap_tasks t on t.phase_id = ph.id
       left join user_task_progress utp on utp.task_id = t.id and utp.user_id = r.user_id
       left join user_phase_progress upp on upp.phase_id = ph.id and upp.user_id = r.user_id
      where r.user_id = $1
      group by r.id order by r.updated_at desc`, [userId]);
  return rows.map(r => ({ id: r.id, title: r.title, subtitle: r.subtitle, tasks: r.tasks, done: r.done, phases: r.phases, phasesDone: r.phases_done, updatedAt: r.updated_at }));
}

// Una guía completa con el progreso del usuario: 2 consultas (fases y tareas), sin N+1.
export async function getRoadmap(q: Queryable, userId: string, roadmapId: string) {
  const r = await q.query('select id, title, subtitle from roadmaps where id = $1 and user_id = $2', [roadmapId, userId]);
  if (!r.rows[0]) return null;
  const phases = await q.query(
    `select ph.id, ph.n, ph.title, ph.meta, ph.hours_est, ph.weeks, ph.prompt, ph.fields,
            upp.started_at, upp.done_at, coalesce(upp.hours_logged, 0) as hours_logged
       from roadmap_phases ph left join user_phase_progress upp on upp.phase_id = ph.id and upp.user_id = $2
      where ph.roadmap_id = $1 order by ph.n`, [roadmapId, userId]);
  const tasks = await q.query(
    `select t.id, t.phase_id, t.text, t.tag, t.family, t.position, utp.done_at
       from roadmap_tasks t join roadmap_phases ph on ph.id = t.phase_id
       left join user_task_progress utp on utp.task_id = t.id and utp.user_id = $2
      where ph.roadmap_id = $1 order by ph.n, t.position`, [roadmapId, userId]);
  const byPhase = new Map<string, unknown[]>();
  for (const t of tasks.rows) {
    const list = byPhase.get(t.phase_id) ?? [];
    list.push({ id: t.id, text: t.text, tag: t.tag, family: t.family, done: !!t.done_at, doneAt: t.done_at });
    byPhase.set(t.phase_id, list);
  }
  return {
    ...r.rows[0],
    phases: phases.rows.map(p => ({ id: p.id, n: p.n, title: p.title, meta: p.meta, hours: p.hours_est, weeks: p.weeks, prompt: p.prompt, fields: p.fields,
      startedAt: p.started_at, doneAt: p.done_at, hoursLogged: p.hours_logged, tasks: byPhase.get(p.id) ?? [] }))
  };
}

// La tarea con su dueño y su fase, para validar propiedad dentro de la transacción.
export async function taskForUser(c: Queryable, userId: string, taskId: string) {
  const { rows } = await c.query<{ id: string; tag: string; family: string; phase_id: string; done_at: Date | null }>(
    `select t.id, t.tag, t.family, t.phase_id, utp.done_at
       from roadmap_tasks t join roadmap_phases ph on ph.id = t.phase_id join roadmaps r on r.id = ph.roadmap_id
       left join user_task_progress utp on utp.task_id = t.id and utp.user_id = $1
      where t.id = $2 and r.user_id = $1`, [userId, taskId]);
  return rows[0] ?? null;
}

export async function recentCompletions(q: Queryable, userId: string, since: Date): Promise<number> {
  const { rows } = await q.query('select count(*)::int as n from user_task_progress where user_id = $1 and done_at > $2', [userId, since]);
  return rows[0].n;
}
export async function markTaskDone(c: Queryable, userId: string, taskId: string, xp: number): Promise<boolean> {
  const { rowCount } = await c.query('insert into user_task_progress (user_id, task_id, xp_awarded) values ($1,$2,$3) on conflict do nothing', [userId, taskId, xp]);
  return rowCount === 1;
}
export async function unmarkTask(c: Queryable, userId: string, taskId: string): Promise<number | null> {
  const { rows } = await c.query<{ xp_awarded: number }>('delete from user_task_progress where user_id = $1 and task_id = $2 returning xp_awarded', [userId, taskId]);
  return rows[0]?.xp_awarded ?? null;
}
export async function claimTaskReward(c: Queryable, userId: string, taskId: string): Promise<boolean> {
  const { rowCount } = await c.query('insert into task_reward_ledger (user_id, task_id) values ($1,$2) on conflict do nothing', [userId, taskId]);
  return rowCount === 1;
}
export async function startPhase(c: Queryable, userId: string, phaseId: string) {
  await c.query(`insert into user_phase_progress (user_id, phase_id, started_at) values ($1,$2,now())
                 on conflict (user_id, phase_id) do update set started_at = coalesce(user_phase_progress.started_at, now())`, [userId, phaseId]);
}
