// Catálogo global: igual para todos los usuarios y versionado con el código. El seed lo carga en la base.
// Las recetas son reales (aleaciones, vidrio, cerámica, jabón, cocina y experimentos caseros seguros).
// El "fact" solo se entrega al descubrir: la API nunca expone recetas no descubiertas.
import type { Process } from '../domain/crafting.js';

export interface ItemDef { id: string; kind: 'material' | 'food' | 'jewel' | 'cosmetic'; name: string; slot?: string; infinite?: boolean; effect?: Record<string, unknown> }
export interface RecipeDef { ingredients: string[]; process: Process; kind: 'mat' | 'food' | 'exp' | 'jewel'; out?: string; name: string; fact: string }
export interface SkillDef { slug: string; parent?: string; kind: 'branch' | 'skill'; title: string; description?: string; cost?: number; requires?: string[]; uses?: Record<string, number> }

const mat = (id: string, name: string, extra: Partial<ItemDef> = {}): ItemDef => ({ id, kind: 'material', name, ...extra });
export const ITEMS: ItemDef[] = [
  mat('agua', 'Agua', { infinite: true }),
  mat('cobre', 'Cobre'), mat('estano', 'Estaño'), mat('zinc', 'Zinc'), mat('hierro', 'Hierro'), mat('carbon', 'Carbón'),
  mat('arena', 'Arena'), mat('sosa', 'Carbonato de sodio'), mat('cal', 'Cal'), mat('vinagre', 'Vinagre'), mat('bicarbonato', 'Bicarbonato'), mat('maicena', 'Maicena'),
  mat('harina', 'Harina'), mat('levadura', 'Levadura'), mat('azucar', 'Azúcar'), mat('cacao', 'Cacao'), mat('cera', 'Cera de abeja'), mat('aceite', 'Aceite'), mat('arcilla', 'Arcilla'),
  mat('leche', 'Leche'), mat('limon', 'Limón'), mat('sal', 'Sal'), mat('hielo', 'Hielo'), mat('ceniza', 'Ceniza de leña'), mat('miel', 'Miel'),
  mat('oro', 'Oro'), mat('plata', 'Plata'), mat('manzanilla', 'Manzanilla'), mat('menta', 'Menta'),
  // productos que también sirven como material
  mat('bronce', 'Bronce'), mat('laton', 'Latón'), mat('acero', 'Acero'), mat('ororosa', 'Oro rosa'), mat('electro', 'Electro'), mat('platadeley', 'Plata de ley'),
  mat('vidrio', 'Vidrio'), mat('ceramica', 'Cerámica'), mat('mortero', 'Mortero'), mat('jabon', 'Jabón'), mat('caseina', 'Plástico de leche'), mat('salmuera', 'Salmuera'),
  // comidas (se le dan a Mochi)
  { id: 'pan', kind: 'food', name: 'Pan', effect: { boost: { hp: 15 } } },
  { id: 'acimo', kind: 'food', name: 'Pan ácimo', effect: { boost: { hp: 8 } } },
  { id: 'caramelo', kind: 'food', name: 'Caramelo', effect: { boost: { sta: 15 } } },
  { id: 'requeson', kind: 'food', name: 'Requesón', effect: { boost: { sta: 20 } } },
  { id: 'chocolate', kind: 'food', name: 'Chocolate caliente', effect: { cure: ['malhumor'] } },
  { id: 'limonada', kind: 'food', name: 'Limonada', effect: { boost: { sta: 25 } } },
  { id: 'miellimon', kind: 'food', name: 'Agua de miel y limón', effect: { boost: { hp: 25 } } },
  { id: 'te', kind: 'food', name: 'Té de manzanilla', effect: { cure: ['ojeras', 'lento'] } },
  { id: 'temiel', kind: 'food', name: 'Manzanilla con miel', effect: { cure: ['agotado', 'malhumor'] } },
  { id: 'temen', kind: 'food', name: 'Té de menta', effect: { cure: ['nublado'], boost: { mp: 15 } } },
  // joyas forjadas
  { id: 'anillo', kind: 'jewel', name: 'Anillo de plata de ley', slot: 'joya', effect: { perk: { fam: 'build', xp: 2 } } },
  { id: 'amuleto', kind: 'jewel', name: 'Cuentas de vidrio', slot: 'joya', effect: { perk: { fam: 'claude', xp: 2 } } },
  { id: 'broche', kind: 'jewel', name: 'Broche de bronce', slot: 'joya', effect: { perk: { fam: 'create', xp: 2 } } },
  { id: 'dije', kind: 'jewel', name: 'Colgante de oro rosa', slot: 'joya', effect: { perk: { fam: 'test', xp: 3 } } },
  { id: 'perlas', kind: 'jewel', name: 'Moneda de electro', slot: 'joya', effect: { perk: { quest: 5 } } },
  { id: 'pulsera', kind: 'jewel', name: 'Pulsera de latón', slot: 'joya', effect: { perk: { bond: 20 } } }
];

const r = (ingredients: string[], process: Process, kind: RecipeDef['kind'], name: string, fact: string, out?: string): RecipeDef => ({ ingredients, process, kind, name, fact, out });
export const RECIPES: RecipeDef[] = [
  r(['cobre', 'estano'], 'fundir', 'mat', 'Bronce', 'Unos 9 de cobre por 1 de estaño. Con esta aleación empezó una edad entera de la historia humana.', 'bronce'),
  r(['cobre', 'zinc'], 'fundir', 'mat', 'Latón', 'El latón es cobre con zinc: más dorado y fácil de trabajar.', 'laton'),
  r(['carbon', 'hierro'], 'fundir', 'mat', 'Acero', 'Un poquito de carbono en el hierro lo vuelve acero: más duro y resistente.', 'acero'),
  r(['cobre', 'oro'], 'fundir', 'mat', 'Oro rosa', 'El oro rosa es oro con cobre; mientras más cobre, más rosado.', 'ororosa'),
  r(['oro', 'plata'], 'fundir', 'mat', 'Electro', 'Con electro se acuñaron algunas de las primeras monedas, en Lidia.', 'electro'),
  r(['cobre', 'plata'], 'fundir', 'mat', 'Plata de ley', 'La plata de ley tiene 92,5 % de plata y el resto cobre.', 'platadeley'),
  r(['arena', 'cal', 'sosa'], 'fundir', 'mat', 'Vidrio', 'Sílice, carbonato de sodio y cal: el vidrio común de ventanas y botellas.', 'vidrio'),
  r(['agua', 'arcilla'], 'hornear', 'mat', 'Cerámica', 'El barro cocido a alta temperatura se vuelve cerámica.', 'ceramica'),
  r(['agua', 'arena', 'cal'], 'frio', 'mat', 'Mortero', 'Cal, arena y agua: el mortero de miles de años de construcción.', 'mortero'),
  r(['aceite', 'agua', 'ceniza'], 'calentar', 'mat', 'Jabón', 'La ceniza de leña tiene potasa; con grasa y calor se hace jabón.', 'jabon'),
  r(['leche', 'vinagre'], 'calentar', 'mat', 'Plástico de leche', 'El ácido separa la caseína de la leche caliente: se puede moldear.', 'caseina'),
  r(['agua', 'sal'], 'frio', 'mat', 'Salmuera', 'Agua con mucha sal: sirve para conservar alimentos.', 'salmuera'),
  r(['agua', 'harina', 'levadura'], 'hornear', 'food', 'Pan', 'La levadura come azúcares de la harina y suelta gas: por eso el pan se infla.', 'pan'),
  r(['agua', 'harina'], 'hornear', 'food', 'Pan ácimo', 'Sin levadura el pan queda plano. Es uno de los panes más antiguos.', 'acimo'),
  r(['azucar'], 'calentar', 'food', 'Caramelo', 'Calentado, el azúcar se derrite y cambia: eso es la caramelización.', 'caramelo'),
  r(['leche', 'limon'], 'calentar', 'food', 'Requesón', 'El ácido del limón corta la leche caliente y separa la cuajada.', 'requeson'),
  r(['azucar', 'cacao', 'leche'], 'calentar', 'food', 'Chocolate caliente', 'El cacao se disuelve mejor en leche caliente.', 'chocolate'),
  r(['agua', 'azucar', 'limon'], 'frio', 'food', 'Limonada', 'El azúcar equilibra la acidez del limón.', 'limonada'),
  r(['agua', 'limon', 'miel'], 'calentar', 'food', 'Agua de miel y limón', 'Un remedio casero de toda la vida para la garganta.', 'miellimon'),
  r(['agua', 'manzanilla'], 'calentar', 'food', 'Té de manzanilla', 'Infusión suave que mucha gente toma para relajarse.', 'te'),
  r(['agua', 'manzanilla', 'miel'], 'calentar', 'food', 'Manzanilla con miel', 'Una taza tibia y dulce para bajar las revoluciones.', 'temiel'),
  r(['agua', 'menta'], 'calentar', 'food', 'Té de menta', 'El mentol da sensación de frescor.', 'temen'),
  r(['bicarbonato', 'vinagre'], 'frio', 'exp', 'Erupción de espuma', 'Ácido + base: reaccionan y sueltan dióxido de carbono.'),
  r(['hielo', 'sal'], 'frio', 'exp', 'Mezcla frigorífica', 'La sal derrite el hielo absorbiendo calor: la mezcla baja de 0 °C.'),
  r(['agua', 'maicena'], 'frio', 'exp', 'Fluido no newtoniano', 'Si lo golpeas está duro; si lo tocas suave, se escurre.'),
  r(['agua', 'jabon'], 'frio', 'exp', 'Burbujas de jabón', 'El jabón baja la tensión del agua y deja formar películas finitas.'),
  r(['agua', 'sal'], 'calentar', 'exp', 'Cristales de sal', 'Al evaporarse el agua, la sal vuelve a cristalizar.'),
  r(['platadeley'], 'forjar', 'jewel', 'Anillo de plata de ley', 'La plata de ley se martilla y se pule para hacer anillos.', 'anillo'),
  r(['vidrio'], 'forjar', 'jewel', 'Cuentas de vidrio', 'Las cuentas se hacen enrollando vidrio caliente en una varilla.', 'amuleto'),
  r(['bronce'], 'forjar', 'jewel', 'Broche de bronce', 'Los broches de bronce cerraban capas hace miles de años.', 'broche'),
  r(['ororosa'], 'forjar', 'jewel', 'Colgante de oro rosa', 'El oro rosa es popular en joyería por su tono cálido.', 'dije'),
  r(['electro'], 'forjar', 'jewel', 'Moneda de electro', 'Una moneda de electro, como las primeras de la historia.', 'perlas'),
  r(['laton'], 'forjar', 'jewel', 'Pulsera de latón', 'El latón se dobla bien en frío y en caliente.', 'pulsera')
];

// "Gran Árbol de Habilidades Humanas" (semilla). Crece agregando filas; el código no cambia.
export const SKILLS: SkillDef[] = [
  { slug: 'ciencias', kind: 'branch', title: 'Ciencias' },
  { slug: 'quimica_basica', parent: 'ciencias', kind: 'skill', title: 'Química básica', description: 'Ácidos, bases y mezclas.', uses: { analisis_critico: 0.5, logica: 0.3, memoria_trabajo: 0.2 } },
  { slug: 'metalurgia', parent: 'quimica_basica', kind: 'skill', title: 'Metalurgia', description: 'Fundir y alear metales.', cost: 2, uses: { agilidad_manual: 0.4, analisis_critico: 0.3, logica: 0.3 } },
  { slug: 'orfebreria', parent: 'metalurgia', kind: 'skill', title: 'Orfebrería', description: 'Forjar joyas.', cost: 2, uses: { agilidad_manual: 0.7, analisis_critico: 0.3 } },
  { slug: 'vidrieria', parent: 'metalurgia', kind: 'skill', title: 'Vidriería', description: 'Vidrio y cuentas.', cost: 2, uses: { agilidad_manual: 0.6, analisis_critico: 0.4 } },
  { slug: 'cocina', kind: 'branch', title: 'Cocina' },
  { slug: 'coccion', parent: 'cocina', kind: 'skill', title: 'Cocción', description: 'Calentar con criterio.', uses: { agilidad_manual: 0.5, memoria_trabajo: 0.3, analisis_critico: 0.2 } },
  { slug: 'horneado', parent: 'coccion', kind: 'skill', title: 'Horneado', description: 'Pan y cerámica.', uses: { agilidad_manual: 0.4, memoria_trabajo: 0.3, analisis_critico: 0.3 } },
  { slug: 'fermentacion', parent: 'horneado', kind: 'skill', title: 'Fermentación', description: 'Levaduras y tiempos.', cost: 2, requires: ['quimica_basica'], uses: { analisis_critico: 0.5, logica: 0.3, memoria_trabajo: 0.2 } },
  { slug: 'comunicacion', kind: 'branch', title: 'Comunicación' },
  { slug: 'escucha_activa', parent: 'comunicacion', kind: 'skill', title: 'Escucha activa', uses: { empatia: 0.6, enfoque: 0.4 } },
  { slug: 'validar_emociones', parent: 'escucha_activa', kind: 'skill', title: 'Validar emociones', uses: { empatia: 0.7, metacognicion: 0.3 } },
  { slug: 'limites_con_carino', parent: 'validar_emociones', kind: 'skill', title: 'Límites con cariño', cost: 2, uses: { empatia: 0.5, metacognicion: 0.3, tolerancia_frustracion: 0.2 } },
  { slug: 'reparacion', parent: 'limites_con_carino', kind: 'skill', title: 'Reparar después de un roce', cost: 2, uses: { empatia: 0.5, resiliencia: 0.3, metacognicion: 0.2 } },
  { slug: 'tecnologia', kind: 'branch', title: 'Tecnología' },
  { slug: 'logica', parent: 'tecnologia', kind: 'skill', title: 'Lógica', uses: { logica: 0.7, memoria_trabajo: 0.3 } },
  { slug: 'programacion', parent: 'logica', kind: 'skill', title: 'Programación', uses: { logica: 0.5, memoria_trabajo: 0.3, analisis_critico: 0.2 } },
  { slug: 'game_dev', parent: 'programacion', kind: 'skill', title: 'Desarrollo de juegos', cost: 2, uses: { logica: 0.4, analisis_critico: 0.3, memoria_trabajo: 0.3 } },
  { slug: 'audio_juegos', parent: 'game_dev', kind: 'skill', title: 'Audio para juegos', cost: 2, requires: ['escucha_activa'], uses: { analisis_critico: 0.4, enfoque: 0.3, agilidad_manual: 0.3 } },
  { slug: 'cuidado', kind: 'branch', title: 'Cuidado personal' },
  { slug: 'sueno', parent: 'cuidado', kind: 'skill', title: 'Higiene del sueño', uses: { resiliencia: 0.6, metacognicion: 0.4 } },
  { slug: 'pausas', parent: 'cuidado', kind: 'skill', title: 'Pausas activas', uses: { enfoque: 0.6, resiliencia: 0.4 } }
];

// De qué familia salen materiales al completar tareas.
export const REWARD_POOLS: Record<'build' | 'claude' | 'create' | 'test' | 'phase', string[]> = {
  build: ['cobre', 'estano', 'zinc', 'hierro', 'carbon'],
  claude: ['arena', 'sosa', 'cal', 'vinagre', 'bicarbonato', 'maicena'],
  create: ['harina', 'levadura', 'azucar', 'cacao', 'cera', 'aceite', 'arcilla'],
  test: ['leche', 'limon', 'sal', 'hielo', 'ceniza', 'miel'],
  phase: ['oro', 'plata']
};
export const STARTER_KIT: Record<string, number> = { limon: 1, azucar: 2, harina: 2, levadura: 1, manzanilla: 1, leche: 1 };
export const FAMILY_OF_TAG: Record<string, 'build' | 'claude' | 'test'> = { UNITY: 'build', CLAUDE: 'claude', PRUEBA: 'test' };

// Qué habilidad se practica al completar una tarea de una misión, según su tipo.
export const TASK_PRACTICE: Record<'build' | 'claude' | 'create' | 'test', string> = { build: 'programacion', claude: 'logica', create: 'game_dev', test: 'game_dev' };
// Qué habilidad se practica al trabajar con cada proceso del taller.
export const CRAFT_PRACTICE: Record<string, string> = { frio: 'quimica_basica', calentar: 'coccion', hornear: 'horneado', fundir: 'metalurgia', forjar: 'orfebreria' };
