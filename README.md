# Mochi Roadmap

Carga tus guías de desarrollo en PDF (formato "Hoja de ruta paso a paso & integración con Claude") y cada una se convierte en una **misión principal** con sus fases y tareas para tachar. Cada tarea alimenta a **Mochi**, una bolita blanca con orejitas, panza rosada y carita :3 que flota sobre un escritorio y crece de nivel: Semilla → Bolita → Pompón → Nube → Luna → Estrella. La curva es empinada: cada nivel pide más que el anterior (60, 170, 312, 480…).

## Pantallas

- **Inicio**: el personaje en su escritorio (ventana con día o noche según el tema, repisa, lámpara, cuaderno, taza y planta). Piensa en voz alta cosas simples sobre aprender, curiosidades de la vida y ganas de mejorar. Arriba, el nivel con **HP** (baja si pasas días sin avanzar), **MP** (sube al aprender con Claude hoy) y **STA** (sube con cada tarea de hoy), más racha, energía, diarias y combo como símbolos. Abajo, la barra de experiencia con su porcentaje.
  - **Su día**: sigue un ritmo de sueño sano según la hora. Duerme de 23:00 a 7:00 (ojos cerrados, "z", pieza a oscuras), despierta lento y bosteza, está más despierto y preguntón a media mañana y a media tarde, le da sueñito después de almuerzo y se calma de noche. La ventana muestra amanecer, día, atardecer o noche. Algunas preguntas son para ti y traen botones para responderle.
- **Misiones**: tres misiones diarias que cambian cada día y se reclaman por energía, y la lista de misiones principales (una por PDF). Al abrir una ves todo lo de la guía: fases, campos, tareas, prompts, cronómetro y registro.
- **Equipo**: 14 piezas en 5 ranuras (cabeza, cara, cuello, base, aura) que se desbloquean avanzando. Cada una se ve sobre el personaje y da un bono de energía mientras la llevas puesta. También muestra los atributos y los últimos 28 días.
- **Menú**: nombre del compañero, tema, sonido, reglas de la energía y reinicio.

## Uso

Abre `index.html` en el navegador (o sírvelo con `python3 -m http.server`) y entra a **Misiones → Cargar PDF** (puedes elegir varios a la vez) o arrastra los PDF a la página. Viene precargada la *Guía de Desarrollo v2 – Juego de Terror y Paranoia Sonora*.

## Qué lee del PDF

Dentro de la sección "Hoja de ruta", por cada `Fase N: Título · X h estimadas · Semanas…`:

- **Meta**, **En Unity**, **Delegar a Claude**, **Listo cuando** (cualquier campo `Nombre: texto`)
- Las tareas con su etiqueta a la derecha (`UNITY`, `CLAUDE`, `AUDIO`, `DISEÑO`, `ARTE`, `PRUEBA`, u otra en mayúsculas)
- El bloque `[PROMPT PARA CLAUDE]`
- La leyenda de etiquetas

Si vuelves a cargar una versión nueva de la misma guía, el progreso se conserva (cada tarea se identifica por su texto).

## Cómo se gana energía (XP)

| Acción | Energía |
| --- | --- |
| Tarea | 10 (PRUEBA: 12) |
| Combo: 2+ tareas en 20 min | ×1,5 (4+: ×2) |
| Primera tarea del día | +5 y +2 por día de racha (máx. +20) |
| Fase superada | 40 + 5 por tarea, +20 % si terminaste dentro de las horas estimadas |
| Copiar el prompt de una fase por primera vez | +3 |
| Misión diaria | 10 a 25 |
| Equipo puesto | bono según la pieza |

El tipo de tarea que más haces da color a los destellos que salen al tachar (azul construir, verde delegar, ámbar crear, rojo probar). Si pasan días sin avanzar, Mochi se duerme, pero nunca se va.

## Integración con Claude

- **Copiar prompt**: el prompt de la fase con `[VERSION]` y otros campos ya reemplazados.
- **Copiar con contexto**: agrega meta, campos y las tareas que te faltan antes del prompt.
- **Preguntar a Claude** (solo dentro de claude.ai): una consulta rápida con el contexto de la fase.

## Archivos

- `index.html`: la interfaz y los estilos
- `src/parser.js`: lee el PDF con pdf.js y arma las fases
- `src/pet.js`: dibuja a Mochi y su equipo en un canvas
- `src/app.js`: pantallas, misiones, equipo, puntos y guardado
- `src/sample.js`: la guía v2 ya leída

El progreso se guarda en el navegador (`localStorage`). Publicada en claude.ai, también se guarda en tu cuenta.
