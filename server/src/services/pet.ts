import type pg from 'pg';
import { errors, AppError } from '../http/errors.js';
import { computeSnapshot, EMPTY_DAY, nightKey, localTime, pokeReaction, rollEffects, wakeReaction, type Effect, type PetSnapshot } from '../domain/pet.js';
import { isValidTimeZone } from '../domain/time.js';
import type { Queryable } from '../infra/db.js';
import * as petRepo from '../repos/pet.js';
import * as inv from '../repos/inventory.js';
import { findUser, setTimezone } from '../repos/users.js';
import { bumpRev, currentRev } from '../repos/sync.js';
import { runCommand, type Deps } from './context.js';

const SNAP_MAX_TTL = 300;      // aunque nada cambie, se recalcula como máximo cada 5 minutos
const POKE_WINDOW_MS = 45_000;
const PAUSE_SECONDS = 60;
const TZ_COOLDOWN_MS = 24 * 3600_000;

export function petService(deps: Deps) {
  const revKey = (u: string) => `rev:${u}`;

  async function revOf(userId: string): Promise<number> {
    try { const v = await deps.cache.get(revKey(userId)); if (v) return Number(v); } catch { /* sin caché */ }
    const rev = await currentRev(deps.db.pool, userId);
    deps.cache.set(revKey(userId), String(rev), 3600).catch(() => {});
    return rev;
  }
  // Tras cada commit: publicar la nueva revisión invalida, de paso, todas las instantáneas viejas.
  async function published(userId: string, rev: number) { await deps.cache.set(revKey(userId), String(rev), 3600).catch(() => {}); }

  // Calcula la instantánea desde las anclas. Si es la primera lectura del día ya despierto, sortea y FIJA los efectos.
  async function build(q: Queryable, userId: string): Promise<PetSnapshot & { name: string; version: number; skillPoints: number }> {
    const user = await findUser(q, userId);
    const pet = await petRepo.getPet(q, userId);
    if (!user || !pet) throw errors.notFound('ese usuario');
    const now = deps.now();
    const t = localTime(now, user.timezone);
    const { counters, wakes } = await petRepo.getDaily(q, userId, t.day);
    let today = counters ?? { ...EMPTY_DAY };
    if (today.effects === null && t.hour >= 7 && t.hour < 23) {
      const effects = rollEffects(t.day, wakes, userId);
      await petRepo.setEffectsIfMissing(q, userId, t.day, effects);
      today = { ...today, effects: (await petRepo.getDaily(q, userId, t.day)).counters!.effects };
    }
    return { name: pet.name, version: pet.version, skillPoints: pet.skillPoints, ...computeSnapshot(pet, today, now, user.timezone) };
  }

  async function snapshot(userId: string) {
    const rev = await revOf(userId);
    const key = `pet:snap:${userId}:${rev}`;
    try {
      const hit = await deps.cache.get(key);
      if (hit) {
        const s = JSON.parse(hit);
        if (Date.parse(s.validUntil) > deps.now().getTime()) return { ...s, serverTime: deps.now().toISOString(), rev };
      }
    } catch { /* caché caída: se calcula igual */ }
    const s = await build(deps.db.pool, userId);
    const ttl = Math.min(SNAP_MAX_TTL, Math.max(1, (Date.parse(s.validUntil) - deps.now().getTime()) / 1000));
    deps.cache.set(key, JSON.stringify(s), ttl).catch(() => {});
    return { ...s, rev };
  }

  return {
    snapshot,
    build,
    published,

    async rename(userId: string, name: string, expectedVersion: number) {
      return deps.db.tx(async c => {
        const v = await petRepo.renamePet(c, userId, name, expectedVersion);
        if (v === null) {
          const cur = await petRepo.getPet(c, userId);
          throw errors.conflict({ name: cur?.name, version: cur?.version });
        }
        const rev = await bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }]);
        return rev;
      }).then(async rev => { await published(userId, rev); return snapshot(userId); });
    },

    // Tocarlo. Despierto, casi todo vive en Redis (ventana de toques y pausas): no escribe en la base por cada toque.
    // Dormido, cada despertada se guarda en la noche correspondiente y pasa la cuenta al otro día.
    async poke(userId: string) {
      const s = await snapshot(userId);
      if (s.phase === 'sleep') {
        const user = (await findUser(deps.db.pool, userId))!;
        const nk = nightKey(localTime(deps.now(), user.timezone));
        const rev = await deps.db.tx(async c => {
          const n = await petRepo.bumpDaily(c, userId, nk, { wakes: 1 });
          if (n >= 2) await petRepo.applyProgress(c, userId, { xp: 0, skillPoints: 0, empathyDelta: n >= 4 ? -2 : -1 });
          return { n, rev: await bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }]) };
        });
        await published(userId, rev.rev);
        return { reaction: wakeReaction(rev.n), wakesTonight: rev.n, pet: await snapshot(userId) };
      }
      const pauseKey = `pet:pause:${userId}`;
      const paused = await deps.cache.get(pauseKey).catch(() => null);
      if (paused) {
        const left = Math.max(1, Math.ceil((Number(paused) - deps.now().getTime()) / 1000));
        throw new AppError(422, 'PET_ON_PAUSE', 'Mochi pidió una pausa. Respetarla también es cariño.', { secondsLeft: left }, left);
      }
      const count = await deps.cache.hitWindow(`pet:pokes:${userId}`, POKE_WINDOW_MS, deps.now().getTime());
      const drained = s.effects.some((e: { id: Effect }) => e.id === 'agotado');
      const reaction = pokeReaction(count, s.vitals.empathy, drained);
      if (reaction === 'pause') {
        await deps.cache.set(pauseKey, String(deps.now().getTime() + PAUSE_SECONDS * 1000), PAUSE_SECONDS);
        await deps.cache.del(`pet:pokes:${userId}`);
        const rev = await deps.db.tx(async c => {
          await petRepo.applyProgress(c, userId, { xp: 0, skillPoints: 0, empathyDelta: -1 });
          return bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }]);
        });
        await published(userId, rev);
      }
      return { reaction, pausedForSeconds: reaction === 'pause' ? PAUSE_SECONDS : 0, pet: await snapshot(userId) };
    },

    // Darle una comida hecha en el taller: consume el objeto y aplica cura o refuerzo al día de hoy.
    async feed(userId: string, itemId: string, idemKey?: string) {
      const res = await runCommand(deps, userId, idemKey, { itemId }, async c => {
        const item = (await inv.itemsById(c, [itemId])).get(itemId);
        if (!item || item.kind !== 'food') throw errors.rule('VALIDATION_FAILED', 'Eso no se come.');
        if (!(await inv.consumeItem(c, userId, itemId, 1))) throw errors.rule('INSUFFICIENT_MATERIALS', `No tienes ${item.name.toLowerCase()}.`, { missing: [itemId] });
        const user = (await findUser(c, userId))!;
        const day = localTime(deps.now(), user.timezone).day;
        const boost = item.effect.boost ?? {};
        await petRepo.bumpDaily(c, userId, day, { hp: boost.hp ?? 0, mp: boost.mp ?? 0, sta: boost.sta ?? 0, cure: item.effect.cure ?? [] });
        await petRepo.applyProgress(c, userId, { xp: 0, skillPoints: 0, empathyDelta: 2 });
        const rev = await bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }, { entity: 'inventory', id: itemId, op: 'upsert' }]);
        return { status: 200, body: { fed: itemId, rev } };
      });
      await published(userId, (res.body as { rev: number }).rev);
      return { ...res.body, pet: await snapshot(userId) };
    },

    async equip(userId: string, slot: string, itemId: string | null) {
      const rev = await deps.db.tx(async (c: pg.PoolClient) => {
        if (itemId) {
          const item = (await inv.itemsById(c, [itemId])).get(itemId);
          if (!item || item.slot !== slot) throw errors.rule('VALIDATION_FAILED', 'Esa pieza no va en esa ranura.');
          const owned = await inv.lockQuantities(c, userId, [itemId]);
          if (!(owned.get(itemId)! > 0)) throw errors.rule('INSUFFICIENT_MATERIALS', 'Todavía no tienes esa pieza.', { missing: [itemId] });
        }
        await inv.setEquipment(c, userId, slot, itemId);
        return bumpRev(c, userId, [{ entity: 'equipment', id: slot, op: itemId ? 'upsert' : 'delete' }]);
      });
      await published(userId, rev);
      return { slot, itemId, rev };
    },

    // La zona horaria decide cuándo duerme. Cambiarla tiene enfriamiento para que no se use para hacer trampa.
    async setTimezone(userId: string, tz: string) {
      if (!isValidTimeZone(tz)) throw errors.validation([{ path: 'timezone', message: 'Zona horaria desconocida' }]);
      const user = (await findUser(deps.db.pool, userId))!;
      if (user.timezone === tz) return { timezone: tz };
      const since = user.tz_changed_at ? deps.now().getTime() - user.tz_changed_at.getTime() : Infinity;
      if (since < TZ_COOLDOWN_MS) {
        const left = Math.ceil((TZ_COOLDOWN_MS - since) / 1000);
        throw new AppError(422, 'TIMEZONE_COOLDOWN', 'Solo puedes cambiar la zona horaria una vez al día.', { secondsLeft: left }, left);
      }
      const rev = await deps.db.tx(async c => { await setTimezone(c, userId, tz); return bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }]); });
      await published(userId, rev);
      return { timezone: tz };
    },

    // Responder a sus preguntas (invitaciones a conectar): el tono mueve la empatía. Límite diario anti-abuso.
    async interact(userId: string, tone: 'warm' | 'ok' | 'cold') {
      // Dormido no conversa: se valida en el servidor, no en el cliente.
      if ((await snapshot(userId)).sleeping) throw errors.rule('PET_ASLEEP', 'Mochi está durmiendo. Conversen cuando despierte.');
      const day = new Date(deps.now()).toISOString().slice(0, 10);
      const { count } = await deps.cache.incrFixed(`pet:talk:${userId}:${day}`, 86_400);
      if (count > 30) throw errors.rateLimited(3600);
      const delta = tone === 'warm' ? 3 : tone === 'ok' ? 1 : -2;
      const rev = await deps.db.tx(async c => {
        await petRepo.applyProgress(c, userId, { xp: 0, skillPoints: 0, empathyDelta: delta });
        if (tone === 'warm' && count <= 5) await inv.addItem(c, userId, ['manzanilla', 'menta', 'miel'][count % 3]!, 1);
        return bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }, ...(tone === 'warm' && count <= 5 ? [{ entity: 'inventory' as const, id: 'hierbas', op: 'upsert' as const }] : [])]);
      });
      await published(userId, rev);
      return { empathyDelta: delta, pet: await snapshot(userId) };
    }
  };
}
export type PetService = ReturnType<typeof petService>;
