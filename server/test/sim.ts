import { addPractice, applyForgetting, applyNightConsolidation, freshProficiency, practiceGain, type Proficiency } from '../src/domain/learning.js';

const DAY = 86_400_000;
const t0 = new Date('2026-01-01T10:00:00Z');
const dayStr = (d: Date) => d.toISOString().slice(0, 10);
// Simula: en ciertos días hace N intentos exitosos de 25 min con la dificultad ideal para su nivel.
export function simulate(schedule: (day: number) => number, days: number, opts: { wakes?: number; efficiency?: number } = {}) {
  let p: Proficiency = freshProficiency();
  for (let d = 0; d < days; d++) {
    const date = new Date(t0.getTime() + d * DAY);
    p = applyNightConsolidation('skill', p, dayStr(date), opts.wakes ?? 0);
    p = applyForgetting('skill', p, date);
    for (let i = 0; i < schedule(d); i++) {
      const at = new Date(date.getTime() + i * 30 * 60_000);
      const target = Math.round(1 + (p.level - 1) * 0.6 + 1);
      const g = practiceGain({ attempt: { outcome: 'success', difficulty: Math.min(10, target), durationMin: 25, reflected: false }, proficiency: p, efficiency: opts.efficiency ?? 1, now: at });
      p = addPractice('skill', p, g.points, at, dayStr(at));
    }
  }
  return p;
}
if (process.argv[1]?.endsWith('sim.ts')) {
  // 1) ¿Cuántos días de práctica constante (3 intentos/día) para llegar a cada nivel?
  const reach: Record<number, number> = {};
  for (let d = 1; d <= 1500 && Object.keys(reach).length < 6; d++) {
    const lvl = simulate(() => 3, d).level;
    for (const L of [3, 5, 8, 12, 16]) if (lvl >= L && !reach[L]) reach[L] = d;
  }
  console.log('Días con 3 intentos diarios para llegar a nivel:', reach);
  // 2) Mismo total de intentos (40): todo en un día vs repartido en 8 días; luego 30 días sin practicar.
  const massed = simulate(d => (d === 0 ? 40 : 0), 31);
  const spaced = simulate(d => (d < 8 ? 5 : 0), 39);
  const fmt = (p: Proficiency) => `nivel ${p.level} (consolidado ${p.consolidatedLevel}) + ${p.progress.toFixed(0)} pts, estabilidad ${p.stabilityDays.toFixed(1)} d`;
  console.log('40 intentos en 1 día   → 30 días después:', fmt(massed));
  console.log('40 intentos en 8 días  → 30 días después:', fmt(spaced));
  // 3) Dormir mal todas las noches (6 despertares) vs dormir bien, 20 días con 3 intentos.
  console.log('Durmiendo bien 20 días:', fmt(simulate(() => 3, 20)), '| durmiendo fatal:', fmt(simulate(() => 3, 20, { wakes: 6 })));
  console.log('Con frustración (eficiencia 0,6) 20 días:', fmt(simulate(() => 3, 20, { efficiency: 0.6 })));
}
