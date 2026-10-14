// Progresión por práctica, estilo Final Fantasy II: nada sube por "EXP general".
// Una habilidad sube SOLO al usarla, y los atributos suben solo por las habilidades que los ejercitan.
// Cada número de este archivo está pensado para contar una verdad incómoda: aprender lleva tiempo,
// se aprende mejor repartido en días que todo de una vez, los errores también enseñan
// y lo que no se usa se va borrando (aunque lo bien consolidado no se pierde).

// ───────────────────────────── Atributos ─────────────────────────────
export type AttrGroup = 'cognitive' | 'emotional';
export interface AttributeDef { id: AttrId; group: AttrGroup; name: string; basis: string; caveat?: string }

export const ATTRIBUTES = [
  // Técnicos / cognitivos
  { id: 'logica', group: 'cognitive', name: 'Razonamiento lógico',
    basis: 'Razonamiento fluido y solución de problemas. Mejora con práctica en un dominio concreto: el experto razona mejor en lo suyo.',
    caveat: 'Los "juegos de entrenamiento cerebral" casi no transfieren a otros dominios (Sala y Gobet, 2017). Aquí solo sube practicando cosas reales.' },
  { id: 'memoria_trabajo', group: 'cognitive', name: 'Memoria de trabajo',
    basis: 'La "pizarra mental" de pocos elementos (modelo de Baddeley y Hitch). Su capacidad bruta casi no cambia; lo que crece es cuánto cabe en cada elemento: los expertos agrupan información en bloques (chunking, Chase y Simon).',
    caveat: 'Entrenarla aislada transfiere poco (Melby-Lervåg y Hulme, 2013). Por eso es el atributo que sube más lento.' },
  { id: 'agilidad_manual', group: 'cognitive', name: 'Agilidad manual',
    basis: 'Aprendizaje motor: mejora rápido al principio y cada vez más lento (ley potencial de la práctica, Newell y Rosenbloom). Se consolida durmiendo (Walker y colaboradores).' },
  { id: 'analisis_critico', group: 'cognitive', name: 'Análisis crítico',
    basis: 'Evaluar evidencia y argumentos. Mejora con práctica explícita y retroalimentación (metaanálisis de Abrami y colaboradores, 2015).' },
  // Emocionales / autorregulación
  { id: 'tolerancia_frustracion', group: 'emotional', name: 'Tolerancia a la frustración',
    basis: 'Capacidad de seguir ante el error sin abandonar (tolerancia al malestar, Linehan). Se entrena justamente fallando y volviendo a intentar.' },
  { id: 'resiliencia', group: 'emotional', name: 'Resiliencia',
    basis: 'Recuperarse después de un mal momento. Es común y se construye con recursos cotidianos: "magia ordinaria" (Masten). Aquí crece al volver después de una racha rota o de un agotamiento.' },
  { id: 'empatia', group: 'emotional', name: 'Empatía',
    basis: 'Uno de los pilares de la inteligencia emocional (Goleman). Se refleja en cómo tratas a Mochi y a la comunidad.' },
  { id: 'enfoque', group: 'emotional', name: 'Enfoque / atención sostenida',
    basis: 'La atención sostenida decae con el tiempo (decremento de vigilancia, Mackworth). Pausas breves ayudan a mantenerla (Ariga y Lleras, 2011). Sube con sesiones enfocadas de 25 a 50 minutos.' },
  { id: 'metacognicion', group: 'emotional', name: 'Metacognición',
    basis: 'Pensar sobre cómo aprendes y saber cuánto sabes (Flavell, 1979; aprendizaje autorregulado, Zimmerman). Sube al reflexionar y al calibrar: predecir la dificultad y comparar con lo que pasó.' }
] as const satisfies readonly { id: string; group: AttrGroup; name: string; basis: string; caveat?: string }[];
export type AttrId = (typeof ATTRIBUTES)[number]['id'];
export const ATTR_IDS = ATTRIBUTES.map(a => a.id) as AttrId[];

// Marco de toda la mecánica, con sus matices.
export const SCIENCE_NOTES = {
  practicaDeliberada: 'Ericsson (1993): la práctica deliberada, con metas concretas, retroalimentación y en el borde de lo que puedes, es lo que más mejora el desempeño. Un metaanálisis (Macnamara, 2014) muestra que la práctica explica una parte importante, pero no toda, de las diferencias entre personas.',
  menteCrecimiento: 'Dweck: creer que la habilidad se desarrolla favorece persistir. Los efectos medidos son reales pero modestos (Sisk, 2018; Yeager, 2019). Aquí no se "premia creer": se premia volver a intentar.',
  olvido: 'Ebbinghaus (1885): lo aprendido se olvida rápido al principio y más lento después. Repasar espaciado aumenta la estabilidad del recuerdo (Cepeda, 2006).',
  dificultadDeseable: 'Bjork: cierta dificultad (recordar, equivocarse, espaciar) hace más lento el avance de hoy pero más durable el aprendizaje. Los errores trabajados también enseñan (fracaso productivo, Kapur).',
  sueno: 'El sueño consolida lo practicado en el día, tanto memoria como habilidades motoras (Diekelmann y Born, 2010). Dormir mal reduce esa consolidación.',
  agotamiento: 'Maslach: el agotamiento (burnout) aparece con esfuerzo sostenido sin recuperación. En ese estado aprender rinde muy poco, y lo sensato es descansar.'
};

// ───────────────────────────── Curvas de nivel ─────────────────────────────
// Habilidades 1–16 y atributos 1–99, como en Final Fantasy II. Rendimientos decrecientes:
// cada nivel pide bastante más práctica que el anterior.
export const SKILL_MAX = 16;
export const ATTR_MAX = 99;
export const skillNeed = (level: number) => Math.round(20 * Math.pow(level, 1.7));    // 20, 65, 129, 211, 308, …
export const attrNeed = (level: number) => Math.round(30 * Math.pow(level, 1.35));    // 30, 76, 132, 195, …
export type Track = 'skill' | 'attr';
const need = (t: Track, l: number) => (t === 'skill' ? skillNeed(l) : attrNeed(l));
const maxOf = (t: Track) => (t === 'skill' ? SKILL_MAX : ATTR_MAX);

// Puntos totales acumulados para estar en (level, progress).
export function totalPoints(t: Track, level: number, progress: number) {
  let s = progress;
  for (let l = 1; l < level; l++) s += need(t, l);
  return s;
}
export function fromTotal(t: Track, total: number) {
  let level = 1, rest = Math.max(0, total);
  while (level < maxOf(t) && rest >= need(t, level)) { rest -= need(t, level); level++; }
  return { level, progress: level === maxOf(t) ? Math.min(rest, need(t, level)) : rest };
}

// ───────────────────────────── Estado de una barra ─────────────────────────────
export interface Proficiency {
  level: number;
  progress: number;               // puntos dentro del nivel actual
  consolidatedLevel: number;      // nivel que ya "pasó una noche": el olvido nunca baja de aquí
  stabilityDays: number;          // estabilidad del recuerdo (S en la curva del olvido)
  lastPracticedAt: Date | null;
  gainedDay: string | null;       // día local del último avance (para consolidar al dormir)
  gainedToday: number;
  repsToday: number;              // repeticiones del día (práctica masiva rinde menos)
  reps: number;
}
export const freshProficiency = (): Proficiency => ({ level: 1, progress: 0, consolidatedLevel: 1, stabilityDays: 2, lastPracticedAt: null, gainedDay: null, gainedToday: 0, repsToday: 0, reps: 0 });

// Curva del olvido: retención R = e^(−t/S). Solo se pierde parte de lo NO consolidado,
// como máximo el 35 %: la barra baja "un poco", nunca vuelve a cero.
export const MAX_FORGET = 0.35;
export function retention(daysSince: number, stabilityDays: number) {
  return Math.exp(-Math.max(0, daysSince) / Math.max(0.5, stabilityDays));
}
export function applyForgetting(t: Track, p: Proficiency, now: Date): Proficiency & { forgotten: number } {
  if (!p.lastPracticedAt) return { ...p, forgotten: 0 };
  const days = (now.getTime() - p.lastPracticedAt.getTime()) / 86_400_000;
  if (days < 1) return { ...p, forgotten: 0 };            // el mismo día no se olvida
  const floor = totalPoints(t, p.consolidatedLevel, 0);
  const total = totalPoints(t, p.level, p.progress);
  const fresh = Math.max(0, total - floor);
  const lost = fresh * MAX_FORGET * (1 - retention(days - 1, p.stabilityDays));
  const after = fromTotal(t, total - lost);
  return { ...p, level: Math.max(after.level, p.consolidatedLevel), progress: after.level < p.consolidatedLevel ? 0 : after.progress, forgotten: Math.round(lost * 10) / 10 };
}

// Dormir consolida lo del día: los niveles alcanzados pasan a ser base y lo practicado gana un poco.
// Con noches interrumpidas se consolida menos; con 6 despertares, nada.
export function consolidationRate(wakes: number) {
  return wakes <= 0 ? 0.15 : wakes <= 2 ? 0.08 : wakes < 6 ? 0.03 : 0;
}
export function applyNightConsolidation(t: Track, p: Proficiency, today: string, wakesLastNight: number): Proficiency & { consolidated: number } {
  if (!p.gainedDay || p.gainedDay >= today) return { ...p, consolidated: 0 };
  const rate = consolidationRate(wakesLastNight);
  const bonus = p.gainedToday * rate;
  const after = fromTotal(t, totalPoints(t, p.level, p.progress) + bonus);
  return {
    ...p, level: after.level, progress: after.progress,
    consolidatedLevel: rate > 0 ? Math.max(p.consolidatedLevel, after.level) : p.consolidatedLevel,
    gainedDay: null, gainedToday: 0, repsToday: 0,
    consolidated: Math.round(bonus * 10) / 10
  };
}

// ───────────────────────────── Ganancia por intento ─────────────────────────────
export type Outcome = 'success' | 'fail' | 'abandon';
export interface Attempt {
  outcome: Outcome;
  difficulty: number;       // 1–10, dificultad del intento
  durationMin: number;      // 1–240
  reflected: boolean;       // escribió qué aprendió / qué lo trabó
}

// El error trabajado enseña; abandonar casi no deja nada. (Fracaso productivo, Kapur.)
export const OUTCOME_FACTOR: Record<Outcome, number> = { success: 1, fail: 0.55, abandon: 0.1 };

// Zona de desafío: se aprende más cerca del borde de lo que puedes (práctica deliberada).
// Muy fácil o muy difícil rinde poco. El óptimo está un poco por encima de tu nivel.
export function challengeFactor(difficulty: number, level: number) {
  const target = Math.min(10, 1 + (level - 1) * 0.6);        // nivel 1 ≈ dificultad 1–2; nivel 16 ≈ 10
  const d = difficulty - (target + 1);
  return Math.max(0.15, Math.exp(-(d * d) / (2 * 1.6 * 1.6)));
}

// Práctica masiva en el mismo día rinde cada vez menos: conviene repartir (efecto de espaciado).
export const spacingFactor = (repsToday: number) => 1 / (1 + 0.15 * repsToday);

// Volver a algo después de 1 a 10 días es un "repaso con esfuerzo": rinde más (efecto de evocación).
export function retrievalBonus(daysSince: number | null) {
  if (daysSince === null || daysSince < 0.75) return 1;
  return daysSince <= 10 ? 1.2 : 1.05;
}

export interface GainInput { attempt: Attempt; proficiency: Proficiency; efficiency: number; now: Date }
export interface GainResult { points: number; factors: { outcome: number; challenge: number; spacing: number; retrieval: number; time: number; efficiency: number } }

export function practiceGain(i: GainInput): GainResult {
  const days = i.proficiency.lastPracticedAt ? (i.now.getTime() - i.proficiency.lastPracticedAt.getTime()) / 86_400_000 : null;
  // El tiempo cuenta, con rendimiento decreciente: 25 minutos rinden bastante; 4 horas seguidas, no 10 veces más.
  const time = Math.min(2.5, Math.sqrt(Math.max(1, i.attempt.durationMin) / 25));
  const f = {
    outcome: OUTCOME_FACTOR[i.attempt.outcome] * (i.attempt.reflected && i.attempt.outcome !== 'success' ? 1.3 : 1),
    challenge: challengeFactor(i.attempt.difficulty, i.proficiency.level),
    spacing: spacingFactor(i.proficiency.repsToday),
    retrieval: retrievalBonus(days),
    time,
    efficiency: i.efficiency
  };
  const points = 10 * f.outcome * f.challenge * f.spacing * f.retrieval * f.time * f.efficiency;
  return { points: Math.round(points * 100) / 100, factors: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Math.round(v * 100) / 100])) as GainResult['factors'] };
}

// Suma puntos a una barra. La estabilidad del recuerdo crece con la práctica espaciada, no con la masiva.
export function addPractice(t: Track, p: Proficiency, points: number, now: Date, today: string): Proficiency & { levelsUp: number } {
  const days = p.lastPracticedAt ? (now.getTime() - p.lastPracticedAt.getTime()) / 86_400_000 : 0;
  const before = p.level;
  const after = fromTotal(t, totalPoints(t, p.level, p.progress) + points);
  let stability = p.stabilityDays;
  if (days >= 0.75) stability = Math.min(120, stability + 0.5 + 0.35 * Math.min(days, stability));
  if (after.level > before) stability = Math.min(120, stability * 1.1);
  const sameDay = p.gainedDay === today;
  return {
    ...p, level: after.level, progress: Math.round(after.progress * 100) / 100, stabilityDays: Math.round(stability * 100) / 100,
    lastPracticedAt: now, gainedDay: today, gainedToday: (sameDay ? p.gainedToday : 0) + points,
    repsToday: (sameDay ? p.repsToday : 0) + 1, reps: p.reps + 1, levelsUp: after.level - before
  };
}

// Los atributos se ejercitan a través de las habilidades: cada habilidad reparte su ganancia entre
// los atributos que usa (pesos del catálogo). Suben más lento que las habilidades: son capacidades generales.
export const ATTR_SHARE = 0.4;

// Normaliza un atributo a 0–1 para usarlo en fórmulas (nivel 1 = 0, nivel 99 = 1).
export const norm = (level: number) => Math.min(1, Math.max(0, (level - 1) / (ATTR_MAX - 1)));
