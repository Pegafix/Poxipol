// Lee una guía en PDF (formato "Hoja de ruta paso a paso") y devuelve sus fases.
// Funciona en el navegador (window.RoadmapParser) y en Node (module.exports).
(function (root) {
  const FIELD_RE = /^(Meta|En [A-ZÁÉÍÓÚÑa-záéíóúñ0-9 .#+]{2,24}|Delegar a [A-Za-zÁÉÍÓÚÑáéíóúñ /]{2,24}|Listo cuando|Objetivo|Entregable|Criterio)\s*:\s*(.*)$/;
  const PHASE_RE = /^(?:Fase|Etapa|Paso)\s+(\d+)\s*[:.\-–—]?\s+(.+?)\s*$/i;
  const HOURS_RE = /(\d+(?:[.,]\d+)?)\s*h(?:oras)?\s+estimadas?/i;
  const WEEKS_RE = /Semanas?\s+([\d]+(?:\s*(?:a|-|–)\s*\d+)?)/i;
  const RECORD_RE = /^(Inicio real|Término real|Termino real|Horas reales)\b/i;
  const PROMPT_RE = /^\[?\s*PROMPT(?: PARA [A-ZÁÉÍÓÚÑ]+)?\s*\]?\s*/i;
  const SECTION_RE = /^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ"“&][A-ZÁÉÍÓÚÑ0-9"“”&:,()\/ \-–]{4,}$/;
  const TAG_ONLY_RE = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 \/&+.-]{1,28}$/;

  const MISSING = '\uFFFD';

  // Algunas fuentes incrustadas no traen el mapeo de ciertos signos y pdf.js
  // devuelve caracteres de uso privado. Se deducen por contexto.
  function repairGlyphs(s) {
    if (!/[\uE000-\uF8FF\uFFFD]/.test(s)) return s;
    const U = '[\\uE000-\\uF8FF\\uFFFD]';
    s = s.replace(new RegExp('^((?:Fase|Etapa|Paso)\\s+\\d+)' + U, 'i'), '$1:');
    s = s.replace(new RegExp('(\\d)' + U + '(\\d)', 'g'), '$1–$2');
    s = s.replace(new RegExp('(^|\\s)' + U + '(?=\\s|$)', 'g'), '$1–');
    let out = '', open = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(' || ch === '[') { open.push(ch); out += ch; continue; }
      if (ch === ')' || ch === ']') { open.pop(); out += ch; continue; }
      if (!/[\uE000-\uF8FF\uFFFD]/.test(ch)) { out += ch; continue; }
      const prev = s[i - 1] || ' ', next = s[i + 1] || ' ';
      if (/\s/.test(prev) && /[\wÁÉÍÓÚÑáéíóúñ]/.test(next)) {
        const word = (s.slice(i + 1).match(/^[^\s\uE000-\uF8FF\uFFFD]+/) || [''])[0];
        const br = /^[A-Z0-9_]{5,}$/.test(word) && /[\uE000-\uF8FF\uFFFD]/.test(s[i + 1 + word.length] || '') ? '[' : '(';
        open.push(br); out += br;
      } else if (open.length) {
        out += open.pop() === '[' ? ']' : ')';
      } else {
        out += ':';
      }
    }
    return out;
  }

  function norm(s) {
    return s.replace(/\s+/g, ' ').replace(/ ([,;])/g, '$1').trim();
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  // Agrupa los fragmentos de texto de pdf.js en líneas (por coordenada y).
  function pageLines(items, pageWidth, pageHeight) {
    const frags = items
      .filter(it => (it.str && it.str.trim()) || (it.str === '' && it.width > 0.5))
      .map(it => ({ s: it.str || MISSING, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || it.height || 10 }));
    frags.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const f of frags) {
      let line = lines.find(l => Math.abs(l.y - f.y) <= Math.max(2, f.h * 0.35));
      if (!line) { line = { y: f.y, h: f.h, frags: [] }; lines.push(line); }
      line.frags.push(f);
    }
    lines.sort((a, b) => b.y - a.y);
    return lines.map(l => {
      l.frags.sort((a, b) => a.x - b.x);
      // Separa en "celdas" cuando hay un hueco horizontal grande.
      const cells = [];
      for (const f of l.frags) {
        const last = cells[cells.length - 1];
        const gap = last ? f.x - (last.x + last.w) : Infinity;
        if (last && gap < Math.max(12, f.h * 1.6)) {
          last.s += (gap > f.h * 0.15 && !/\s$/.test(last.s) && !/^\s/.test(f.s) ? ' ' : '') + f.s;
          last.w = f.x + f.w - last.x;
        } else {
          cells.push({ s: f.s, x: f.x, w: f.w });
        }
      }
      cells.forEach(c => (c.s = norm(repairGlyphs(c.s))));
      return { y: l.y, h: l.h, cells, text: norm(cells.map(c => c.s).join(' ')), pageWidth, pageHeight };
    });
  }

  function isFooter(line) {
    return /P[áa]gina\s+\d+\s+de\s+\d+/i.test(line.text) || line.y < line.pageHeight * 0.045;
  }

  // Devuelve la etiqueta de la tarea si la línea termina en una celda en mayúsculas a la derecha.
  function trailingTag(line, knownTags) {
    if (line.cells.length >= 2) {
      const last = line.cells[line.cells.length - 1];
      if (last.x > line.pageWidth * 0.62 && TAG_ONLY_RE.test(last.s) && !/[a-záéíóúñ]/.test(last.s)) {
        return { tag: last.s, text: norm(line.cells.slice(0, -1).map(c => c.s).join(' ')) };
      }
    }
    for (const t of knownTags) {
      if (line.text.endsWith(' ' + t)) return { tag: t, text: line.text.slice(0, -t.length).trim() };
    }
    return null;
  }

  function parseLines(lines) {
    // 1) Datos de portada
    let title = '', subtitle = '';
    const first = lines.filter(l => l.page === 1).slice(0, 6);
    if (first.length) title = first[0].text;
    const proj = lines.find(l => /^Proyecto\s*:/i.test(l.text));
    if (proj) {
      const idx = lines.indexOf(proj);
      subtitle = proj.text;
      if (lines[idx + 1] && lines[idx + 1].page === proj.page && !SECTION_RE.test(lines[idx + 1].text)) subtitle += ' ' + lines[idx + 1].text;
      subtitle = norm(subtitle);
    }

    // 2) Encuentra la sección de la hoja de ruta
    let start = lines.findIndex(l => /HOJA DE RUTA/i.test(l.text));
    if (start < 0) start = lines.findIndex(l => PHASE_RE.test(l.text));
    if (start < 0) return null;
    const sectionTitle = SECTION_RE.test(lines[start].text) || /HOJA DE RUTA/i.test(lines[start].text)
      ? lines[start].text.replace(/^\d{1,2}\.\s*/, '') : 'Hoja de ruta';
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (SECTION_RE.test(lines[i].text) && !PHASE_RE.test(lines[i].text)) { end = i; break; }
    }
    const body = lines.slice(start + 1, end);

    // 3) Intro y leyenda de etiquetas (todo lo que va antes de la primera fase)
    const firstPhase = body.findIndex(l => PHASE_RE.test(l.text));
    const pre = body.slice(0, firstPhase < 0 ? body.length : firstPhase);
    const legend = [];
    const introParts = [];
    const isTagWord = w => /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\/&+-]{2,}$/.test(w);
    for (const l of pre) {
      const words = l.text.split(' ');
      const startsLegend = isTagWord(words[0]) && words.filter(isTagWord).length >= 2;
      if (!startsLegend && !legend.length) { introParts.push(l.text); continue; }
      if (!startsLegend) { legend[legend.length - 1].desc += ' ' + l.text; continue; }
      let cur = null;
      for (const w of words) {
        if (isTagWord(w)) {
          if (!cur || cur.desc) { cur = { tags: [], desc: '' }; legend.push(cur); }
          cur.tags.push(w);
        } else if (cur) cur.desc += ' ' + w;
      }
    }
    legend.forEach(g => (g.desc = norm(g.desc)));
    const knownTags = Array.from(new Set(legend.flatMap(g => g.tags).concat(['UNITY', 'CLAUDE', 'AUDIO', 'DISEÑO', 'ARTE', 'PRUEBA'])))
      .sort((a, b) => b.length - a.length);

    // 4) Fases
    const phases = [];
    let ph = null, mode = 'fields', field = null, task = null, prompt = [];
    const close = () => {
      if (!ph) return;
      ph.prompt = norm(prompt.join(' ')).replace(/^["“]/, '').replace(/["”]$/, '');
      phases.push(ph);
    };
    for (const l of body.slice(firstPhase < 0 ? body.length : firstPhase)) {
      if (isFooter(l)) continue;
      const pm = l.text.match(PHASE_RE);
      if (pm && (HOURS_RE.test(l.text) || l.cells.length <= 2)) {
        close();
        const hm = l.text.match(HOURS_RE), wm = l.text.match(WEEKS_RE);
        let t = pm[2];
        const cut = t.search(/\s\d+(?:[.,]\d+)?\s*h(?:oras)?\s+estimad/i);
        if (cut > 0) t = t.slice(0, cut);
        ph = {
          n: Number(pm[1]), title: norm(t), hours: hm ? Number(hm[1].replace(',', '.')) : 0,
          weeks: wm ? wm[1].replace(/\s*(a|-|–)\s*/, '–') : '', fields: [], tasks: [], prompt: ''
        };
        mode = 'fields'; field = null; task = null; prompt = [];
        continue;
      }
      if (!ph) continue;
      if (RECORD_RE.test(l.text)) { mode = 'done'; continue; }
      if (PROMPT_RE.test(l.text) && /PROMPT/i.test(l.text.slice(0, 20))) {
        mode = 'prompt'; prompt.push(l.text.replace(PROMPT_RE, '')); continue;
      }
      if (mode === 'prompt') { prompt.push(l.text); continue; }
      if (mode === 'done') continue;
      const tt = trailingTag(l, knownTags);
      if (tt && tt.text) {
        mode = 'tasks';
        task = { text: tt.text, tag: tt.tag };
        ph.tasks.push(task);
        continue;
      }
      if (mode === 'fields') {
        const txt = l.text.replace(/^[•·\-–]\s*/, '');
        const fm = txt.match(FIELD_RE);
        if (fm) { field = { k: fm[1], v: fm[2] }; ph.fields.push(field); }
        else if (field) field.v += ' ' + txt;
        continue;
      }
      if (mode === 'tasks' && task) task.text += ' ' + l.text;
    }
    close();

    for (const p of phases) {
      p.fields.forEach(f => (f.v = norm(f.v)));
      const seen = {};
      p.tasks.forEach(t => {
        t.text = norm(t.text).replace(/^[☐☑☒✓✔□■▢•·-]\s*/, '');
        let id = 't' + hash(p.n + '|' + t.text.toLowerCase());
        while (seen[id]) id += 'x';
        seen[id] = 1; t.id = id;
      });
      const meta = p.fields.find(f => f.k === 'Meta');
      p.meta = meta ? meta.v : '';
      p.fields = p.fields.filter(f => f.k !== 'Meta');
    }
    if (!phases.length) return null;
    const key = hash((title + '|' + subtitle + '|' + phases.map(p => p.title).join('|')).toLowerCase());
    return { key, title, subtitle, sectionTitle, intro: norm(introParts.join(' ')), legend, phases };
  }

  async function parsePdf(pdfjsLib, data) {
    const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    const all = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      pageLines(content.items, vp.width, vp.height).forEach(l => { l.page = p; all.push(l); });
    }
    return parseLines(all);
  }

  const api = { parsePdf, parseLines, pageLines, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RoadmapParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
