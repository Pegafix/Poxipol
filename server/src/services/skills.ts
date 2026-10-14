import { errors } from '../http/errors.js';
import * as skills from '../repos/skills.js';
import { bumpRev } from '../repos/sync.js';
import { runCommand, type Deps } from './context.js';
import type { PetService } from './pet.js';

export function skillService(deps: Deps, pet: PetService) {
  return {
    // Devuelve una rama como lista plana ordenada por camino (cada nodo trae su padre): el cliente arma el árbol
    // en una pasada. Profundidad limitada para no mandar el árbol entero cuando es masivo.
    async tree(userId: string, rootSlug: string | undefined, depth: number) {
      let rootPath: string | null = null;
      if (rootSlug) {
        const root = await skills.nodeBySlug(deps.db.pool, rootSlug);
        if (!root) throw errors.notFound(`la rama "${rootSlug}"`);
        rootPath = root.path;
      }
      const nodes = await skills.subtree(deps.db.pool, userId, rootPath, depth);
      const edges = await skills.prereqEdges(deps.db.pool, nodes.map(n => n.id));
      const req = new Map<string, string[]>();
      edges.forEach(e => req.set(e.skill, [...(req.get(e.skill) ?? []), e.requires]));
      const unlocked = new Set(nodes.filter(n => n.unlocked).map(n => n.slug));
      return nodes.map(n => {
        const requires = req.get(n.slug) ?? [];
        const parentIsSkill = n.parent_slug && nodes.find(x => x.slug === n.parent_slug)?.kind === 'skill';
        // "available" es una ayuda para pintar; el servidor vuelve a validar al desbloquear.
        const available = n.kind === 'skill' && !n.unlocked && (!parentIsSkill || unlocked.has(n.parent_slug!)) && requires.every(r => unlocked.has(r));
        return { slug: n.slug, parent: n.parent_slug, depth: n.depth, kind: n.kind, title: n.title, description: n.description, cost: n.cost, unlocked: n.unlocked, available, requires };
      });
    },

    async unlock(userId: string, slug: string, idemKey?: string) {
      const res = await runCommand(deps, userId, idemKey, { slug }, async c => {
        const node = await skills.nodeBySlug(c, slug);
        if (!node) throw errors.notFound(`la habilidad "${slug}"`);
        if (node.kind !== 'skill') throw errors.rule('SKILL_LOCKED', 'Las ramas no se desbloquean: se desbloquean sus habilidades.');
        await c.query('select 1 from pet_state where user_id = $1 for update', [userId]); // serializa desbloqueos del mismo usuario
        if (await skills.hasSkill(c, userId, slug)) return { status: 200, body: { slug, alreadyUnlocked: true, rev: null as number | null } };
        const missing = await skills.missingRequirements(c, userId, node.id);
        if (missing.length) throw errors.rule('SKILL_LOCKED', 'Primero necesitas otras habilidades.', { missing });
        if (!(await skills.spendSkillPoints(c, userId, node.cost))) throw errors.rule('NOT_ENOUGH_SKILL_POINTS', `Necesitas ${node.cost} punto(s) de habilidad. Se ganan subiendo de nivel.`, { cost: node.cost });
        await skills.insertUserSkill(c, userId, node.id);
        const rev = await bumpRev(c, userId, [{ entity: 'skill', id: slug, op: 'upsert' }, { entity: 'pet', id: userId, op: 'upsert' }]);
        return { status: 201, body: { slug, alreadyUnlocked: false, rev } };
      });
      if (res.body.rev) await pet.published(userId, res.body.rev);
      return res;
    }
  };
}
