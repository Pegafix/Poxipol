import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { ITEMS, RECIPES, SKILLS } from '../catalog/catalog.js';
import { recipeKey } from '../domain/crafting.js';

// Carga (o actualiza) el catálogo global. Es idempotente: se puede correr en cada despliegue.
export async function seed(databaseUrl: string): Promise<void> {
  const c = new pg.Client({ connectionString: databaseUrl });
  await c.connect();
  try {
    await c.query('begin');
    for (const it of ITEMS) {
      await c.query(
        `insert into items (id, kind, name, slot, infinite, effect) values ($1,$2,$3,$4,$5,$6)
         on conflict (id) do update set kind = excluded.kind, name = excluded.name, slot = excluded.slot, infinite = excluded.infinite, effect = excluded.effect`,
        [it.id, it.kind, it.name, it.slot ?? null, it.infinite ?? false, JSON.stringify(it.effect ?? {})]
      );
    }
    for (const r of RECIPES) {
      const key = recipeKey(r.ingredients, r.process);
      const { rows } = await c.query(
        `insert into recipes (key, process, kind, output_item, output_name, fact) values ($1,$2,$3,$4,$5,$6)
         on conflict (key) do update set kind = excluded.kind, output_item = excluded.output_item, output_name = excluded.output_name, fact = excluded.fact
         returning id`,
        [key, r.process, r.kind, r.out ?? null, r.name, r.fact]
      );
      await c.query('delete from recipe_ingredients where recipe_id = $1', [rows[0].id]);
      const counts = new Map<string, number>();
      r.ingredients.forEach(i => counts.set(i, (counts.get(i) ?? 0) + 1));
      for (const [item, qty] of counts) await c.query('insert into recipe_ingredients (recipe_id, item_id, qty) values ($1,$2,$3)', [rows[0].id, item, qty]);
    }
    // Árbol: el camino (ltree) se arma desde la cadena de padres. Los padres van antes en la lista.
    const pathOf = new Map<string, string>();
    for (const s of SKILLS) {
      const p = s.parent ? `${pathOf.get(s.parent)}.${s.slug}` : s.slug;
      pathOf.set(s.slug, p);
      await c.query(
        `insert into skill_nodes (slug, parent_id, path, kind, title, description, cost, attr_weights)
         values ($1, (select id from skill_nodes where slug = $2), $3::ltree, $4, $5, $6, $7, $8)
         on conflict (slug) do update set parent_id = excluded.parent_id, path = excluded.path, kind = excluded.kind,
           title = excluded.title, description = excluded.description, cost = excluded.cost, attr_weights = excluded.attr_weights`,
        [s.slug, s.parent ?? null, p, s.kind, s.title, s.description ?? '', s.cost ?? (s.kind === 'branch' ? 0 : 1), JSON.stringify(s.uses ?? {})]
      );
    }
    for (const s of SKILLS) {
      for (const req of s.requires ?? []) {
        await c.query(
          `insert into skill_prereqs (skill_id, requires_id) select a.id, b.id from skill_nodes a, skill_nodes b where a.slug = $1 and b.slug = $2 on conflict do nothing`,
          [s.slug, req]
        );
      }
    }
    await c.query('commit');
  } catch (e) { await c.query('rollback'); throw e; } finally { await c.end(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  seed(process.env.DATABASE_URL!).then(() => console.log('Catálogo cargado'), e => { console.error(e); process.exit(1); });
}
