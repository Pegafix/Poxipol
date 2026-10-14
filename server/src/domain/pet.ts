// Reglas del compañero como funciones puras: misma entrada, misma salida, sin base de datos ni reloj implícito.
// El estado vivo se DERIVA de anclas guardadas (última actividad, contadores del día, despertares) y de la hora
// del servidor. Por eso no hay "ticks": leer es calcular, y escribir solo pasa cuando el usuario hace algo.
import { addDays, daysBetween, localTime, minutesUntilHour, nightKey, type LocalTime } from './time.js';

export type Phase = 'sleep' | 'waking' | 'peak' | 'dip' | 'peak2' | 'calm' | 'winddown';
export type Effect = 'descansado' | 'ojeras' | 'nublado' | 'malhumor' | 'lento' | 'agotado';
export type Mood = 'neutral' | 'sparkle' | 'drowsy' | 'sad' | 'apathetic' | 'sleep';

export const EFFECT_INFO: Record<Effect, { good: boolean; text: string }> = {
  descansado: { good: true, text: '+1 de energía por tarea y más ánimo.' },
  ojeras: { good: false, text: 'La estamina no pasa de 70 hoy.' },
  nublado: { good: false, text: 'El maná sube a la mitad hoy.' },
  malhumor: { good: false, text: 'Las misiones diarias dan 5 menos hoy.' },
  lento: { good: false, text: '2 de energía menos por tarea hoy.' },
  agotado: { good: false, text: 'Apático y con poca paciencia (lo despertaron 6 veces).' }
};

// ─── Anclas que vienen de la base de datos ───
export interface PetAnchors {
  xpTotal: number;
  empathy: number;
  lastActivityAt: Date | null;
  streakDays: number;
  streakDay: string | null;
}
export interface DailyCounters {
  tasksDone: number;
  learnActions: number;
  effects: Effect[] | null;   // null = todavía no se sortean hoy
  cured: Effect[];
  boostHp: number; boostMp: number; boostSta: number;
}
export const EMPTY_DAY: DailyCounters = { tasksDone: 0, learnActions: 0, effects: null, cured: [], boostHp: 0, boostMp: 0, boostSta: 0 };

// ─── Ritmo circadiano (respeta el sueño: duerme de 23 a 7) ───
const PHASES: { from: number; to: number; phase: Phase; alert: number }[] = [
  { from: 7, to: 9, phase: 'waking', alert: 0.45 },
  { from: 9, to: 13, phase: 'peak', alert: 1 },
  { from: 13, to: 15, phase: 'dip', alert: 0.55 },
  { from: 15, to: 19, phase: 'peak2', alert: 0.9 },
  { from: 19, to: 21, phase: 'calm', alert: 0.6 },
  { from: 21, to: 23, phase: 'winddown', alert: 0.3 }
];
export function circadian(t: LocalTime): { phase: Phase; alert: number; minutesToChange: number } {
  const p = PHASES.find(x => t.hour >= x.from && t.hour < x.to);
  if (!p) return { phase: 'sleep', alert: 0, minutesToChange: minutesUntilHour(t, 7) };
  return { phase: p.phase, alert: p.alert, minutesToChange: minutesUntilHour(t, p.to) };
}

// ─── Progresión ───
export const xpForLevel = (L: number) => Math.round(60 * Math.pow(L, 1.5));
export function levelOf(xp: number) {
  let L = 1, rest = xp, need = xpForLevel(1);
  while (rest >= need) { rest -= need; L++; need = xpForLevel(L); }
  return { level: L, into: rest, need, pct: Math.floor((rest / need) * 100) };
}
const STAGES = [[1, 'Semilla'], [2, 'Bolita'], [4, 'Pompón'], [6, 'Nube'], [9, 'Luna'], [12, 'Estrella']] as const;
export const stageOf = (level: number) => [...STAGES].reverse().find(([min]) => level >= min)![1];
const TIERS = [[0, 'Reservado'], [20, 'Tímido'], [40, 'Amigable'], [60, 'Cercano'], [80, 'Confidente']] as const;
export const tierOf = (emp: number) => [...TIERS].reverse().find(([min]) => emp >= min)![1];

// ─── Efectos del día según cómo durmió (sorteo determinista: recargar no cambia la suerte) ───
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rollEffects(day: string, wakes: number, seedSalt: string): Effect[] {
  if (wakes <= 0) return ['descansado'];
  let seed = hash(`${seedSalt}:${day}:${wakes}`);
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0), seed / 4294967296);
  const p = Math.min(0.9, 0.25 * wakes);
  let list = (['ojeras', 'nublado', 'malhumor', 'lento'] as Effect[]).filter(() => rnd() < p);
  if (!list.length && wakes >= 3) list = ['ojeras'];
  list = list.slice(0, 3);
  if (wakes >= 6) list = ['agotado' as Effect, ...list.slice(0, 2)];
  return list;
}

// ─── Instantánea completa: lo único que un cliente necesita para dibujar la pantalla ───
export interface PetSnapshot {
  serverTime: string;
  validUntil: string;          // el cliente no necesita volver a pedir antes de esto si nada cambia
  local: LocalTime;
  phase: Phase;
  sleeping: boolean;
  alert: number;
  mood: Mood;
  vitals: { hp: number; mp: number; sta: number; empathy: number };
  effects: { id: Effect; good: boolean; text: string }[];
  ojeras: number;              // intensidad 0–3 para dibujar
  level: { level: number; into: number; need: number; pct: number; stage: string };
  tier: string;
  streakDays: number;
}

export function computeSnapshot(a: PetAnchors, today: DailyCounters, now: Date, tz: string): PetSnapshot {
  const t = localTime(now, tz);
  const c = circadian(t);
  const asleepHours = c.phase === 'sleep';
  const effects = asleepHours ? [] : (today.effects ?? []).filter(e => !today.cured.includes(e));
  const has = (e: Effect) => effects.includes(e);
  const bad = effects.filter(e => !EFFECT_INFO[e].good).length;

  // HP: constancia. Baja 25 por cada día sin avanzar (contando desde el día siguiente).
  const lastDay = a.lastActivityAt ? localTime(a.lastActivityAt, tz).day : null;
  const idle = lastDay ? Math.max(0, daysBetween(lastDay, t.day)) : 0;
  const hp = Math.min(100, Math.max(5, 100 - Math.max(0, idle - 1) * 25) + today.boostHp);
  // MP: aprendizaje del día. STA: trabajo del día.
  const mp = Math.min(100, today.learnActions * (has('nublado') ? 12.5 : 25) + today.boostMp);
  const sta = Math.min(has('ojeras') ? 70 : 100, today.tasksDone * 20 + today.boostSta);

  let alert = c.alert;
  if (hp <= 25) alert *= 0.5;
  if (sta >= 80 && t.hour >= 17) alert *= 0.75;
  if (has('lento')) alert *= 0.85;
  if (has('agotado')) alert *= 0.7;
  if (has('descansado')) alert = Math.min(1, alert + 0.1);
  if (mp >= 50 && !asleepHours) alert = Math.min(1, alert + 0.1);

  const sleeping = asleepHours || hp <= 15;
  const mood: Mood = sleeping ? 'sleep' : has('agotado') ? 'apathetic' : hp <= 25 ? 'sad'
    : alert < 0.5 ? 'drowsy' : alert >= 0.9 && mp >= 50 ? 'sparkle' : 'neutral';

  // Cuándo cambia el estado por sí solo: próximo cambio de fase o medianoche (HP).
  const toMidnight = Math.max(1, Math.round((24 - t.hour) * 60));
  const minutes = Math.min(c.minutesToChange, toMidnight);
  const lv = levelOf(a.xpTotal);
  const streakAlive = a.streakDay && (a.streakDay === t.day || a.streakDay === addDays(t.day, -1));

  return {
    serverTime: now.toISOString(),
    validUntil: new Date(now.getTime() + minutes * 60_000).toISOString(),
    local: t,
    phase: c.phase,
    sleeping,
    alert: Math.round(alert * 100) / 100,
    mood,
    vitals: { hp, mp: Math.round(mp), sta, empathy: Math.round(a.empathy) },
    effects: effects.map(id => ({ id, ...EFFECT_INFO[id] })),
    ojeras: Math.min(3, bad),
    level: { ...lv, stage: stageOf(lv.level) },
    tier: tierOf(a.empathy),
    streakDays: streakAlive ? a.streakDays : 0
  };
}

// ─── Tocarlo: la paciencia decide la reacción. Despierto: ternura → broma → límite → pausa. ───
export type PokeReaction = 'cute' | 'playful' | 'limit' | 'pause';
export function pokeReaction(pokesInWindow: number, empathy: number, drained: boolean): PokeReaction {
  const patience = (10 + empathy / 8) * (drained ? 0.6 : 1); // de 10 a 22 toques en 45 s
  const a = pokesInWindow / patience;
  return a < 0.4 ? 'cute' : a < 0.65 ? 'playful' : a < 0.9 ? 'limit' : 'pause';
}
export type WakeReaction = 'groggy' | 'sleepy_again' | 'gentle_limit' | 'angry';
export const wakeReaction = (wakesTonight: number): WakeReaction =>
  wakesTonight >= 6 ? 'angry' : wakesTonight >= 4 ? 'gentle_limit' : wakesTonight >= 2 ? 'sleepy_again' : 'groggy';

// ─── Energía por completar una tarea (el servidor la calcula; el cliente solo la muestra) ───
export interface TaskXpInput {
  tag: string;
  recentCompletions: number;   // completadas en los últimos 20 minutos
  firstToday: boolean;
  streakDays: number;
  effects: Effect[];
  perkBonus: number;           // bono del equipo puesto
}
export function taskXp(i: TaskXpInput): { xp: number; multiplier: number } {
  const multiplier = i.recentCompletions >= 4 ? 2 : i.recentCompletions >= 2 ? 1.5 : 1;
  const fx = (i.effects.includes('descansado') ? 1 : 0) - (i.effects.includes('lento') ? 2 : 0);
  let xp = Math.max(1, Math.round(((i.tag === 'PRUEBA' ? 12 : 10) + i.perkBonus + fx) * multiplier));
  if (i.firstToday) xp += 5 + 2 * Math.min(10, i.streakDays);
  return { xp, multiplier };
}

export const nextStreak = (streakDay: string | null, streakDays: number, today: string) =>
  streakDay === today ? streakDays : streakDay === addDays(today, -1) ? streakDays + 1 : 1;

export { nightKey, localTime };
