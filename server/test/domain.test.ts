import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circadian, computeSnapshot, EMPTY_DAY, levelOf, pokeReaction, rollEffects, taskXp, wakeReaction, xpForLevel } from '../src/domain/pet.js';
import { localTime, nightKey } from '../src/domain/time.js';
import { recipeKey } from '../src/domain/crafting.js';

const anchors = { xpTotal: 0, empathy: 35, lastActivityAt: null, streakDays: 0, streakDay: null };

test('la hora local la decide la zona del usuario, no el cliente', () => {
  const at = new Date('2026-10-14T05:30:00Z');
  assert.equal(localTime(at, 'America/Santiago').hour, 2.5);     // UTC-3: 02:30 → duerme
  assert.equal(localTime(at, 'Asia/Tokyo').hour, 14.5);          // 14:30 → bajón de la tarde
  assert.equal(circadian(localTime(at, 'America/Santiago')).phase, 'sleep');
  assert.equal(circadian(localTime(at, 'Asia/Tokyo')).phase, 'dip');
});

test('la noche pertenece a la mañana en que termina', () => {
  assert.equal(nightKey({ day: '2026-10-13', hour: 23.5 }), '2026-10-14');
  assert.equal(nightKey({ day: '2026-10-14', hour: 3 }), '2026-10-14');
});

test('HP baja por días sin avanzar, sin ticks: es una cuenta sobre la última actividad', () => {
  const now = new Date('2026-10-14T15:00:00Z');
  const s = (daysAgo: number) => computeSnapshot({ ...anchors, lastActivityAt: new Date(now.getTime() - daysAgo * 86_400_000) }, EMPTY_DAY, now, 'UTC').vitals.hp;
  assert.equal(s(0), 100); assert.equal(s(1), 100); assert.equal(s(2), 75); assert.equal(s(4), 25); assert.equal(s(30), 5);
});

test('la instantánea dice hasta cuándo es válida (próximo cambio de fase)', () => {
  const now = new Date('2026-10-14T10:00:00Z');
  const snap = computeSnapshot(anchors, EMPTY_DAY, now, 'UTC');
  assert.equal(snap.phase, 'peak');
  assert.equal(snap.validUntil, '2026-10-14T13:00:00.000Z');
});

test('los efectos de dormir mal son deterministas y escalan con los despertares', () => {
  assert.deepEqual(rollEffects('2026-10-14', 0, 'u1'), ['descansado']);
  assert.deepEqual(rollEffects('2026-10-14', 3, 'u1'), rollEffects('2026-10-14', 3, 'u1'));
  assert.equal(rollEffects('2026-10-14', 6, 'u1')[0], 'agotado');
  assert.ok(rollEffects('2026-10-14', 3, 'u1').length >= 1);
});

test('ojeras limita la estamina y agotado lo vuelve apático', () => {
  const now = new Date('2026-10-14T10:00:00Z');
  const s = computeSnapshot({ ...anchors, lastActivityAt: now }, { ...EMPTY_DAY, tasksDone: 9, effects: ['agotado', 'ojeras'] }, now, 'UTC');
  assert.equal(s.vitals.sta, 70);
  assert.equal(s.mood, 'apathetic');
  assert.equal(s.ojeras, 2);
});

test('cuesta que se moleste: la paciencia crece con la empatía', () => {
  assert.equal(pokeReaction(3, 35, false), 'cute');
  assert.equal(pokeReaction(12, 35, false), 'limit');   // paciencia ≈ 14 toques con empatía 35
  assert.equal(pokeReaction(14, 35, false), 'pause');
  assert.equal(pokeReaction(14, 95, false), 'playful'); // con mucha confianza aguanta bastante más
  assert.equal(pokeReaction(6, 35, true), 'limit');     // agotado: menos paciencia
  assert.equal(wakeReaction(1), 'groggy'); assert.equal(wakeReaction(5), 'gentle_limit'); assert.equal(wakeReaction(6), 'angry');
});

test('energía por tarea: combo, primera del día, racha y efectos', () => {
  assert.deepEqual(taskXp({ tag: 'UNITY', recentCompletions: 0, firstToday: false, streakDays: 0, effects: [], perkBonus: 0 }), { xp: 10, multiplier: 1 });
  assert.equal(taskXp({ tag: 'PRUEBA', recentCompletions: 4, firstToday: false, streakDays: 0, effects: [], perkBonus: 0 }).xp, 24);
  assert.equal(taskXp({ tag: 'UNITY', recentCompletions: 0, firstToday: true, streakDays: 3, effects: ['lento'], perkBonus: 2 }).xp, 10 + 5 + 6);
});

test('curva de niveles empinada', () => {
  assert.deepEqual([1, 2, 3, 4].map(xpForLevel), [60, 170, 312, 480]);
  assert.equal(levelOf(59).level, 1); assert.equal(levelOf(60).level, 2); assert.equal(levelOf(230).level, 3);
});

test('la clave de receta no depende del orden en que se echan los materiales', () => {
  assert.equal(recipeKey(['estano', 'cobre'], 'fundir'), 'cobre+estano|fundir');
  assert.equal(recipeKey(['levadura', 'agua', 'harina'], 'hornear'), recipeKey(['harina', 'levadura', 'agua'], 'hornear'));
});
