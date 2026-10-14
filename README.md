# Mochi Roadmap

Carga tus guías de desarrollo en PDF (formato "Hoja de ruta paso a paso & integración con Claude") y cada una se convierte en una **misión principal** con sus fases y tareas para tachar. Cada tarea alimenta a **Mochi**, una bolita blanca con orejitas, panza rosada y carita :3 que flota sobre un escritorio y crece de nivel: Semilla → Bolita → Pompón → Nube → Luna → Estrella. La curva es empinada: cada nivel pide más que el anterior (60, 170, 312, 480…).

## Pantallas

- **Inicio**: el personaje en su escritorio (ventana con día o noche según el tema, repisa, lámpara, cuaderno, taza y planta). Piensa en voz alta cosas simples sobre aprender, curiosidades de la vida y ganas de mejorar. Arriba, el nivel con **HP** (baja si pasas días sin avanzar), **MP** (sube al aprender con Claude hoy) y **STA** (sube con cada tarea de hoy), más racha, energía, diarias y combo como símbolos. Abajo, la barra de experiencia con su porcentaje.
  - **Su día**: sigue un ritmo de sueño sano según la hora. Duerme de 23:00 a 7:00 (ojos cerrados, "z", pieza a oscuras), despierta lento y bosteza, está más despierto y preguntón a media mañana y a media tarde, le da sueñito después de almuerzo y se calma de noche. La ventana muestra amanecer, día, atardecer o noche. Algunas preguntas son para ti y traen botones para responderle.
  - **Noches**: dormido a veces habla incoherencias. Si lo despiertas, responde medio borracho de sueño y la despertada queda anotada; al otro día puede amanecer con efectos de mal dormir (Ojeras, Cabeza nublada, Malhumor, Lento) que bajan sus stats, o Descansado si durmió de corrido. Con mal dormir mantiene sus expresiones normales y se le notan ojeras, más marcadas según cuántos malestares tenga. A la sexta despertada se enoja de verdad y al otro día amanece **Agotado**: apático, seco y con menos paciencia, pero igual se pregunta cosas sobre lo que le pasa (¿se puede recuperar el sueño perdido?).
  - **Empatía (EMP)**: mide cómo lo tratas, con ideas de la psicología de las relaciones (Gottman: responder a las invitaciones a conectar, proporción 5:1 y reparación; Rosenberg: límites con observación, sentimiento, necesidad y petición; nombrar y validar emociones). Con más empatía tiene más paciencia, pregunta más y su personalidad cambia (Reservado, Tímido, Amigable, Cercano, Confidente). En Equipo se ve el vínculo, la proporción de interacciones y lo que han aprendido juntos. A nadie le gusta que lo toquen sin parar, y Mochi lo dice:
    - **Etapas**: con toques seguidos pasa de tierno a juguetón y después a juntar paciencia ("contando hasta diez… voy en cuatro").
    - **Pullas**: si sigues, refunfuña y empieza con las pullas de internet: hidrátate, sal a tocar pasto, agarra la pala y, al final, busca trabajo.
    - **"¿Estás aburrido?"**: lo que respondas cambia lo que pasa. Si estás aburrido, te propone tu siguiente tarea o salir un rato. Si querías cariño o andas estresado, se calma y te acompaña. "Porque sí" lo molesta más.
    - **Límite y pausa**: después pone un límite claro y se toma una pausa; si lo tocas en su pausa, la alarga. Al final intenta reparar ("¿estamos bien?").
    - **No es un bucle**: cada pausa del día lo deja con menos paciencia, pullas más pesadas y pausas más largas. Se le pasa con media hora de calma.
    - **Qué cambia lo que dice**: la empatía (seco si es reservado, cariñoso si es cercano), cómo durmió (agotado o con malhumor aguanta menos; descansado, un poco más) y la hora (en la mañana "primero el café", de noche "mañana tocas pasto, hoy tocas almohada").
  - **Expresiones**: feliz, guiño, sorpresa, enamorado, tímido, pensativo, ojos brillantes, somnoliento, bostezo, enojón, triste, mareado, dormido, ojeras y gotita de sudor.
- **Misiones**: tres misiones diarias que cambian cada día y se reclaman por energía, y la lista de misiones principales (una por PDF). Al abrir una ves todo lo de la guía: fases, campos, tareas, prompts, cronómetro y registro.
- **Equipo**: 20 piezas en 6 ranuras (cabeza, cara, cuello, joya, base, aura) que se desbloquean avanzando. Cada una se ve sobre el personaje y da un bono de energía mientras la llevas puesta. También muestra los atributos y los últimos 28 días.
- **Taller**: química, cocina y orfebrería de verdad. Avanzar da materiales reales (metales y carbón de las tareas de construir; arena, cal, vinagre, bicarbonato… de las de Claude; harina, levadura, cacao, cera… de las de crear; leche, limón, sal, miel… de las de probar; oro o plata de las fases; hierbas al tratar bien a Mochi; el agua nunca se acaba). Se eligen de 1 a 3 y un proceso (en frío, calentar, hornear, fundir, forjar). Las 33 recetas son reales (bronce, latón, acero, oro rosa, electro, plata de ley, vidrio, cerámica, mortero, jabón de ceniza, pan, requesón, limonada, tés, experimentos como bicarbonato con vinagre…) y **la app no las enseña**: no hay pistas, solo se ven las que uno descubre. Lo fabricado sirve para otras mezclas, las comidas cuidan a Mochi y las aleaciones se forjan en joyas.
- **Plaza**: comunidad entre quienes usan la página. Se publican descubrimientos (con la receta adjunta), preguntas, debates (con postura de acuerdo o en desacuerdo) y pedidos de material; se responde, se marca lo útil y se regalan materiales. Si alguien prueba una receta compartida y le sale, quien la compartió gana energía ("enseñaste a…"). Cada persona escribe solo su propio documento y lee el de todos; lo de otras personas se valida antes de mostrarse.
- **Menú**: nombre del compañero, tema, sonido, reglas de la energía y reinicio.

## Uso

Abre `index.html` en el navegador (o sírvelo con `python3 -m http.server`; la Plaza solo funciona publicada en claude.ai) y entra a **Misiones → Cargar PDF** (puedes elegir varios a la vez) o arrastra los PDF a la página. Viene precargada la *Guía de Desarrollo v2 – Juego de Terror y Paranoia Sonora*.

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

## Backend

La carpeta `server/` tiene la API multiplataforma (escritorio, móvil y web): PostgreSQL con árbol de habilidades en `ltree`, estado del compañero calculado por marcas de tiempo, sincronización por revisiones, comandos idempotentes y errores con códigos estables. Ver `server/README.md`. El sistema de aprendizaje (atributos cognitivos y emocionales, progreso por uso estilo Final Fantasy II, curva del olvido y burnout) está en `server/docs/LEARNING.md`.

## Archivos

- `index.html`: la interfaz y los estilos
- `src/parser.js`: lee el PDF con pdf.js y arma las fases
- `src/pet.js`: dibuja a Mochi y su equipo en un canvas
- `src/app.js`: pantallas, misiones, equipo, puntos y guardado
- `src/sample.js`: la guía v2 ya leída

El progreso se guarda en el navegador (`localStorage`). Publicada en claude.ai, también se guarda en tu cuenta.
