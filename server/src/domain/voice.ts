// Cómo habla Mochi cuando aprenden juntos. Cada respuesta sigue el mismo orden, que es el que funciona
// con personas reales: primero VALIDAR lo que se siente, después NORMALIZAR (aprender cuesta a todos)
// y al final una ESTRATEGIA concreta (metacognición). Nunca culpa, nunca "positividad tóxica".
// Elige entre variantes de forma determinista con una semilla, para que dos dispositivos digan lo mismo.
import type { Outcome } from './learning.js';

export type Expression = 'happy' | 'love' | 'sad' | 'thinking' | 'drowsy' | 'surprised' | 'shy' | 'neutral' | 'sparkle';
export interface Line { key: string; text: string; expression: Expression; strategy?: string }

export interface VoiceContext {
  outcome: Outcome;
  skillName: string;
  levelsUp: number;
  newLevel: number;
  repsTotal: number;
  daysPracticed: number;
  enteredBurnout: boolean;
  inBurnout: boolean;
  frustration: number;
  tolerance: number;           // 0–1
  metacognition: number;       // 0–1
  challenge: 'easy' | 'right' | 'hard';
  repsToday: number;
  retriedAfterFail: boolean;
  reflected: boolean;
  tier: string;                // etapa del vínculo con Mochi
  seed: number;
}

const pick = <T>(list: T[], seed: number) => list[Math.abs(seed) % list.length]!;

export function reactToPractice(c: VoiceContext): Line {
  const reserved = c.tier === 'Reservado' || c.tier === 'Tímido';

  if (c.enteredBurnout || (c.inBurnout && c.outcome !== 'success')) {
    return { key: 'burnout', expression: 'drowsy', strategy: 'rest',
      text: reserved
        ? 'Creo que ya es mucho por hoy. Descansemos y seguimos mañana.'
        : 'Esto ya es demasiado por hoy, y está bien. Con la cabeza así de cansada casi no se aprende. Descansa, toma agua, duerme: mientras duermes tu cerebro ordena lo que practicaste. Mañana seguimos.' };
  }

  if (c.outcome === 'abandon') {
    // Validar → normalizar → estrategia, adaptado a cómo está y a qué tan desarrollada tiene su autorregulación.
    if (c.frustration > 55 || c.tolerance < 0.15) {
      return { key: 'abandon_validate', expression: 'shy', strategy: 'smaller_step',
        text: pick([
          `Está bien soltar ${c.skillName} un rato. Que cueste no significa que no puedas: significa que estás aprendiendo algo nuevo de verdad. ¿Lo partimos en un paso de 10 minutos?`,
          `Frustrarse con ${c.skillName} es normal; le pasa a cualquiera que aprende algo difícil. Nadie nace sabiendo esto. Descansemos un rato y volvemos con un pedacito más chico.`,
          'Todavía no te sale, y "todavía" es la palabra importante. Las habilidades se construyen con días, no con un solo intento. Pausa, respira, y volvemos.'
        ], c.seed) };
    }
    if (c.metacognition >= 0.2) {
      return { key: 'abandon_reflect', expression: 'thinking', strategy: 'name_the_block',
        text: pick([
          '¿Qué parte exacta te trabó? Ponerle nombre ya es la mitad de resolverla. Anótala y la miramos después de un descanso.',
          'Dejarlo a tiempo también es una decisión. Antes de irte: ¿qué intentarías distinto la próxima vez?'
        ], c.seed) };
    }
    return { key: 'abandon_rest', expression: 'shy', strategy: 'come_back_later',
      text: 'Descansemos y volvamos a intentar más tarde. Volver mañana no es rendirse: repasar con días de por medio ayuda a que se quede.' };
  }

  if (c.levelsUp > 0) {
    return { key: 'level_up', expression: 'love',
      text: `¡${c.skillName} subió a nivel ${c.newLevel}! Llevamos ${c.repsTotal} intentos en ${c.daysPracticed} ${c.daysPracticed === 1 ? 'día' : 'días'}. Así se construye: de a poquito y sin parar.` };
  }

  if (c.outcome === 'fail') {
    if (c.reflected) return { key: 'fail_reflected', expression: 'thinking',
      text: 'Fallar y anotar por qué es de lo más útil que hay: ese intento te enseñó más que uno fácil.' };
    return { key: 'fail', expression: 'shy', strategy: 'reflect',
      text: pick([
        'Fallar también suma: ese intento dejó aprendizaje aunque no se vea todavía. ¿Qué falló, según tú?',
        'No salió, y está bien. Los errores son parte del camino, no una señal de que no sirves para esto.'
      ], c.seed) };
  }

  // Éxito
  if (c.retriedAfterFail) return { key: 'success_after_fail', expression: 'sparkle',
    text: 'Fallaste, volviste a intentar y salió. Eso que acabas de hacer es justo lo que hace crecer la tolerancia a la frustración.' };
  if (c.repsToday >= 6) return { key: 'massed', expression: 'drowsy', strategy: 'space_it',
    text: `Ya practicamos ${c.skillName} un montón hoy. Rinde más repartirlo en días: mañana seguimos y se te va a quedar mejor.` };
  if (c.challenge === 'easy') return { key: 'too_easy', expression: 'neutral', strategy: 'raise_difficulty',
    text: 'Esto ya te sale fácil. Para seguir creciendo, sube un poquito la dificultad.' };
  if (c.challenge === 'hard') return { key: 'too_hard_win', expression: 'surprised',
    text: '¡Salió algo que estaba bastante por encima de tu nivel! Si se vuelve a poner difícil, prueba con un paso intermedio.' };
  return { key: 'success', expression: 'happy',
    text: pick([
      'Bien. Una repetición más en la cuenta; así es como se aprende de verdad.',
      'Salió. No fue suerte: fue práctica.',
      'Otro paso. Pequeño, pero suma.'
    ], c.seed) };
}

export function reactToForgetting(skillName: string, days: number): Line {
  return { key: 'forgetting', expression: 'thinking', strategy: 'short_review',
    text: `Hace ${Math.round(days)} días que no practicamos ${skillName} y se me está olvidando un poquito. Un repaso corto ahora vale mucho.` };
}

// Rasgos de personalidad que salen de los atributos: el cliente los usa para sus pensamientos y su tono.
export function personaTraits(attrs: Record<string, number>): string[] {
  const t: string[] = [];
  const top = Object.entries(attrs).sort((a, b) => b[1] - a[1]);
  const first = top[0]?.[0];
  if (first === 'logica' || first === 'analisis_critico') t.push('preguntón');           // pregunta "¿por qué?"
  if (first === 'agilidad_manual') t.push('inquieto');                                   // quiere hacer cosas con las manos
  if (first === 'memoria_trabajo') t.push('memorioso');
  if ((attrs.enfoque ?? 1) >= 15) t.push('sereno'); else if ((attrs.enfoque ?? 1) <= 3) t.push('distraído');
  if ((attrs.resiliencia ?? 1) >= 15) t.push('constante');
  if ((attrs.tolerancia_frustracion ?? 1) <= 3) t.push('sensible al error');
  if ((attrs.metacognicion ?? 1) >= 12) t.push('reflexivo');
  if ((attrs.empatia ?? 1) >= 15) t.push('cariñoso');
  return t;
}
