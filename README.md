# Brasa Roadmap

Carga una guía de desarrollo en PDF (formato "Hoja de ruta paso a paso & integración con Claude") y convierte cada fase en un checklist interactivo. Cada tarea que tachas alimenta a **Brasa**, una llama con cara que crece de nivel y evoluciona: Chispa → Brasa → Llama → Fogata → Hoguera → Faro.

## Uso

Abre `index.html` en el navegador (o sírvelo con `python3 -m http.server`) y pulsa **Cargar PDF**, o arrastra el PDF a la página. Viene precargada la *Guía de Desarrollo v2 – Juego de Terror y Paranoia Sonora*.

## Qué lee del PDF

Dentro de la sección "Hoja de ruta", por cada `Fase N: Título · X h estimadas · Semanas…`:

- **Meta**, **En Unity**, **Delegar a Claude**, **Listo cuando** (cualquier campo `Nombre: texto`)
- Las tareas con su etiqueta a la derecha (`UNITY`, `CLAUDE`, `AUDIO`, `DISEÑO`, `ARTE`, `PRUEBA`, u otra en mayúsculas)
- El bloque `[PROMPT PARA CLAUDE]`
- La leyenda de etiquetas

Si vuelves a cargar una versión nueva de la misma guía, el progreso se conserva (cada tarea se identifica por su texto).

## Cómo se gana calor (XP)

| Acción | Calor |
| --- | --- |
| Tarea | 10 (PRUEBA: 12) |
| Combo: 2+ tareas en 20 min | ×1,5 (4+: ×2) |
| Primera tarea del día | +5 y +2 por día de racha (máx. +20) |
| Fase superada | 40 + 5 por tarea, +20 % si terminaste dentro de las horas estimadas |
| Copiar el prompt de una fase por primera vez | +3 |

El tipo de tarea que más haces tiñe el corazón de la llama (azul construir, verde delegar, ámbar crear, rojo probar). Si pasan días sin avanzar, Brasa se apaga y se duerme, pero nunca muere.

## Integración con Claude

- **Copiar prompt**: el prompt de la fase con `[VERSION]` y otros campos ya reemplazados.
- **Copiar con contexto**: agrega meta, campos y las tareas que te faltan antes del prompt.
- **Preguntar a Claude** (solo dentro de claude.ai): una consulta rápida con el contexto de la fase.

## Archivos

- `index.html`: la interfaz y los estilos
- `src/parser.js`: lee el PDF con pdf.js y arma las fases
- `src/flame.js`: dibuja a Brasa en un canvas
- `src/app.js`: estado, puntos, guardado y render
- `src/sample.js`: la guía v2 ya leída

El progreso se guarda en el navegador (`localStorage`). Publicada en claude.ai, también se guarda en tu cuenta.
