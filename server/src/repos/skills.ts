import type { Queryable } from '../infra/db.js';

export interface SkillNodeRow { id: number; slug: string; parent_slug: string | null; path: string; depth: number; kind: string; title: string; description: string; cost: number; unlocked: boolean }

// Una rama completa (hasta cierta profundidad) con el estado del usuario: UNA consulta, sin recursión.
// "path <@ raíz" usa el índice GiST; el LEFT JOIN a user_skills es por clave primaria.
export async function subtree(q: Queryable, userId: string, rootPath: string | null, maxDepth: number): Promise<SkillNodeRow[]> {
  const { rows } = await q.query<SkillNodeRow>(
    `select n.id, n.slug, p.slug as parent_slug, n.path::text as path, n.depth, n.kind, n.title, n.description, n.cost,
            (us.user_id is not null) as unlocked
       from skill_nodes n
       left join skill_nodes p on p.id = n.parent_id
       left join user_skills us on us.skill_id = n.id and us.user_id = $1
      where ($2::ltree is null or n.path <@ $2::ltree)
        and n.depth <= coalesce(nlevel($2::ltree), 0) + $3
      order by n.path`,
    [userId, rootPath, maxDepth]);
  return rows.map(r => ({ ...r, id: Number(r.id) }));
}

export async function prereqEdges(q: Queryable, skillIds: number[]) {
  if (!skillIds.length) return [];
  const { rows } = await q.query<{ skill: string; requires: string }>(
    `select a.slug as skill, b.slug as requires from skill_prereqs p join skill_nodes a on a.id = p.skill_id join skill_nodes b on b.id = p.requires_id
      where p.skill_id = any($1::bigint[])`, [skillIds]);
  return rows;
}

export async function nodeBySlug(q: Queryable, slug: string) {
  const { rows } = await q.query<{ id: string; path: string; kind: string; cost: number; parent_id: string | null }>(
    'select id, path::text as path, kind, cost, parent_id from skill_nodes where slug = $1', [slug]);
  const r = rows[0];
  return r ? { id: Number(r.id), path: r.path, kind: r.kind, cost: r.cost, parentId: r.parent_id ? Number(r.parent_id) : null } : null;
}

// ¿Qué falta para desbloquear? Padre (si no es raíz de rama) + prerrequisitos transversales. Una consulta.
export async function missingRequirements(q: Queryable, userId: string, skillId: number): Promise<string[]> {
  const { rows } = await q.query<{ slug: string }>(
    `select r.slug from skill_nodes n
       join skill_nodes r on r.id = n.parent_id and r.kind = 'skill'
      where n.id = $2 and not exists (select 1 from user_skills u where u.user_id = $1 and u.skill_id = r.id)
     union
     select r.slug from skill_prereqs p join skill_nodes r on r.id = p.requires_id
      where p.skill_id = $2 and not exists (select 1 from user_skills u where u.user_id = $1 and u.skill_id = r.id)`,
    [userId, skillId]);
  return rows.map(r => r.slug);
}

export async function insertUserSkill(c: Queryable, userId: string, skillId: number): Promise<boolean> {
  const { rowCount } = await c.query('insert into user_skills (user_id, skill_id) values ($1,$2) on conflict do nothing', [userId, skillId]);
  return rowCount === 1;
}

export async function hasSkill(q: Queryable, userId: string, slug: string): Promise<boolean> {
  const { rows } = await q.query('select 1 from user_skills u join skill_nodes n on n.id = u.skill_id where u.user_id = $1 and n.slug = $2', [userId, slug]);
  return rows.length > 0;
}
export async function unlockedSlugs(q: Queryable, userId: string): Promise<string[]> {
  const { rows } = await q.query<{ slug: string }>('select n.slug from user_skills u join skill_nodes n on n.id = u.skill_id where u.user_id = $1 order by n.path', [userId]);
  return rows.map(r => r.slug);
}

export async function spendSkillPoints(c: Queryable, userId: string, cost: number): Promise<boolean> {
  const { rowCount } = await c.query(
    'update pet_state set skill_points = skill_points - $2, version = version + 1, updated_at = now() where user_id = $1 and skill_points >= $2', [userId, cost]);
  return rowCount === 1;
}
