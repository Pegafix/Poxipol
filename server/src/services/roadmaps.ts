import { errors } from '../http/errors.js';
import { levelOf, localTime, nextStreak, taskXp, type Effect } from '../domain/pet.js';
import { FAMILY_OF_TAG, REWARD_POOLS, TASK_PRACTICE } from '../catalog/catalog.js';
import * as rm from '../repos/roadmaps.js';
import * as petRepo from '../repos/pet.js';
import * as inv from '../repos/inventory.js';
import * as imports from '../repos/imports.js';
import { findUser } from '../repos/users.js';
import { bumpRev, type Change } from '../repos/sync.js';
import { parseRoadmapPdf } from '../infra/pdf.js';
import { runCommand, sha256, type Deps } from './context.js';
import type { PetService } from './pet.js';
import type { LearningService } from './learning.js';
import { hasSkill } from '../repos/skills.js';

export const familyOf = (tag: string) => FAMILY_OF_TAG[tag] ?? 'create';

function hashInt(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export function roadmapService(deps: Deps, pet: PetService, learning: LearningService) {
  return {
    list: (userId: string) => rm.listRoadmaps(deps.db.pool, userId),
    async get(userId: string, id: string) {
      const r = await rm.getRoadmap(deps.db.pool, userId, id);
      if (!r) throw errors.notFound('esa misión');
      return r;
    },

    // Completar una tarea: el SERVIDOR calcula la energía (combo, racha, efectos, equipo), el material y el nivel.
    // El bloqueo de pet_state serializa las escrituras del mismo usuario entre dispositivos.
    async completeTask(userId: string, taskId: string, idemKey?: string) {
      const res = await runCommand(deps, userId, idemKey, { taskId }, async c => {
        const task = await rm.taskForUser(c, userId, taskId);
        if (!task) throw errors.notFound('esa tarea');
        const p = (await petRepo.getPet(c, userId, true))!;
        if (task.done_at) return { status: 200, body: { taskId, alreadyDone: true, xp: 0, multiplier: 1, reward: null as string | null, levelUp: false, practice: null as unknown, rev: null as number | null } };
        const user = (await findUser(c, userId))!;
        const now = deps.now();
        const day = localTime(now, user.timezone).day;
        const { counters } = await petRepo.getDaily(c, userId, day);
        const effects = ((counters?.effects ?? []) as Effect[]).filter(e => !(counters?.cured ?? []).includes(e));
        const equip = await inv.listEquipment(c, userId);
        const perkBonus = equip.reduce((sum, e) => {
          const k = e.effect?.perk ?? {};
          return sum + (k.all ?? 0) + (k.fam && k.fam === task.family ? k.xp ?? 0 : 0);
        }, 0);
        const firstToday = p.streakDay !== day;
        const streak = nextStreak(p.streakDay, p.streakDays, day);
        const recent = await rm.recentCompletions(c, userId, new Date(now.getTime() - 20 * 60_000));
        const { xp, multiplier } = taskXp({ tag: task.tag, recentCompletions: recent, firstToday, streakDays: streak, effects, perkBonus });

        await rm.markTaskDone(c, userId, taskId, xp);
        await rm.startPhase(c, userId, task.phase_id);
        const changes: Change[] = [{ entity: 'task', id: taskId, op: 'upsert' }, { entity: 'pet', id: userId, op: 'upsert' }];
        // Material: una sola vez por tarea (aunque se desmarque y vuelva a marcar). Elegido de forma determinista.
        let reward: string | null = null;
        if (await rm.claimTaskReward(c, userId, taskId)) {
          const pool = REWARD_POOLS[task.family as keyof typeof REWARD_POOLS] ?? REWARD_POOLS.create;
          reward = pool[hashInt(taskId) % pool.length]!;
          await inv.addItem(c, userId, reward, 1);
          changes.push({ entity: 'inventory', id: reward, op: 'upsert' });
        }
        const before = levelOf(p.xpTotal).level, after = levelOf(p.xpTotal + xp).level;
        await petRepo.applyProgress(c, userId, { xp, skillPoints: 0, activityAt: now, streakDays: streak, streakDay: day });
        await petRepo.bumpDaily(c, userId, day, { tasks: 1, learn: task.family === 'claude' ? 1 : 0 });
        // Learning by doing: la tarea entrena la habilidad de su tipo (si ya está a su alcance en el árbol).
        const practiceSkill = TASK_PRACTICE[task.family as keyof typeof TASK_PRACTICE];
        const practice = practiceSkill && (await hasSkill(c, userId, practiceSkill))
          ? await learning.recordPractice(c, userId, { skill: practiceSkill, outcome: 'success', difficulty: 3, durationMin: 25, reflected: false, source: 'task' }, changes)
          : null;
        const rev = await bumpRev(c, userId, changes);
        return { status: 200, body: { taskId, alreadyDone: false, xp, multiplier, reward, levelUp: after > before, practice, rev } };
      });
      if (res.body.rev) await pet.published(userId, res.body.rev);
      return { ...res, body: { ...res.body, pet: await pet.snapshot(userId) } };
    },

    async uncompleteTask(userId: string, taskId: string) {
      const rev = await deps.db.tx(async c => {
        const task = await rm.taskForUser(c, userId, taskId);
        if (!task) throw errors.notFound('esa tarea');
        await petRepo.getPet(c, userId, true);
        const xp = await rm.unmarkTask(c, userId, taskId);
        if (xp === null) return null;
        const user = (await findUser(c, userId))!;
        await petRepo.applyProgress(c, userId, { xp: -xp, skillPoints: 0 });
        await petRepo.bumpDaily(c, userId, localTime(deps.now(), user.timezone).day, { tasks: -1 });
        return bumpRev(c, userId, [{ entity: 'task', id: taskId, op: 'delete' }, { entity: 'pet', id: userId, op: 'upsert' }]);
      });
      if (rev) await pet.published(userId, rev);
      return { taskId, done: false, rev, pet: await pet.snapshot(userId) };
    },

    // Subir un PDF no lo procesa en la solicitud: se encola y responde 202 al instante.
    // El mismo archivo subido dos veces (otro dispositivo, reintento) devuelve la misma importación.
    async enqueueImport(userId: string, bytes: Buffer) {
      if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw errors.rule('VALIDATION_FAILED', 'El archivo no es un PDF.');
      const { row, created } = await imports.createImport(deps.db.pool, userId, sha256(bytes), bytes);
      return { created, import: row };
    },
    async getImport(userId: string, id: string) {
      const r = await imports.getImport(deps.db.pool, userId, id);
      if (!r) throw errors.notFound('esa importación');
      return r;
    },

    // Trabajo del worker: toma un PDF de la cola, lo lee y guarda la misión. Reintenta hasta 3 veces si falla.
    async processNextImport(): Promise<boolean> {
      const job = await deps.db.tx(c => imports.claimNextImport(c));
      if (!job) return false;
      try {
        const parsed = await parseRoadmapPdf(new Uint8Array(job.file_bytes));
        if (!parsed) { await imports.failImport(deps.db.pool, job.id, 'No encontré una hoja de ruta con fases ("Fase 0: …") en este PDF.', false); return true; }
        const rev = await deps.db.tx(async c => {
          const roadmapId = await rm.upsertRoadmap(c, job.user_id, parsed, familyOf);
          await imports.finishImport(c, job.id, roadmapId);
          return bumpRev(c, job.user_id, [{ entity: 'roadmap', id: roadmapId, op: 'upsert' }]);
        });
        await pet.published(job.user_id, rev);
      } catch (e) {
        await imports.failImport(deps.db.pool, job.id, (e as Error).message || 'Error al leer el PDF', true);
      }
      return true;
    }
  };
}
