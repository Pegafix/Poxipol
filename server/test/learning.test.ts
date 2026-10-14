import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyForgetting, applyNightConsolidation, challengeFactor, freshProficiency, practiceGain, skillNeed, totalPoints } from '../src/domain/learning.js';
import { applyAttempt, efficiency, freshEmotion, settle } from '../src/domain/emotion.js';
import { reactToPractice } from '../src/domain/voice.js';
import { simulate } from './sim.js';

const now = new Date('2026-03-01T10:00:00Z');
const attempt = { outcome: 'success' as const, difficulty: 2, durationMin: 25, reflected: false };

test('rendimientos decrecientes: cada nivel pide más que el anterior', () => {
  for (let l = 1; l < 16; l++) assert.ok(skillNeed(l + 1) > skillNeed(l));
  assert.ok(skillNeed(15) / skillNeed(2) > 25);   // el nivel 15 pide unas 30 veces lo del nivel 2
});

test('no es de la noche a la mañana: con 3 sesiones diarias, la maestría toma meses', () => {
  assert.ok(simulate(() => 3, 3).level >= 2, 'al principio el avance se nota');
  assert.ok(simulate(() => 3, 30).level < 8, 'un mes no alcanza para nivel 8');
  assert.ok(simulate(() => 3, 180).level >= 12 && simulate(() => 3, 180).level < 16, 'medio año: avanzado, todavía no maestro');
});

test('repartir la práctica en días gana a meterla toda en uno (efecto de espaciado)', () => {
  const massed = simulate(d => (d === 0 ? 40 : 0), 31);
  const spaced = simulate(d => (d < 8 ? 5 : 0), 39);
  assert.ok(spaced.level > massed.level);
  assert.ok(spaced.stabilityDays > massed.stabilityDays * 2);
});

test('zona de desafío: muy fácil o muy difícil rinde menos que lo justo', () => {
  const right = challengeFactor(2, 1), easy = challengeFactor(1, 8), hard = challengeFactor(10, 1);
  assert.ok(right > 0.9 && easy < 0.3 && hard < 0.3);
});

test('el error trabajado enseña; abandonar casi no deja nada', () => {
  const p = freshProficiency();
  const g = (o: 'success' | 'fail' | 'abandon', reflected = false) => practiceGain({ attempt: { ...attempt, outcome: o, reflected }, proficiency: p, efficiency: 1, now }).points;
  assert.ok(g('success') > g('fail', true) && g('fail', true) > g('fail') && g('fail') > g('abandon') && g('abandon') > 0);
});

test('olvido: baja la barra, pero nunca por debajo del nivel consolidado ni más del 35 % de lo fresco', () => {
  const p = { ...freshProficiency(), level: 5, progress: 200, consolidatedLevel: 4, lastPracticedAt: new Date(now.getTime() - 60 * 86_400_000) };
  const after = applyForgetting('skill', p, now);
  assert.ok(after.level >= 4);
  const fresh = totalPoints('skill', 5, 200) - totalPoints('skill', 4, 0);
  assert.ok(after.forgotten > 0 && after.forgotten <= fresh * 0.35 + 0.01);
  const sameDay = applyForgetting('skill', { ...p, lastPracticedAt: new Date(now.getTime() - 3600_000) }, now);
  assert.equal(sameDay.forgotten, 0);
});

test('dormir consolida: bien dormido fija el nivel; con 6 despertares no consolida nada', () => {
  const p = { ...freshProficiency(), level: 3, progress: 10, consolidatedLevel: 1, gainedDay: '2026-02-28', gainedToday: 50 };
  const good = applyNightConsolidation('skill', p, '2026-03-01', 0);
  const bad = applyNightConsolidation('skill', p, '2026-03-01', 6);
  assert.equal(good.consolidatedLevel, 3); assert.ok(good.consolidated > 0);
  assert.equal(bad.consolidatedLevel, 1); assert.equal(bad.consolidated, 0);
});

test('inteligencia emocional como multiplicador: la frustración pesa menos con tolerancia alta', () => {
  const s = { ...freshEmotion(now), frustration: 90 };
  const low = efficiency(s, { tolerancia_frustracion: 1 }).value;
  const high = efficiency(s, { tolerancia_frustracion: 80 }).value;
  assert.ok(low < 0.7 && high > low + 0.15, `${low} vs ${high}`);
  assert.equal(efficiency({ ...s, burnoutSince: now }, {}).value, 0.25);
  assert.ok(efficiency({ ...freshEmotion(now), stamina: 5 }, {}).value < 0.6, 'sin energía emocional rinde menos');
});

test('fallar y volver a intentar entrena la tolerancia; tres abandonos seguidos llevan a agotamiento', () => {
  let s = freshEmotion(now);
  s = applyAttempt(s, { ...attempt, outcome: 'fail' }, {}, now).state;
  const retry = applyAttempt(s, attempt, {}, new Date(now.getTime() + 600_000));
  assert.equal(retry.retriedAfterFail, true); assert.ok(retry.emotionalGains.tolerancia_frustracion! >= 6);
  let e = freshEmotion(now), entered = false;
  for (let i = 0; i < 3; i++) { const r = applyAttempt(e, { ...attempt, outcome: 'abandon', difficulty: 9 }, {}, new Date(now.getTime() + i * 60_000)); e = r.state; entered ||= r.enteredBurnout; }
  assert.equal(entered, true);
  const recovered = settle(e, new Date(now.getTime() + 86_400_000), { attrs: {}, staminaCap: 100, dayChanged: true });
  assert.equal(recovered.recovered, true, 'una noche de descanso saca del agotamiento');
});

test('la voz de Mochi valida antes de aconsejar y no promete atajos', () => {
  const base = { skillName: 'Química básica', levelsUp: 0, newLevel: 1, repsTotal: 1, daysPracticed: 1, enteredBurnout: false, inBurnout: false, tolerance: 0, metacognition: 0, challenge: 'hard' as const, repsToday: 1, retriedAfterFail: false, reflected: false, tier: 'Amigable', seed: 2 };
  const l = reactToPractice({ ...base, outcome: 'abandon', frustration: 70 });
  assert.match(l.text, /normal|todavía|cuesta|nadie nace/i);
  assert.ok(l.strategy);
  assert.equal(reactToPractice({ ...base, outcome: 'fail', frustration: 80, enteredBurnout: true }).key, 'burnout');
});
