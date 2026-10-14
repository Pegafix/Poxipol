import { AppError } from '../http/errors.js';
import { changesSince, currentRev, oldestRev } from '../repos/sync.js';
import * as inv from '../repos/inventory.js';
import { unlockedSlugs } from '../repos/skills.js';
import { listRoadmaps } from '../repos/roadmaps.js';
import { findUser } from '../repos/users.js';
import type { Deps } from './context.js';
import type { PetService } from './pet.js';

const PAGE = 500;

export function syncService(deps: Deps, pet: PetService) {
  async function sections(userId: string, wanted: Set<string>) {
    const q = deps.db.pool;
    const out: Record<string, unknown> = {};
    const jobs: Promise<void>[] = [];
    if (wanted.has('pet')) jobs.push(pet.snapshot(userId).then(v => { out.pet = v; }));
    if (wanted.has('inventory')) jobs.push(inv.listInventory(q, userId).then(v => { out.inventory = v; }));
    if (wanted.has('equipment')) jobs.push(inv.listEquipment(q, userId).then(v => { out.equipment = v.map(e => ({ slot: e.slot, itemId: e.item_id })); }));
    if (wanted.has('skill')) jobs.push(unlockedSlugs(q, userId).then(v => { out.skills = v; }));
    if (wanted.has('discovery')) jobs.push(inv.listDiscoveries(q, userId).then(v => { out.discoveries = v.map(d => ({ key: d.key, name: d.name, kind: d.kind })); }));
    if (wanted.has('roadmap') || wanted.has('task') || wanted.has('phase')) jobs.push(listRoadmaps(q, userId).then(v => { out.roadmaps = v; }));
    await Promise.all(jobs);
    return out;
  }

  return {
    // Arranque en frío de un dispositivo: todo lo necesario para dibujar la app de una vez.
    async bootstrap(userId: string) {
      const [user, rev] = await Promise.all([findUser(deps.db.pool, userId), currentRev(deps.db.pool, userId)]);
      const data = await sections(userId, new Set(['pet', 'inventory', 'equipment', 'skill', 'discovery', 'roadmap']));
      return { rev, user: { id: user!.id, displayName: user!.display_name, timezone: user!.timezone }, ...data };
    },

    // Sincronización incremental: "dame lo que cambió desde la revisión N". Devuelve solo las secciones tocadas,
    // ya hidratadas, y las tareas cambiadas una por una para que el cliente no recargue la misión entera.
    async since(userId: string, since: number) {
      const rev = await currentRev(deps.db.pool, userId);
      if (since > rev) throw new AppError(400, 'VALIDATION_FAILED', 'La revisión pedida es del futuro. Usa la última que recibiste.');
      if (since === rev) return { rev, hasMore: false, changes: [], data: {} };
      const oldest = await oldestRev(deps.db.pool, userId);
      if (oldest !== null && since < oldest - 1) throw new AppError(410, 'SYNC_CURSOR_EXPIRED', 'Pasó mucho tiempo: vuelve a cargar el estado completo con /v1/me/state.');
      const changes = await changesSince(deps.db.pool, userId, since, PAGE);
      const last = new Map<string, { entity: string; id: string; op: string }>();
      changes.forEach(ch => last.set(`${ch.entity}:${ch.id}`, ch));
      const compact = [...last.values()];
      const data = await sections(userId, new Set(compact.map(c => c.entity)));
      const tasks = compact.filter(c => c.entity === 'task').map(c => ({ id: c.id, done: c.op === 'upsert' }));
      return { rev: changes.length ? changes[changes.length - 1]!.rev : rev, hasMore: changes.length === PAGE, changes: compact, data: { ...data, ...(tasks.length ? { tasks } : {}) } };
    }
  };
}
