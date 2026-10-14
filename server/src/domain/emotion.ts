// Estado emocional del aprendiz y su efecto sobre lo que aprende.
// La inteligencia emocional funciona como MULTIPLICADOR DE EFICIENCIA de lo técnico:
// con mucha frustración, poca energía o en agotamiento, la misma práctica rinde menos.
// Como el resto del compañero, se guarda como anclas y se calcula según el tiempo transcurrido.
import { norm, type AttrId, type Attempt } from './learning.js';

export interface EmotionState {
  frustration: number;          // 0–100
  stamina: number;              // 0–100: energía emocional para esforzarse
  burnoutSince: Date | null;
  abandons: Date[];             // abandonos recientes (máx. 5)
  lastFailAt: Date | null;
  updatedAt: Date;
}
export const freshEmotion = (now: Date): EmotionState => ({ frustration: 0, stamina: 100, burnoutSince: null, abandons: [], lastFailAt: null, updatedAt: now });

type Levels = Partial<Record<AttrId, number>>;
const lv = (a: Levels, id: AttrId) => norm(a[id] ?? 1);

// Con el paso del tiempo la frustración baja (más rápido con resiliencia) y la energía se recupera.
// Una noche de por medio (cambió el día local) recupera la energía hasta su tope.
export function settle(s: EmotionState, now: Date, ctx: { attrs: Levels; staminaCap: number; dayChanged: boolean }) {
  const hours = Math.max(0, (now.getTime() - s.updatedAt.getTime()) / 3_600_000);
  const halfLife = 6 - 3 * lv(ctx.attrs, 'resiliencia');                       // 6 h → 3 h
  const frustration = s.frustration * Math.pow(0.5, hours / halfLife);
  const stamina = ctx.dayChanged ? ctx.staminaCap : Math.min(ctx.staminaCap, s.stamina + 12 * hours);
  let burnoutSince = s.burnoutSince, recovered = false;
  if (burnoutSince && stamina >= 60 && frustration < 30 && (ctx.dayChanged || now.getTime() - burnoutSince.getTime() >= 8 * 3_600_000)) {
    burnoutSince = null; recovered = true;
  }
  const abandons = s.abandons.filter(t => now.getTime() - t.getTime() < 2 * 3_600_000);
  return { state: { ...s, frustration, stamina, burnoutSince, abandons, updatedAt: now }, recovered };
}

// Multiplicador de eficiencia para lo técnico. 1 = normal. En agotamiento, 0,25.
export function efficiency(s: EmotionState, attrs: Levels, sleepEffects: string[] = []) {
  if (s.burnoutSince) return { value: 0.25, reasons: ['agotamiento'] };
  const reasons: string[] = [];
  const tol = lv(attrs, 'tolerancia_frustracion');
  const felt = s.frustration * (1 - 0.6 * tol);                          // la tolerancia amortigua lo que se siente
  const fFrus = Math.max(0.55, 1 - 0.006 * Math.max(0, felt - 30));
  if (fFrus < 0.95) reasons.push('frustración');
  const fSta = s.stamina >= 40 ? 1 : 0.45 + s.stamina / 72.7;
  if (fSta < 0.95) reasons.push('poca energía');
  const fSkill = 1 + 0.12 * lv(attrs, 'enfoque') + 0.08 * lv(attrs, 'metacognicion');
  let fSleep = 1;
  if (sleepEffects.includes('nublado')) { fSleep *= 0.85; reasons.push('cabeza nublada'); }
  if (sleepEffects.includes('agotado')) { fSleep *= 0.8; reasons.push('durmió muy mal'); }
  if (sleepEffects.includes('descansado')) fSleep *= 1.05;
  const value = Math.min(1.25, Math.max(0.25, fFrus * fSta * fSkill * fSleep));
  return { value: Math.round(value * 100) / 100, reasons };
}

// Qué le hace un intento al estado emocional, y cuánto crece la parte emocional por enfrentarlo.
export interface EmotionalOutcome {
  state: EmotionState;
  enteredBurnout: boolean;
  retriedAfterFail: boolean;
  emotionalGains: Partial<Record<AttrId, number>>;   // puntos para los atributos emocionales
}
export function applyAttempt(s: EmotionState, a: Attempt & { predictedDifficulty?: number }, attrs: Levels, now: Date): EmotionalOutcome {
  const tol = lv(attrs, 'tolerancia_frustracion');
  const cost = Math.min(40, a.durationMin * 0.6 * (a.difficulty / 5));
  let frustration = s.frustration, abandons = [...s.abandons];
  const retriedAfterFail = !!s.lastFailAt && now.getTime() - s.lastFailAt.getTime() < 2 * 3_600_000 && a.outcome !== 'abandon';
  if (a.outcome === 'success') frustration -= 6 + (retriedAfterFail ? 6 : 0);
  if (a.outcome === 'fail') frustration += 8 * (1 - 0.5 * tol);
  if (a.outcome === 'abandon') { frustration += 15 * (1 - 0.5 * tol); abandons = [...abandons, now].slice(-5); }
  frustration = Math.min(100, Math.max(0, frustration));
  const stamina = Math.max(0, s.stamina - cost);
  const recentAbandons = abandons.filter(t => now.getTime() - t.getTime() < 2 * 3_600_000).length;
  const enter = !s.burnoutSince && ((stamina < 15 && frustration > 60) || recentAbandons >= 3);

  // Lo emocional crece al atravesar la dificultad, no al evitarla.
  const g: Partial<Record<AttrId, number>> = {};
  if (retriedAfterFail) g.tolerancia_frustracion = 6;                 // falló y volvió a intentar
  else if (a.outcome === 'fail') g.tolerancia_frustracion = 2;         // se quedó con el error
  if (a.outcome !== 'abandon' && a.durationMin >= 25 && a.durationMin <= 60) g.enfoque = 4;  // sesión enfocada razonable
  if (a.reflected) g.metacognicion = 3;
  if (a.predictedDifficulty) {
    const err = Math.abs(a.predictedDifficulty - a.difficulty);       // calibración: ¿supo cuánto le iba a costar?
    g.metacognicion = (g.metacognicion ?? 0) + Math.max(0, 3 - err);
  }
  return {
    state: { ...s, frustration, stamina, abandons, burnoutSince: enter ? now : s.burnoutSince, lastFailAt: a.outcome === 'success' ? null : now, updatedAt: now },
    enteredBurnout: enter, retriedAfterFail, emotionalGains: g
  };
}

// Descansar también es parte de aprender: baja la frustración y devuelve energía.
export function rest(s: EmotionState, minutes: number, cap: number, now: Date): EmotionState {
  return { ...s, frustration: Math.max(0, s.frustration - Math.min(25, minutes)), stamina: Math.min(cap, s.stamina + Math.min(30, minutes * 1.5)), updatedAt: now };
}
