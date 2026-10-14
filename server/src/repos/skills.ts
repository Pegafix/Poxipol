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

// Estilo Final Fantasy II: una habilidad se abre por DOMINIO practicado, no por puntos de nivel general.
// Requisitos: la habilidad padre en nivel 3 y cada prerrequisito transversal en nivel 2. Una consulta.
export const PARENT_LEVEL = 3, PREREQ_LEVEL = 2;
export async function missingRequirements(q: Queryable, userId: string, skillId: number): Promise<{ skill: string; needLevel: number; level: number }[]> {
  const { rows } = await q.query<{ slug: string; need: number; level: number }>(
    `select r.slug, $3::int as need, coalesce(sp.level, 0) as level from skill_nodes n
       join skill_nodes r on r.id = n.parent_id and r.kind = 'skill'
       left join user_skill_progress sp on sp.user_id = $1 and sp.skill_id = r.id
      where n.id = $2 and coalesce(sp.level, 0) < $3
     union all
     select r.slug, $4::int, coalesce(sp.level, 0) from skill_prereqs p join skill_nodes r on r.id = p.requires_id
       left join user_skill_progress sp on sp.user_id = $1 and sp.skill_id = r.id
      where p.skill_id = $2 and coalesce(sp.level, 0) < $4`,
    [userId, skillId, PARENT_LEVEL, PREREQ_LEVEL]);
  return rows.map(r => ({ skill: r.slug, needLevel: r.need, level: r.level }));
}

export async function insertUserSkill(c: Queryable, userId: string, skillId: number): Promise<boolean> {
  const { rowCount } = await c.query('insert into user_skills (user_id, skill_id) values ($1,$2) on conflict do nothing', [userId, skillId]);
  return rowCount === 1;
}

// Acceso: desbloqueada, o de primera fila en su rama (esas están abiertas desde el inicio).
export async function hasSkill(q: Queryable, userId: string, slug: string): Promise<boolean> {
  const { rows } = await q.query(
    `select 1 from skill_nodes n left join skill_nodes p on p.id = n.parent_id
      where n.slug = $2 and n.kind = 'skill' and (p.kind = 'branch' or exists (select 1 from user_skills u where u.user_id = $1 and u.skill_id = n.id))`, [userId, slug]);
  return rows.length > 0;
}
export async function unlockedSlugs(q: Queryable, userId: string): Promise<string[]> {
  const { rows } = await q.query<{ slug: string }>('select n.slug from user_skills u join skill_nodes n on n.id = u.skill_id where u.user_id = $1 order by n.path', [userId]);
  return rows.map(r => r.slug);
}
