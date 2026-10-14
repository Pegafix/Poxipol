// Crafteo: la receta se identifica por ingredientes ORDENADOS + proceso. Así la búsqueda es una lectura
// por índice único (recipes.key) en vez de comparar listas fila por fila.
export const PROCESSES = ['frio', 'calentar', 'hornear', 'fundir', 'forjar'] as const;
export type Process = (typeof PROCESSES)[number];

// Algunos procesos piden una habilidad del árbol: no se funde metal sin saber metalurgia.
export const PROCESS_SKILL: Partial<Record<Process, string>> = { hornear: 'horneado', fundir: 'metalurgia', forjar: 'orfebreria' };

export function recipeKey(ingredients: string[], process: Process): string {
  return [...ingredients].sort().join('+') + '|' + process;
}

// Cantidad pedida de cada ingrediente (el mismo puede ir dos veces).
export function countIngredients(ingredients: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of ingredients) m.set(i, (m.get(i) ?? 0) + 1);
  return m;
}

export const FAIL_TEXT: Record<Process, string> = {
  frio: 'No pasó nada interesante: quedó todo revuelto.',
  calentar: 'Se entibió, burbujeó un poco… y nada más.',
  hornear: 'Salió algo duro y raro del horno.',
  fundir: 'Lo que no se fundió se quemó. Huele a carbón.',
  forjar: 'Lo martillaste, pero no tomó forma.'
};
