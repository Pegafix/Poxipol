import { errors, AppError } from '../http/errors.js';
import { countIngredients, FAIL_TEXT, PROCESS_SKILL, recipeKey, type Process } from '../domain/crafting.js';
import * as inv from '../repos/inventory.js';
import { hasSkill } from '../repos/skills.js';
import { bumpRev, type Change } from '../repos/sync.js';
import { runCommand, type Deps } from './context.js';
import type { PetService } from './pet.js';

export function craftService(deps: Deps, pet: PetService) {
  return {
    // Mezclar: valida habilidad del proceso, bloquea y descuenta materiales, busca la receta por clave
    // y registra el intento. Todo en una transacción: o pasa completo o no pasa nada.
    async craft(userId: string, ingredients: string[], process: Process, idemKey?: string) {
      const res = await runCommand(deps, userId, idemKey, { ingredients: [...ingredients].sort(), process }, async c => {
        const needSkill = PROCESS_SKILL[process];
        if (needSkill && !(await hasSkill(c, userId, needSkill))) {
          throw errors.rule('SKILL_REQUIRED', `Para ${process} necesitas la habilidad "${needSkill}" del árbol.`, { skill: needSkill });
        }
        const want = countIngredients(ingredients);
        const items = await inv.itemsById(c, [...want.keys()]);
        const unknown = [...want.keys()].filter(id => !items.has(id));
        if (unknown.length) throw errors.validation(unknown.map(id => ({ path: 'ingredients', message: `No existe el material "${id}"` })));
        const finite = [...want.keys()].filter(id => !items.get(id)!.infinite);
        const have = await inv.lockQuantities(c, userId, finite);
        const missing = finite.filter(id => (have.get(id) ?? 0) < want.get(id)!).map(id => ({ item: id, need: want.get(id)!, have: have.get(id) ?? 0 }));
        if (missing.length) throw errors.rule('INSUFFICIENT_MATERIALS', 'Te faltan materiales. Pídelos en la Plaza o sigue avanzando en tus misiones.', { missing });

        const key = recipeKey(ingredients, process);
        const recipe = await inv.recipeByKey(c, key);
        if (recipe?.kind === 'jewel' && recipe.outputItem && (have.get(recipe.outputItem) ?? (await inv.lockQuantities(c, userId, [recipe.outputItem])).get(recipe.outputItem) ?? 0) > 0) {
          throw new AppError(409, 'ALREADY_EXISTS', 'Ya tienes esa joya. Guarda el material para otra cosa.');
        }
        for (const id of finite) await inv.consumeItem(c, userId, id, want.get(id)!);
        const changes: Change[] = finite.map(id => ({ entity: 'inventory', id, op: 'upsert' }));
        let isNew = false;
        if (recipe) {
          if (recipe.outputItem) { await inv.addItem(c, userId, recipe.outputItem, 1); changes.push({ entity: 'inventory', id: recipe.outputItem, op: 'upsert' }); }
          isNew = await inv.recordDiscovery(c, userId, recipe.id);
          if (isNew) changes.push({ entity: 'discovery', id: key, op: 'upsert' });
        }
        await inv.logCraft(c, userId, recipe?.id ?? null, key, !!recipe);
        const rev = await bumpRev(c, userId, changes);
        // El dato real y el nombre solo viajan cuando la mezcla funciona: la API no revela recetas.
        const body = recipe
          ? { success: true, isNew, kind: recipe.kind, name: recipe.outputName, output: recipe.outputItem, fact: recipe.fact, rev }
          : { success: false, isNew: false, message: FAIL_TEXT[process], rev };
        return { status: 200, body };
      });
      await pet.published(userId, res.body.rev);
      return res;
    },

    async discoveries(userId: string) {
      const [list, total] = await Promise.all([inv.listDiscoveries(deps.db.pool, userId), inv.recipeCount(deps.db.pool)]);
      return { discovered: list, total };
    }
  };
}
