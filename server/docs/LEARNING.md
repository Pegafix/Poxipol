# Sistema de aprendizaje: atributos, práctica y estado emocional

El objetivo es que el juego diga la verdad sobre aprender: **nada ocurre de la noche a la mañana.** Se mejora con repetición, repartida en el tiempo, en el borde de lo que uno puede, con errores incluidos y durmiendo bien. Lo que no se usa se va borrando, pero lo bien consolidado se queda.

Toda la lógica está en funciones puras, probadas sin base de datos:

| Archivo | Contenido |
| --- | --- |
| `src/domain/learning.ts` | Atributos, curvas, ganancia por intento, olvido, consolidación |
| `src/domain/emotion.ts` | Frustración, energía emocional, agotamiento, multiplicador de eficiencia |
| `src/domain/voice.ts` | Cómo responde Mochi y los rasgos de personalidad |
| `src/services/learning.ts` | Orquesta todo en una transacción (`recordPractice`) |

---

## 1. Atributos y su base científica

Los atributos van del 1 al 99 y las habilidades del 1 al 16, como en Final Fantasy II. Junto a la evidencia pongo **sus límites**. Un juego que enseña a aprender no debería repetir mitos.

### Técnicos / cognitivos

| Atributo | Base | Límite honesto |
| --- | --- | --- |
| **Razonamiento lógico** | Razonamiento fluido y solución de problemas. Mejora con práctica en un dominio concreto. | Los "juegos de entrenamiento cerebral" casi no transfieren a otros dominios (Sala y Gobet, 2017). Aquí solo sube practicando cosas reales. |
| **Memoria de trabajo** | La "pizarra mental" de pocos elementos (Baddeley y Hitch). Su capacidad bruta casi no cambia; el experto agrupa información en bloques más grandes (*chunking*, Chase y Simon). | Entrenarla aislada transfiere poco (Melby-Lervåg y Hulme, 2013). Es el atributo que sube más lento. |
| **Agilidad manual** | Aprendizaje motor: rápido al principio y cada vez más lento (ley potencial de la práctica, Newell y Rosenbloom). Se consolida durmiendo (Walker y colaboradores). | — |
| **Análisis crítico** | Evaluar evidencia y argumentos. Mejora con práctica explícita y retroalimentación (Abrami y colaboradores, 2015). | — |

### Emocionales / autorregulación

| Atributo | Base | Cómo sube en el juego |
| --- | --- | --- |
| **Tolerancia a la frustración** | Tolerancia al malestar (Linehan): seguir ante el error sin abandonar. | Fallar y volver a intentar dentro de las 2 horas siguientes (+6). Quedarse con el error sin abandonar (+2). |
| **Resiliencia** | Recuperarse después de un mal momento. Es común y se construye con recursos cotidianos (Masten, "magia ordinaria"). | Volver a practicar después de salir de un agotamiento (+10). También acelera que la frustración baje. |
| **Empatía** | Pilar de la inteligencia emocional (Goleman). | Habilidades de la rama Comunicación y el trato a Mochi. |
| **Enfoque** | La atención sostenida decae con el tiempo (Mackworth); las pausas breves la ayudan (Ariga y Lleras, 2011). | Sesiones de 25 a 60 minutos que no se abandonan (+4). |
| **Metacognición** | Pensar sobre cómo aprendes y saber cuánto sabes (Flavell, 1979; Zimmerman). | Escribir una reflexión (+3) y **calibrar**: predecir la dificultad y acertar (+3 si la predicción es exacta, menos mientras más se aleja). |

### El marco general

- **Práctica deliberada (Ericsson, 1993):** metas concretas, retroalimentación y trabajo en el borde de lo que puedes. Un metaanálisis (Macnamara, 2014) muestra que explica una parte importante de las diferencias entre personas, **pero no toda**.
- **Mentalidad de crecimiento (Dweck):** los efectos medidos son reales pero modestos (Sisk, 2018; Yeager, 2019). Por eso el juego **no premia "creer"**: premia volver a intentar.
- **Dificultades deseables (Bjork) y fracaso productivo (Kapur):** equivocarse y espaciar hace más lento el avance de hoy, pero más durable lo aprendido.
- **Olvido (Ebbinghaus, 1885) y espaciado (Cepeda, 2006):** se olvida rápido al principio y lento después; repasar espaciado vuelve el recuerdo más estable.
- **Sueño (Diekelmann y Born, 2010):** dormir consolida lo practicado en el día.
- **Agotamiento (Maslach):** el esfuerzo sostenido sin recuperación lleva al burnout, y en ese estado aprender rinde muy poco.

---

## 2. Progresión estilo Final Fantasy II

### La regla

**Nada sube por "EXP general".** Una habilidad sube **solo al ejecutarla**. Los atributos suben **solo** por las habilidades que los ejercitan, según los pesos del catálogo (`skill_nodes.attr_weights`). Por ejemplo, *Metalurgia* reparte su ganancia así: agilidad manual 40 %, análisis crítico 30 % y lógica 30 %.

El árbol de habilidades también sigue esta regla: **se desbloquea por dominio practicado**. Para abrir una habilidad hay que tener la habilidad padre en nivel 3 y cada prerrequisito transversal en nivel 2. Las de primera fila de cada rama están abiertas desde el inicio. Esto reemplazó los puntos de habilidad que salían del nivel general.

Se practica por tres vías: `POST /v1/practice`, al completar tareas de una misión (cada tipo de tarea entrena una habilidad) y al usar los procesos del taller (fundir entrena *Metalurgia*, hornear entrena *Horneado*…).

### Ganancia por intento

```
puntos = 10 × resultado × desafío × espaciado × evocación × tiempo × eficiencia_emocional
```

| Factor | Valor | Por qué |
| --- | --- | --- |
| **resultado** | éxito 1 · fallo 0,55 · abandono 0,1. Si hubo fallo **con reflexión**, ×1,3 | El error trabajado enseña; abandonar casi no deja nada |
| **desafío** | campana centrada un poco por encima del nivel actual; mínimo 0,15 | Se aprende en el borde de lo que puedes (práctica deliberada) |
| **espaciado** | `1 / (1 + 0,15 × repeticiones_de_hoy)` | Repetir lo mismo el mismo día rinde cada vez menos |
| **evocación** | ×1,2 si vuelves después de 1 a 10 días | Recordar con esfuerzo fortalece (efecto de evocación) |
| **tiempo** | `√(minutos / 25)`, máximo 2,5 | Más tiempo suma, con rendimiento decreciente |
| **eficiencia** | 0,25 a 1,25 (sección 3) | La inteligencia emocional como multiplicador |

### Curva con rendimientos decrecientes

- **Habilidades:** el nivel L pide `20 × L^1,7` puntos (20, 65, 129, 211, 308…). El nivel 15 pide unas 30 veces lo que pide el nivel 2.
- **Atributos:** el nivel L pide `30 × L^1,35`. Además reciben solo el 40 % de lo practicado, porque son capacidades generales.

**Simulación** con 3 sesiones de 25 minutos al día y la dificultad adecuada (`test/sim.ts`):

| Nivel | Tiempo |
| --- | --- |
| 3 | 3 días |
| 5 | 2 semanas |
| 8 | ~2 meses |
| 12 | ~6 meses |
| 16 | ~1 año |

| Mismos 40 intentos, revisados 30 días después | Resultado |
| --- | --- |
| Todo en 1 día | nivel 3, estabilidad del recuerdo 2,4 días |
| Repartidos en 8 días | **nivel 4, estabilidad 8,8 días** |

### Curva del olvido

Cada barra guarda su **estabilidad** `S`, en días. La retención es `R = e^(−t/S)`, donde `t` son los días desde la última práctica sin contar el primero.

- Se pierde **como máximo el 35 % de lo no consolidado**: `pérdida = puntos_frescos × 0,35 × (1 − R)`.
- **Nunca se baja del nivel consolidado.** Lo que "ya pasó una noche" se queda.
- **La estabilidad crece con práctica espaciada** (`S += 0,5 + 0,35 × min(días de pausa, S)`) y un 10 % extra al subir de nivel. La práctica masiva del mismo día no la sube.
- El olvido se calcula al leer. Ningún proceso recorre la base restando puntos.

### Consolidación al dormir

Al primer contacto del día siguiente, lo practicado ayer se consolida según cómo durmió Mochi:

| Despertares anoche | Bonus sobre lo practicado ayer | ¿Fija el nivel alcanzado? |
| --- | --- | --- |
| 0 | +15 % | sí |
| 1–2 | +8 % | sí |
| 3–5 | +3 % | sí |
| 6 o más | 0 % | **no**: queda frágil ante el olvido |

Con esto se conecta con el ritmo de sueño que ya existía: despertarlo de noche no solo le pone ojeras, también le hace aprender peor.

---

## 3. La inteligencia emocional como multiplicador de eficiencia

El estado emocional se guarda como anclas (`learner_emotion`) y se calcula según el tiempo transcurrido:

- **Frustración (0–100):**
  - Fallar suma `8 × (1 − 0,5 × tolerancia)`.
  - Abandonar suma `15 × (1 − 0,5 × tolerancia)`.
  - Un éxito resta 6, y 12 si viene después de un fallo.
  - Baja con vida media de 6 horas, que llega a 3 horas con resiliencia alta.
- **Energía emocional (0–100):**
  - Cada intento gasta `minutos × 0,6 × dificultad / 5`.
  - Se recupera 12 por hora.
  - Una noche de por medio la recupera hasta el tope: 100, 70 con ojeras o 50 si está agotado.

**El multiplicador:**

```
frustración_sentida = frustración × (1 − 0,6 × tolerancia)
f_frustración = máx(0,55; 1 − 0,006 × (frustración_sentida − 30))
f_energía     = 1 si energía ≥ 40; si no, 0,45 + energía / 72,7
f_hábito      = 1 + 0,12 × enfoque + 0,08 × metacognición
f_sueño       = 0,85 con cabeza nublada · 0,8 si durmió fatal · 1,05 si descansó
eficiencia    = entre 0,25 y 1,25 del producto
```

El efecto central: **con la misma frustración, quien tiene más tolerancia aprende más.** En las pruebas, con frustración 90, la eficiencia pasa de 0,64 con tolerancia mínima a más de 0,8 con tolerancia alta.

**Agotamiento (burnout):**
- **Se entra** con energía menor a 15 y frustración mayor a 60, o con 3 abandonos en 2 horas.
- **Mientras dura,** la práctica técnica rinde 0,25.
- **Se sale** con energía de 60 o más y frustración bajo 30, después de 8 horas o de una noche.
- **Salir** suma resiliencia.
- **Descansar** (`POST /v1/rest`, hasta 6 veces al día) baja la frustración y devuelve energía. **Descansar es parte del método, no una pérdida de tiempo.**

La parte emocional **no se reduce** por la eficiencia: se fortalece justamente atravesando la dificultad.

---

## 4. Cómo lo refleja Mochi

Cada respuesta sigue el orden que funciona con personas reales: **validar → normalizar → estrategia concreta**. Nunca culpa y nunca promete atajos. La variante se elige con una semilla determinista, para que escritorio y móvil digan lo mismo.

| Situación | Ejemplo | Estrategia |
| --- | --- | --- |
| Abandona con mucha frustración o poca tolerancia | "Frustrarse con Química básica es normal; le pasa a cualquiera que aprende algo difícil. Nadie nace sabiendo esto. Descansemos un rato y volvemos con un pedacito más chico." | `smaller_step` |
| Abandona con metacognición desarrollada | "¿Qué parte exacta te trabó? Ponerle nombre ya es la mitad de resolverla." | `name_the_block` |
| Entra en agotamiento | "Con la cabeza así de cansada casi no se aprende. Descansa, toma agua, duerme: mientras duermes tu cerebro ordena lo que practicaste." | `rest` |
| Falla | "Fallar también suma: ese intento dejó aprendizaje aunque no se vea todavía. ¿Qué falló, según tú?" | `reflect` |
| Falla, vuelve a intentar y le sale | "Eso que acabas de hacer es justo lo que hace crecer la tolerancia a la frustración." | — |
| Practica demasiado lo mismo hoy | "Rinde más repartirlo en días: mañana seguimos y se te va a quedar mejor." | `space_it` |
| Muy fácil | "Para seguir creciendo, sube un poquito la dificultad." | `raise_difficulty` |
| Sube de nivel | "¡Lógica subió a nivel 3! Llevamos 10 intentos en 4 días. Así se construye: de a poquito y sin parar." | — |
| Algo se está olvidando | "Hace 21 días que no practicamos Lógica y se me está olvidando un poquito. Un repaso corto ahora vale mucho." | `short_review` |

Con un vínculo bajo (*Reservado* o *Tímido*), las respuestas son más cortas.

**Rasgos de personalidad** (`persona.traits`), que el cliente usa para el tono y los pensamientos:

| Rasgo | De dónde sale |
| --- | --- |
| *preguntón* | Lógica o análisis dominantes |
| *inquieto* | Agilidad manual dominante |
| *memorioso* | Memoria de trabajo dominante |
| *sereno* o *distraído* | Enfoque alto o bajo |
| *constante* | Resiliencia alta |
| *sensible al error* | Tolerancia baja |
| *reflexivo* | Metacognición alta |
| *cariñoso* | Empatía alta |

---

## 5. API y datos

| Método | Ruta | Cuerpo |
| --- | --- | --- |
| POST | `/v1/practice` | `{ skill, outcome: success\|fail\|abandon, difficulty 1–10, durationMin 1–240, predictedDifficulty?, reflection? }` (admite `Idempotency-Key`) |
| POST | `/v1/rest` | `{ minutes 5–120 }` |
| GET | `/v1/character` | Perfil completo con olvido y consolidación ya aplicados |

Las respuestas de ejemplo son **reales**: se generaron contra la API con `npx tsx scripts/capture-examples.ts`.

- [`examples/practice-success.json`](examples/practice-success.json): sube a nivel 3, con el desglose de factores, el bonus por volver al día siguiente y lo consolidado de noche.
- [`examples/practice-abandon.json`](examples/practice-abandon.json): abandono con validación y estrategia.
- [`examples/character.json`](examples/character.json): atributos con su base científica, habilidades, emoción, eficiencia y rasgos.

**Tablas** (`db/migrations/002_learning.sql`):

| Tabla | Para qué |
| --- | --- |
| `user_skill_progress` y `user_attributes` | Una barra por habilidad o atributo: nivel, progreso, nivel consolidado, estabilidad, última práctica, lo ganado hoy y repeticiones |
| `learner_emotion` | Frustración, energía, agotamiento, abandonos recientes y pausas del día |
| `practice_log` | Cada intento, solo se agrega; particionado por mes |
| `skill_nodes.attr_weights` | Qué atributos entrena cada habilidad |

**Concurrencia:** `recordPractice` bloquea emoción, atributos y habilidad siempre en ese orden. Así dos dispositivos practicando a la vez no pierden puntos ni se bloquean entre sí.

---

## Ajustes pendientes de calibrar con datos reales

Las constantes (exponentes de las curvas, 35 % de olvido máximo, umbrales de agotamiento) están elegidas para producir tiempos creíbles. **No salen de un estudio.** Cuando haya usuarios, conviene ajustarlas con `practice_log`: cuánto tardan de verdad en subir, cuándo abandonan, si las pausas los traen de vuelta.
