import type { Queryable } from '../infra/db.js';

export interface ItemRow { id: string; kind: string; name: string; slot: string | null; infinite: boolean; effect: Record<string, any> }

export async function itemsById(q: Queryable, ids: string[]): Promise<Map<string, ItemRow>> {
  const { rows } = await q.query<ItemRow>('select id, kind, name, slot, infinite, effect from items where id = any($1::text[])', [ids]);
  return new Map(rows.map(r => [r.id, r]));
}

export async function listInventory(q: Queryable, userId: string) {
  const { rows } = await q.query<{ item_id: string; qty: number; name: string; kind: string }>(
    `select i.item_id, i.qty, it.name, it.kind from user_inventory i join items it on it.id = i.item_id where i.user_id = $1 and i.qty > 0 order by it.kind, it.name`, [userId]);
  return rows.map(r => ({ itemId: r.item_id, qty: r.qty, name: r.name, kind: r.kind }));
}

// Bloquea las filas de esos materiales hasta el fin de la transacción: dos dispositivos crafteando a la vez
// no pueden gastar el mismo material dos veces.
export async function lockQuantities(c: Queryable, userId: string, itemIds: string[]): Promise<Map<string, number>> {
  const { rows } = await c.query<{ item_id: string; qty: number }>(
    'select item_id, qty from user_inventory where user_id = $1 and item_id = any($2::text[]) order by item_id for update', [userId, itemIds]);
  return new Map(rows.map(r => [r.item_id, r.qty]));
}

export async function addItem(c: Queryable, userId: string, itemId: string, qty: number) {
  await c.query(
    `insert into user_inventory (user_id, item_id, qty) values ($1,$2,$3)
     on conflict (user_id, item_id) do update set qty = user_inventory.qty + excluded.qty`, [userId, itemId, qty]);
}
export async function consumeItem(c: Queryable, userId: string, itemId: string, qty: number): Promise<boolean> {
  const { rowCount } = await c.query('update user_inventory set qty = qty - $3 where user_id = $1 and item_id = $2 and qty >= $3', [userId, itemId, qty]);
  return rowCount === 1;
}

export async function listEquipment(q: Queryable, userId: string) {
  const { rows } = await q.query<{ slot: string; item_id: string; effect: Record<string, any> }>(
    'select e.slot, e.item_id, it.effect from user_equipment e join items it on it.id = e.item_id where e.user_id = $1', [userId]);
  return rows;
}
export async function setEquipment(c: Queryable, userId: string, slot: string, itemId: string | null) {
  if (!itemId) await c.query('delete from user_equipment where user_id = $1 and slot = $2', [userId, slot]);
  else await c.query(
    `insert into user_equipment (user_id, slot, item_id) values ($1,$2,$3) on conflict (user_id, slot) do update set item_id = excluded.item_id`, [userId, slot, itemId]);
}

export async function recipeByKey(q: Queryable, key: string) {
  const { rows } = await q.query<{ id: string; kind: string; output_item: string | null; output_name: string; fact: string }>(
    'select id, kind, output_item, output_name, fact from recipes where key = $1', [key]);
  const r = rows[0];
  return r ? { id: Number(r.id), kind: r.kind as 'mat' | 'food' | 'exp' | 'jewel', outputItem: r.output_item, outputName: r.output_name, fact: r.fact } : null;
}
export async function recordDiscovery(c: Queryable, userId: string, recipeId: number): Promise<boolean> {
  const { rowCount } = await c.query('insert into user_discoveries (user_id, recipe_id) values ($1,$2) on conflict do nothing', [userId, recipeId]);
  return rowCount === 1;
}
export async function logCraft(c: Queryable, userId: string, recipeId: number | null, key: string, success: boolean) {
  await c.query('insert into craft_log (user_id, recipe_id, input_key, success) values ($1,$2,$3,$4)', [userId, recipeId, key, success]);
}
// Solo lo descubierto por el usuario. Las recetas no descubiertas jamás salen de la base.
export async function listDiscoveries(q: Queryable, userId: string) {
  const { rows } = await q.query<{ key: string; kind: string; output_name: string; fact: string; discovered_at: Date }>(
    `select r.key, r.kind, r.output_name, r.fact, d.discovered_at from user_discoveries d join recipes r on r.id = d.recipe_id
      where d.user_id = $1 order by d.discovered_at`, [userId]);
  return rows.map(r => ({ key: r.key, kind: r.kind, name: r.output_name, fact: r.fact, discoveredAt: r.discovered_at }));
}
export const recipeCount = async (q: Queryable) => Number((await q.query('select count(*)::int as n from recipes')).rows[0].n);
