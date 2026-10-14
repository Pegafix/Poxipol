import type pg from 'pg';
import { AppError, errors } from '../http/errors.js';
import {
  addPractice, applyForgetting, applyNightConsolidation, ATTR_IDS, ATTR_SHARE, ATTRIBUTES, challengeFactor, freshProficiency,
  norm, practiceGain, SCIENCE_NOTES, skillNeed, attrNeed, type Attempt, type AttrId, type Proficiency, type Track
} from '../domain/learning.js';
import { applyAttempt, efficiency, freshEmotion, rest, settle, type EmotionState } from '../domain/emotion.js';
import { personaTraits, reactToForgetting, reactToPractice } from '../domain/voice.js';
import { localTime, tierOf } from '../domain/pet.js';
import * as L from '../repos/learning.js';
import * as petRepo from '../repos/pet.js';
import { findUser } from '../repos/users.js';
import { bumpRev, type Change } from '../repos/sync.js';
import { runCommand, type Deps } from './context.js';
import type { PetService } from './pet.js';

type Prof = Proficiency & { practiceDays: number };
export interface PracticeInput extends Attempt { skill: string; predictedDifficulty?: number; reflection?: string; source?: 'manual' | 'task' | 'craft' }

// La energía emocional tiene tope más bajo si durmió mal.
const staminaCap = (effects: string[]) => effects.includes('agotado') ? 50 : effects.includes('ojeras') ? 70 : 100;

// Pone al día una barra: primero la consolidación de la noche (si cambió el día), luego el olvido.
function catchUp(t: Track, p: Prof, now: Date, today: string, wakes: number) {
  const night = applyNightConsolidation(t, p, today, wakes);
  const forgot = applyForgetting(t, night, now);
  return { prof: { ...forgot, practiceDays: p.practiceDays } as Prof, consolidated: night.consolidated, forgotten: forgot.forgotten };
}
const daysSince = (d: Date | null, now: Date) => (d ? (now.getTime() - d.getTime()) / 86_400_000 : null);

export function learningService(deps: Deps, pet: PetService) {
  async function context(c: pg.PoolClient | Deps['db']['pool'], userId: string, now: Date) {
    const user = await findUser(c, userId);
    if (!user) throw errors.notFound('ese usuario');
    const t = localTime(now, user.timezone);
    const { counters, wakes } = await petRepo.getDaily(c, userId, t.day);
    const effects = ((counters?.effects ?? []) as string[]).filter(e => !(counters?.cured ?? []).includes(e as never));
    return { tz: user.timezone, today: t.day, wakes, effects };
  }

  // Registra UN intento de práctica dentro de la transacción del llamador (práctica manual, tarea o taller).
  async function recordPractice(c: pg.PoolClient, userId: string, input: PracticeInput, changes: Change[]) {
    const now = deps.now();
    const node = await L.skillNodeForPractice(c, userId, input.skill);
    if (!node) throw errors.notFound(`la habilidad "${input.skill}"`);
    if (!node.accessible) throw errors.rule('SKILL_LOCKED', `Todavía no llegas a "${node.title}". Practica la habilidad anterior del árbol.`, { skill: input.skill });
    const ctx = await context(c, userId, now);

    // Bloqueos en orden fijo (emoción → atributos → habilidad) para que no haya interbloqueos entre dispositivos.
    const emoRow = (await L.lockEmotion(c, userId, now))!;
    const attrRows = await L.getAttributes(c, userId, true);
    const attrs = new Map<string, Prof>();
    for (const id of ATTR_IDS) attrs.set(id, catchUp('attr', (attrRows.get(id) as Prof) ?? { ...freshProficiency(), practiceDays: 0 }, now, ctx.today, ctx.wakes).prof);
    const levels = Object.fromEntries([...attrs].map(([k, v]) => [k, v.level])) as Record<AttrId, number>;

    const settled = settle(emoRow.state, now, { attrs: levels, staminaCap: staminaCap(ctx.effects), dayChanged: localTime(emoRow.state.updatedAt, ctx.tz).day !== ctx.today });
    const eff = efficiency(settled.state, levels, ctx.effects);

    const base = (await L.getSkillProgress(c, userId, node.id, true)) ?? { ...freshProficiency(), practiceDays: 0 };
    const caught = catchUp('skill', base, now, ctx.today, ctx.wakes);
    const gain = practiceGain({ attempt: input, proficiency: caught.prof, efficiency: eff.value, now });
    const firstToday = caught.prof.gainedDay !== ctx.today;
    const updated = addPractice('skill', caught.prof, gain.points, now, ctx.today);
    const skillAfter: Prof = { ...updated, practiceDays: caught.prof.practiceDays + (firstToday ? 1 : 0) };
    await L.saveSkillProgress(c, userId, node.id, skillAfter);

    // Atributos cognitivos: reciben una parte de lo practicado, según qué usa la habilidad.
    // Atributos emocionales: crecen por enfrentar la dificultad (no se reducen por la eficiencia).
    const emo = applyAttempt(settled.state, { ...input, predictedDifficulty: input.predictedDifficulty }, levels, now);
    const attrGains: Record<string, number> = {};
    for (const [a, w] of Object.entries(node.weights ?? {})) if (attrs.has(a)) attrGains[a] = (attrGains[a] ?? 0) + gain.points * ATTR_SHARE * w;
    for (const [a, g] of Object.entries(emo.emotionalGains)) attrGains[a] = (attrGains[a] ?? 0) + (g ?? 0);
    if (settled.recovered) attrGains.resiliencia = (attrGains.resiliencia ?? 0) + 10;   // volvió después de agotarse
    const attrLevelUps: Record<string, number> = {};
    for (const [a, pts] of Object.entries(attrGains)) {
      if (pts <= 0) continue;
      const before = attrs.get(a)!;
      const after = addPractice('attr', before, pts, now, ctx.today);
      attrs.set(a, { ...after, practiceDays: before.practiceDays + (before.gainedDay !== ctx.today ? 1 : 0) });
      if (after.levelsUp) attrLevelUps[a] = after.level;
      await L.saveAttribute(c, userId, a, attrs.get(a)!);
    }
    await L.saveEmotion(c, userId, emo.state);
    await L.logPractice(c, userId, node.id, { outcome: input.outcome, difficulty: input.difficulty, durationMin: input.durationMin, predictedDifficulty: input.predictedDifficulty, reflection: input.reflection, points: gain.points, efficiency: eff.value, source: input.source ?? 'manual', at: now });
    changes.push({ entity: 'skill', id: input.skill, op: 'upsert' }, { entity: 'pet', id: userId, op: 'upsert' });

    const pState = await petRepo.getPet(c, userId);
    const cf = challengeFactor(input.difficulty, caught.prof.level);
    const target = 1 + (caught.prof.level - 1) * 0.6;
    const voice = reactToPractice({
      outcome: input.outcome, skillName: node.title, levelsUp: updated.levelsUp, newLevel: updated.level, repsTotal: updated.reps,
      daysPracticed: skillAfter.practiceDays, enteredBurnout: emo.enteredBurnout, inBurnout: !!emo.state.burnoutSince,
      frustration: emo.state.frustration, tolerance: norm(levels.tolerancia_frustracion), metacognition: norm(levels.metacognicion),
      challenge: cf >= 0.6 ? 'right' : input.difficulty < target + 1 ? 'easy' : 'hard', repsToday: updated.repsToday,
      retriedAfterFail: emo.retriedAfterFail, reflected: input.reflected, tier: tierOf(pState?.empathy ?? 35), seed: updated.reps + input.difficulty
    });
    return {
      skill: { slug: input.skill, name: node.title, level: updated.level, progress: updated.progress, need: skillNeed(updated.level), consolidatedLevel: updated.consolidatedLevel, levelsUp: updated.levelsUp, repsToday: updated.repsToday },
      gain: { points: gain.points, factors: gain.factors, consolidatedOvernight: caught.consolidated, forgotten: caught.forgotten },
      attributes: Object.fromEntries(Object.entries(attrGains).filter(([, v]) => v > 0).map(([a, v]) => [a, { gained: Math.round(v * 100) / 100, level: attrs.get(a)!.level, ...(attrLevelUps[a] ? { levelUp: true } : {}) }])),
      emotion: { frustration: Math.round(emo.state.frustration), stamina: Math.round(emo.state.stamina), burnout: !!emo.state.burnoutSince, enteredBurnout: emo.enteredBurnout, efficiency: eff.value, reasons: eff.reasons },
      mochi: voice
    };
  }

  return {
    recordPractice,

    async practice(userId: string, input: PracticeInput, idemKey?: string) {
      const res = await runCommand(deps, userId, idemKey, input, async c => {
        const changes: Change[] = [];
        const out = await recordPractice(c, userId, { ...input, source: 'manual' }, changes);
        const rev = await bumpRev(c, userId, changes);
        return { status: 200, body: { ...out, rev } };
      });
      await pet.published(userId, res.body.rev);
      return res;
    },

    // Descansar es parte del método: hasta 6 pausas al día cuentan.
    async rest(userId: string, minutes: number) {
      const now = deps.now();
      const rev = await deps.db.tx(async c => {
        const ctx = await context(c, userId, now);
        const row = (await L.lockEmotion(c, userId, now))!;
        const attrs = await L.getAttributes(c, userId);
        const levels = Object.fromEntries([...attrs].map(([k, v]) => [k, v.level]));
        const count = row.restsDay === ctx.today ? row.restsToday : 0;
        if (count >= 6) throw new AppError(429, 'RATE_LIMITED', 'Ya registraste varias pausas hoy. Lo que más descansa ahora es dormir.', undefined, 3600);
        const s = settle(row.state, now, { attrs: levels, staminaCap: staminaCap(ctx.effects), dayChanged: localTime(row.state.updatedAt, ctx.tz).day !== ctx.today }).state;
        await L.saveEmotion(c, userId, rest(s, minutes, staminaCap(ctx.effects), now), { day: ctx.today, count: count + 1 });
        return bumpRev(c, userId, [{ entity: 'pet', id: userId, op: 'upsert' }]);
      });
      await pet.published(userId, rev);
      return this.character(userId);
    },

    // Perfil completo del aprendiz, con el olvido y la consolidación ya aplicados (solo lectura: no escribe).
    async character(userId: string) {
      const now = deps.now();
      const q = deps.db.pool;
      const ctx = await context(q, userId, now);
      const attrRows = await L.getAttributes(q, userId);
      const attrs = ATTRIBUTES.map(def => {
        const p = catchUp('attr', (attrRows.get(def.id) as Prof) ?? { ...freshProficiency(), practiceDays: 0 }, now, ctx.today, ctx.wakes).prof;
        return { id: def.id, group: def.group, name: def.name, level: p.level, progress: Math.round(p.progress * 10) / 10, need: attrNeed(p.level), consolidatedLevel: p.consolidatedLevel, reps: p.reps, basis: def.basis, ...('caveat' in def ? { caveat: def.caveat } : {}) };
      });
      const levels = Object.fromEntries(attrs.map(a => [a.id, a.level])) as Record<AttrId, number>;
      const emoRow = await L.getEmotion(q, userId);
      const emoState: EmotionState = emoRow ? settle(emoRow.state, now, { attrs: levels, staminaCap: staminaCap(ctx.effects), dayChanged: localTime(emoRow.state.updatedAt, ctx.tz).day !== ctx.today }).state : freshEmotion(now);
      const eff = efficiency(emoState, levels, ctx.effects);
      const skills = (await L.listSkillProgress(q, userId)).map(s => {
        const c = catchUp('skill', s.prof, now, ctx.today, ctx.wakes);
        const ds = daysSince(s.prof.lastPracticedAt, now);
        return { slug: s.slug, name: s.title, level: c.prof.level, progress: Math.round(c.prof.progress * 10) / 10, need: skillNeed(c.prof.level),
          consolidatedLevel: c.prof.consolidatedLevel, reps: c.prof.reps, practiceDays: c.prof.practiceDays, stabilityDays: c.prof.stabilityDays,
          lastPracticedAt: s.prof.lastPracticedAt, fading: c.forgotten > 0 ? { pointsLost: c.forgotten, daysSince: Math.round(ds! * 10) / 10 } : null };
      });
      const fadingMost = skills.filter(s => s.fading).sort((a, b) => b.fading!.pointsLost - a.fading!.pointsLost)[0];
      return {
        attributes: { cognitive: attrs.filter(a => a.group === 'cognitive'), emotional: attrs.filter(a => a.group === 'emotional') },
        skills,
        emotion: { frustration: Math.round(emoState.frustration), stamina: Math.round(emoState.stamina), staminaCap: staminaCap(ctx.effects), burnout: !!emoState.burnoutSince, efficiency: eff.value, reasons: eff.reasons },
        persona: { traits: personaTraits(levels) },
        mochi: emoState.burnoutSince
          ? { key: 'burnout_rest', expression: 'drowsy', text: 'Hoy toca descansar. Aprender agotado casi no deja nada; mañana vamos a rendir mucho más.', strategy: 'rest' }
          : fadingMost ? reactToForgetting(fadingMost.name, fadingMost.fading!.daysSince) : null,
        science: SCIENCE_NOTES
      };
    }
  };
}
export type LearningService = ReturnType<typeof learningService>;
