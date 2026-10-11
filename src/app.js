// Brasa Roadmap: carga una guía en PDF y convierte su hoja de ruta en un checklist que alimenta a Brasa.
(function () {
  'use strict';

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const LS_PROJECTS = 'brasa.v1.projects', LS_ACTIVE = 'brasa.v1.active', LS_SOUND = 'brasa.v1.sound';
  const DAY = 86400000;

  const FAMILY = { UNITY: 'build', CLAUDE: 'claude', PRUEBA: 'test' };
  const FAMILY_INFO = {
    build: { label: 'Construir', color: '#5b8cff' },
    claude: { label: 'Delegar', color: '#2fbf8f' },
    create: { label: 'Crear', color: '#f0b429' },
    test: { label: 'Probar', color: '#ff5d6c' }
  };
  const STAGES = [
    { min: 1, name: 'Chispa' }, { min: 3, name: 'Brasa' }, { min: 6, name: 'Llama' },
    { min: 10, name: 'Fogata' }, { min: 15, name: 'Hoguera' }, { min: 21, name: 'Faro' }
  ];
  const familyOf = tag => FAMILY[tag] || 'create';

  // ---------- utilidades ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const fmtDate = t => t ? new Date(t).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—';
  const fmtH = h => (Math.round(h * 10) / 10).toLocaleString('es', { maximumFractionDigits: 1 });
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------- estado ----------
  const state = {
    projects: {},   // id -> doc
    activeId: null,
    open: new Set(),
    db: null, uid: null, sample: null,
    sound: lsGet(LS_SOUND) !== 'off'
  };

  function newProject(roadmap, fileName) {
    return {
      id: 'p_' + roadmap.key, key: roadmap.key, fileName: fileName || '',
      addedAt: Date.now(), updatedAt: Date.now(),
      roadmap, vars: {}, progress: { tasks: {}, phases: {}, prompts: {} }
    };
  }

  function active() { return state.projects[state.activeId] || null; }

  // ---------- persistencia ----------
  let saveTimers = {}, saving = {};
  function persistLocal() {
    lsSet(LS_PROJECTS, JSON.stringify(state.projects));
    lsSet(LS_ACTIVE, state.activeId || '');
  }
  function touch(p) {
    p.updatedAt = Date.now();
    p.untouched = false;
    persistLocal();
    if (!state.db || !state.uid) return;
    clearTimeout(saveTimers[p.id]);
    saveTimers[p.id] = setTimeout(() => saveRemote(p.id), 700);
  }
  async function saveRemote(id) {
    if (saving[id]) { saveTimers[id] = setTimeout(() => saveRemote(id), 400); return; }
    const p = state.projects[id];
    saving[id] = true;
    try {
      const ref = state.db.collection('data/users/' + state.uid).doc(id);
      if (!p) await ref.delete();
      else await ref.set(JSON.parse(JSON.stringify(p)));
      setSync('Guardado en tu cuenta');
    } catch (e) {
      setSync(e && e.code === 'quota_exceeded' ? 'Sin espacio en la nube: queda guardado en este navegador' : 'Guardado solo en este navegador');
    } finally { saving[id] = false; }
  }
  function setSync(t) { const el = $('#sync'); if (el) el.textContent = t; }

  function loadLocal() {
    try { state.projects = JSON.parse(lsGet(LS_PROJECTS) || '{}') || {}; } catch (e) { state.projects = {}; }
    state.activeId = lsGet(LS_ACTIVE) || null;
  }

  async function connectCloud() {
    if (!window.claude || typeof window.claude.use !== 'function') { setSync('Guardado en este navegador'); return; }
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = user ? await user.id() : null;
      if (!db || !uid) { setSync('Guardado en este navegador'); return; }
      state.db = db; state.uid = uid;
      const snap = await db.collection('data/users/' + uid).get();
      let changed = false;
      snap.docs.forEach(d => {
        if (!d.exists || !d.id.startsWith('p_')) return;
        const remote = d.data();
        const local = state.projects[d.id];
        if (!local || local.untouched || (remote.updatedAt || 0) > (local.updatedAt || 0)) {
          state.projects[d.id] = JSON.parse(JSON.stringify(remote)); changed = true;
        }
      });
      // Sube lo que solo existe en este navegador (si el usuario ya lo usó).
      Object.values(state.projects).forEach(p => {
        const remote = snap.docs.find(d => d.id === p.id);
        if (!p.untouched && (!remote || (remote.data().updatedAt || 0) < p.updatedAt)) saveRemote(p.id);
      });
      setSync('Guardado en tu cuenta');
      if (changed) { persistLocal(); if (!active()) state.activeId = Object.keys(state.projects)[0] || null; renderAll(); }
    } catch (e) { setSync('Guardado en este navegador'); }
    try { state.sample = await window.claude.use('sample'); } catch (e) { state.sample = null; }
    if (state.sample) document.body.classList.add('can-ask');
  }

  // ---------- puntos ----------
  function allTaskEvents() {
    const ev = [];
    Object.values(state.projects).forEach(p => {
      const byId = {};
      p.roadmap.phases.forEach(ph => ph.tasks.forEach(t => (byId[t.id] = t)));
      Object.entries(p.progress.tasks).forEach(([id, v]) => ev.push({ at: v.at, xp: v.xp, tag: byId[id] ? byId[id].tag : '' }));
    });
    return ev;
  }
  function totals() {
    let xp = 0;
    const fam = { build: 0, claude: 0, create: 0, test: 0 };
    const days = new Set();
    let last = 0;
    Object.values(state.projects).forEach(p => {
      Object.values(p.progress.phases).forEach(v => { xp += v.xp || 0; if (v.doneAt) last = Math.max(last, v.doneAt); });
      Object.keys(p.progress.prompts).forEach(() => (xp += 3));
    });
    allTaskEvents().forEach(e => { xp += e.xp; fam[familyOf(e.tag)]++; days.add(dayKey(e.at)); last = Math.max(last, e.at); });
    return { xp, fam, days, last };
  }
  function levelOf(xp) {
    let L = 1, need = 40, rest = xp;
    while (rest >= need) { rest -= need; L++; need = 40 + 20 * (L - 1); }
    return { L, into: rest, need };
  }
  function stageOf(L) { let s = 0; STAGES.forEach((x, i) => { if (L >= x.min) s = i; }); return s; }
  function streakOf(days) {
    let n = 0, t = Date.now();
    if (!days.has(dayKey(t))) t -= DAY; // la racha sigue viva si ayer hubo leña
    while (days.has(dayKey(t))) { n++; t -= DAY; }
    return n;
  }
  function comboNow() {
    const now = Date.now();
    return allTaskEvents().filter(e => now - e.at < 20 * 60000).length;
  }

  // ---------- acciones ----------
  function toggleTask(p, ph, t, fromEl) {
    const prog = p.progress;
    const pp = prog.phases[ph.n] || (prog.phases[ph.n] = {});
    if (prog.tasks[t.id]) {
      delete prog.tasks[t.id];
      if (pp.doneAt) { delete pp.doneAt; pp.xp = 0; }
      touch(p); renderAll();
      say('Lo dejé pendiente otra vez. Sin drama.');
      return;
    }
    const before = levelOf(totals().xp).L;
    const tot = totals();
    const firstToday = !tot.days.has(dayKey(Date.now()));
    const combo = comboNow();
    const mult = combo >= 4 ? 2 : combo >= 2 ? 1.5 : 1;
    let xp = Math.round((t.tag === 'PRUEBA' ? 12 : 10) * mult);
    if (firstToday) xp += 5 + 2 * Math.min(10, streakOf(tot.days));
    prog.tasks[t.id] = { at: Date.now(), xp };
    if (!pp.startAt) pp.startAt = Date.now();
    touch(p);
    sparkFrom(fromEl, familyOf(t.tag), () => {
      flame.feed(mult > 1 ? 1 : 0.6);
      crackle(mult);
    });
    const after = levelOf(totals().xp).L;
    floatXP(fromEl, '+' + xp + (mult > 1 ? ' ×' + mult : ''));
    renderAll();
    if (after > before) {
      const s = STAGES[stageOf(after)].name;
      say(stageOf(after) > stageOf(before) ? `¡Evolucioné! Ahora soy ${s}. Nivel ${after}.` : `¡Nivel ${after}! Me siento más caliente.`, true);
    } else if (firstToday) {
      say(`Primera leña del día: +${xp}. ${streakOf(totals().days) > 1 ? 'Racha de ' + streakOf(totals().days) + ' días.' : ''}`);
    } else if (mult > 1) {
      say(pick([`Combo ×${mult}. No pares ahora.`, `¡Eso crujió rico! Combo ×${mult}.`]));
    } else {
      const left = ph.tasks.filter(x => !prog.tasks[x.id]).length;
      say(left ? pick([`+${xp}. Quedan ${left} en «${ph.title}».`, `Rico. ${left} más y la fase está.`, `+${xp} de calor.`]) :
        `Todas las tareas de «${ph.title}» listas. Ahora confirma: ${ph.fields.find(f => /^Listo/i.test(f.k))?.v || 'la fase está terminada'}.`);
    }
  }

  function completePhase(p, ph, fromEl) {
    const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
    if (pp.doneAt) return;
    const before = levelOf(totals().xp).L;
    let xp = 40 + 5 * ph.tasks.length;
    if (pp.hours > 0 && ph.hours > 0 && pp.hours <= ph.hours) xp = Math.round(xp * 1.2);
    pp.doneAt = Date.now(); pp.xp = xp;
    if (pp.timerStart) stopTimer(p, ph, true);
    touch(p);
    sparkFrom(fromEl, 'create', () => { flame.feed(1.4); crackle(2); });
    const after = levelOf(totals().xp).L;
    state.open.delete(ph.n);
    const next = p.roadmap.phases.find(x => !(p.progress.phases[x.n] || {}).doneAt);
    if (next) state.open.add(next.n);
    floatXP(fromEl, '+' + xp);
    renderAll();
    say(`¡Fase ${ph.n} superada! +${xp}.` + (after > before ? ` Nivel ${after}.` : '') + (next ? ` Sigue «${next.title}».` : ' Terminaste toda la hoja de ruta.'), true);
  }

  function reopenPhase(p, ph) {
    const pp = p.progress.phases[ph.n];
    if (!pp) return;
    delete pp.doneAt; pp.xp = 0;
    touch(p); renderAll();
  }

  function startTimer(p, ph) {
    const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
    // Solo un cronómetro a la vez: cierra el que esté andando en otra fase.
    Object.values(p.progress.phases).forEach(o => {
      if (o.timerStart && o !== pp) { o.hours = (o.hours || 0) + (Date.now() - o.timerStart) / 3600000; delete o.timerStart; }
    });
    pp.timerStart = Date.now();
    if (!pp.startAt) pp.startAt = Date.now();
    touch(p); renderAll();
    say('Cronómetro andando. Yo te cuido el fuego.');
  }
  function stopTimer(p, ph, silent) {
    const pp = p.progress.phases[ph.n];
    if (!pp || !pp.timerStart) return;
    const add = (Date.now() - pp.timerStart) / 3600000;
    pp.hours = (pp.hours || 0) + add;
    delete pp.timerStart;
    if (!silent) { touch(p); renderAll(); say(`Sumé ${fmtH(add)} h a la fase ${ph.n}.`); }
  }

  function fillVars(p, text) {
    return text.replace(/\[([A-ZÁÉÍÓÚÑ_ ]{2,20})\]/g, (m, k) => (p.vars[k] || '').trim() || m);
  }
  function contextPrompt(p, ph) {
    const pending = ph.tasks.filter(t => !p.progress.tasks[t.id]);
    const lines = [
      `Estoy trabajando en: ${p.roadmap.subtitle || p.roadmap.title}.`,
      `Fase ${ph.n}: ${ph.title}. Meta: ${ph.meta}`,
      ...ph.fields.map(f => `${f.k}: ${f.v}`),
      pending.length ? 'Tareas que me faltan:\n' + pending.map(t => `- [${t.tag}] ${t.text}`).join('\n') : 'Ya terminé todas las tareas de esta fase.',
      '',
      fillVars(p, ph.prompt)
    ];
    return lines.join('\n');
  }
  async function copyText(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
    }
    if (btn) { const o = btn.textContent; btn.textContent = ok ? 'Copiado' : 'Selecciona y copia'; setTimeout(() => (btn.textContent = o), 1400); }
    return ok;
  }

  // ---------- efectos ----------
  let audioCtx = null;
  function crackle(mult) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const n = Math.round(audioCtx.sampleRate * 0.25);
      const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() < 0.012 * mult ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.04) * (1 - i / n);
      const src = audioCtx.createBufferSource(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 900; g.gain.value = 0.5;
      src.buffer = buf; src.connect(f).connect(g).connect(audioCtx.destination); src.start();
    } catch (e) { /* sin audio */ }
  }
  function sparkFrom(el, fam, done) {
    if (!el || !el.getBoundingClientRect || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    const r = el.getBoundingClientRect();
    const [tx, ty] = flame.center();
    const s = document.createElement('span');
    s.className = 'spark'; s.style.background = FAMILY_INFO[fam].color;
    s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + r.height / 2 + 'px';
    document.body.appendChild(s);
    const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
    const a = s.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 80}px)) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.4)`, opacity: 0.2 }
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.6,1)' });
    a.onfinish = () => { s.remove(); done(); };
  }
  function floatXP(el, text) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'floatxp'; f.textContent = text;
    f.style.left = r.right + 6 + 'px'; f.style.top = r.top + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
  let sayTimer = 0;
  function say(text, big) {
    const b = $('#bubble');
    b.textContent = text;
    b.classList.toggle('big', !!big);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { b.textContent = idleLine(); b.classList.remove('big'); }, 9000);
  }

  // ---------- siguiente tarea ----------
  function nextStep(p) {
    if (!p) return null;
    for (const ph of p.roadmap.phases) {
      const pp = p.progress.phases[ph.n] || {};
      if (pp.doneAt) continue;
      const t = ph.tasks.find(x => !p.progress.tasks[x.id]);
      if (t) return { ph, t };
      return { ph, t: null };
    }
    return null;
  }
  function idleLine() {
    const p = active();
    const tot = totals();
    const cold = tot.last && Date.now() - tot.last > 2 * DAY;
    const ns = nextStep(p);
    if (!ns) return p ? 'Hoja de ruta completa. Carga la próxima guía y sigo ardiendo.' : 'Carga una guía en PDF y empiezo a arder.';
    if (cold) return `Me estoy apagando… una tarea chica y vuelvo: «${ns.t ? ns.t.text : ns.ph.title}».`;
    if (!ns.t) return `Fase ${ns.ph.n} lista para confirmar. ¿Se cumple «${(ns.ph.fields.find(f => /^Listo/i.test(f.k)) || {}).v || 'el criterio'}»?`;
    if (ns.t.tag === 'CLAUDE') return `Esta se delega: «${ns.t.text}». Copia el prompt de la fase ${ns.ph.n}.`;
    if (ns.t.tag === 'PRUEBA') return `Toca probar: «${ns.t.text}». Las pruebas dan más calor.`;
    return pick([`Tengo hambre de leña. ¿Le damos a «${ns.t.text}»?`, `Siguiente: «${ns.t.text}».`]);
  }

  // ---------- render ----------
  let flame;
  function renderAll() {
    renderCompanion();
    renderProject();
  }

  function renderCompanion() {
    const tot = totals();
    const lv = levelOf(tot.xp);
    const stg = stageOf(lv.L);
    const streak = streakOf(tot.days);
    const sinceLast = tot.last ? Date.now() - tot.last : Infinity;
    const heat = tot.last ? Math.max(0.15, 1 - sinceLast / (3 * DAY)) : 0.45;
    const famTop = Object.entries(tot.fam).sort((a, b) => b[1] - a[1])[0];
    flame.set({ stage: stg, heat, sleepy: heat < 0.3, tint: famTop[1] ? FAMILY_INFO[famTop[0]].color : '#ff7a1a' });

    $('#stage').textContent = STAGES[stg].name;
    $('#level').textContent = 'Nivel ' + lv.L;
    $('#xpbar').style.width = (lv.into / lv.need * 100).toFixed(1) + '%';
    $('#xptext').textContent = `${lv.into} / ${lv.need} de calor`;
    $('#xptotal').textContent = tot.xp.toLocaleString('es');
    $('#streak').textContent = streak;
    $('#combo').textContent = comboNow() >= 2 ? '×' + (comboNow() >= 4 ? 2 : 1.5) : '—';
    const nextStage = STAGES[stg + 1];
    $('#nextstage').textContent = nextStage ? `${nextStage.name} en nivel ${nextStage.min}` : 'Forma final';

    const max = Math.max(1, ...Object.values(tot.fam));
    $('#stats').innerHTML = Object.entries(FAMILY_INFO).map(([k, f]) => `
      <div class="stat"><span class="stat-l">${f.label}</span>
        <span class="stat-bar"><i style="width:${(tot.fam[k] / max * 100).toFixed(0)}%;background:${f.color}"></i></span>
        <span class="stat-n">${tot.fam[k]}</span></div>`).join('');

    // 28 días de leña
    const counts = {};
    allTaskEvents().forEach(e => { const k = dayKey(e.at); counts[k] = (counts[k] || 0) + 1; });
    let cells = '';
    for (let i = 27; i >= 0; i--) {
      const t = Date.now() - i * DAY, c = counts[dayKey(t)] || 0;
      const lvl = c === 0 ? 0 : c < 2 ? 1 : c < 4 ? 2 : c < 7 ? 3 : 4;
      cells += `<i class="h${lvl}" title="${fmtDate(t)}: ${c} tarea${c === 1 ? '' : 's'}"></i>`;
    }
    $('#heat').innerHTML = cells;

    const p = active();
    const ns = nextStep(p);
    const nx = $('#next');
    if (!ns) { nx.innerHTML = `<p class="muted">${p ? 'No queda nada pendiente.' : 'Sin guía cargada.'}</p>`; }
    else if (ns.t) {
      nx.innerHTML = `<div class="next-meta">Fase ${ns.ph.n} · ${esc(ns.ph.title)}</div>
        <div class="next-row"><button class="check" id="nextcheck" aria-label="Marcar como hecha"></button>
        <span>${esc(ns.t.text)}</span>${tagChip(ns.t.tag)}</div>`;
      $('#nextcheck').onclick = e => toggleTask(p, ns.ph, ns.t, e.currentTarget);
    } else {
      nx.innerHTML = `<div class="next-meta">Fase ${ns.ph.n} · ${esc(ns.ph.title)}</div>
        <div class="next-row"><span>Todas las tareas hechas. Falta confirmar el criterio de la fase.</span></div>
        <button class="btn primary" id="nextdone">Fase superada</button>`;
      $('#nextdone').onclick = e => completePhase(p, ns.ph, e.currentTarget);
    }
    if (!$('#bubble').textContent) $('#bubble').textContent = idleLine();
  }

  function tagChip(tag) {
    const f = familyOf(tag);
    return `<span class="tag" style="--tc:${FAMILY_INFO[f].color}">${esc(tag)}</span>`;
  }

  function renderProject() {
    const p = active();
    const sel = $('#projsel');
    const ids = Object.keys(state.projects).sort((a, b) => state.projects[b].updatedAt - state.projects[a].updatedAt);
    sel.innerHTML = ids.map(id => `<option value="${id}" ${id === state.activeId ? 'selected' : ''}>${esc(state.projects[id].roadmap.subtitle ? state.projects[id].roadmap.subtitle.replace(/^Proyecto:\s*/i, '').split('·')[0] : state.projects[id].roadmap.title)}</option>`).join('');
    sel.parentElement.hidden = ids.length < 2;
    const main = $('#main');
    if (!p) {
      main.innerHTML = `<div class="empty"><h2>Carga tu guía</h2><p>Arrastra aquí un PDF con una sección «Hoja de ruta paso a paso» y sus fases («Fase 0: …»).</p></div>`;
      return;
    }
    const rm = p.roadmap;
    let done = 0, total = 0, est = 0, real = 0, phasesDone = 0;
    rm.phases.forEach(ph => {
      const pp = p.progress.phases[ph.n] || {};
      total += ph.tasks.length; done += ph.tasks.filter(t => p.progress.tasks[t.id]).length;
      est += ph.hours; real += pp.hours || 0; if (pp.doneAt) phasesDone++;
    });
    const pct = total ? Math.round(done / total * 100) : 0;
    const vars = Array.from(new Set(rm.phases.flatMap(ph => (ph.prompt.match(/\[([A-ZÁÉÍÓÚÑ_ ]{2,20})\]/g) || []).map(m => m.slice(1, -1)))));
    const shared = vars.filter(v => rm.phases.filter(ph => ph.prompt.includes('[' + v + ']')).length > 1);

    main.innerHTML = `
      <header class="proj">
        <div class="proj-eyebrow">${esc(rm.title)}</div>
        <h1>${esc((rm.subtitle || rm.title).replace(/^Proyecto:\s*/i, '').split('·')[0].trim())}</h1>
        <p class="proj-sub">${esc((rm.subtitle || '').split('·').slice(1).join('·').trim())}</p>
        <div class="kpis">
          <div class="kpi"><b>${pct}%</b><span>${done} de ${total} tareas</span></div>
          <div class="kpi"><b>${phasesDone}/${rm.phases.length}</b><span>fases superadas</span></div>
          <div class="kpi"><b>${fmtH(real)} h</b><span>de ${fmtH(est)} h estimadas</span></div>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      </header>
      ${shared.length ? `<div class="vars"><span class="vars-l">Para los prompts</span>${shared.map(v => `
        <label class="var"><span>[${esc(v)}]</span><input id="var-${esc(v)}" data-var="${esc(v)}" value="${esc(p.vars[v] || '')}" placeholder="${v === 'VERSION' ? 'ej. 6000.0 LTS' : 'valor'}"></label>`).join('')}</div>` : ''}
      <nav class="track" aria-label="Fases">${rm.phases.map(ph => {
        const pp = p.progress.phases[ph.n] || {};
        const d = ph.tasks.filter(t => p.progress.tasks[t.id]).length;
        const k = ph.tasks.length ? d / ph.tasks.length : 0;
        return `<button class="node ${pp.doneAt ? 'is-done' : d ? 'is-going' : ''}" data-jump="${ph.n}" title="Fase ${ph.n}: ${esc(ph.title)}" style="--k:${k}">
          <span>${ph.n}</span></button>`;
      }).join('')}</nav>
      ${rm.legend && rm.legend.length ? `<div class="legend">${rm.legend.map(g => `<span>${g.tags.map(tagChip).join('')} ${esc(g.desc)}</span>`).join('')}</div>` : ''}
      <div class="phases">${rm.phases.map(ph => phaseHTML(p, ph)).join('')}</div>
      <footer class="proj-foot">
        <span>${esc(p.fileName || 'Guía precargada')} · ${rm.phases.length} fases</span>
        <span class="danger-zone" id="dz"><button class="link" id="reset">Reiniciar progreso</button></span>
      </footer>`;
    bindProject(p);
  }

  function phaseHTML(p, ph) {
    const pp = p.progress.phases[ph.n] || {};
    const d = ph.tasks.filter(t => p.progress.tasks[t.id]).length;
    const all = d === ph.tasks.length;
    const open = state.open.has(ph.n);
    const running = pp.timerStart ? (Date.now() - pp.timerStart) / 3600000 : 0;
    const hours = (pp.hours || 0) + running;
    const diff = hours - ph.hours;
    const vars = Array.from(new Set((ph.prompt.match(/\[([A-ZÁÉÍÓÚÑ_ ]{2,20})\]/g) || []).map(m => m.slice(1, -1))));
    const promptShown = esc(ph.prompt).replace(/\[([A-ZÁÉÍÓÚÑ_ ]{2,20})\]/g, (m, k) => p.vars[k] ? `<mark>${esc(p.vars[k])}</mark>` : `<mark class="hole">[${k}]</mark>`);
    return `
    <section class="phase ${pp.doneAt ? 'done' : ''} ${open ? 'open' : ''}" id="ph-${ph.n}" data-n="${ph.n}">
      <button class="ph-head" data-toggle="${ph.n}" aria-expanded="${open}">
        <span class="ph-num">${ph.n}</span>
        <span class="ph-title"><b>${esc(ph.title)}</b><small>${esc(ph.meta)}</small></span>
        <span class="ph-side">
          <span class="ph-est">${ph.hours ? fmtH(ph.hours) + ' h' : ''}${ph.weeks ? ' · sem. ' + esc(ph.weeks) : ''}</span>
          <span class="ph-count">${pp.doneAt ? 'Superada' : d + '/' + ph.tasks.length}</span>
        </span>
      </button>
      <div class="ph-body" ${open ? '' : 'hidden'}>
        ${ph.fields.length ? `<div class="fields">${ph.fields.map(f => `<div class="field ${/^Listo/i.test(f.k) ? 'f-done' : /Claude/i.test(f.k) ? 'f-claude' : ''}"><h4>${esc(f.k)}</h4><p>${esc(f.v)}</p></div>`).join('')}</div>` : ''}
        <ul class="tasks">${ph.tasks.map(t => {
          const on = !!p.progress.tasks[t.id];
          return `<li class="${on ? 'on' : ''}"><button class="check" data-task="${t.id}" role="checkbox" aria-checked="${on}" aria-label="${esc(t.text)}"></button>
            <span class="t-text">${esc(t.text)}</span>${tagChip(t.tag)}</li>`;
        }).join('')}</ul>
        <div class="gate">
          ${pp.doneAt
            ? `<span class="gate-ok">Superada el ${fmtDate(pp.doneAt)} · +${pp.xp} de calor</span><button class="link" data-reopen="${ph.n}">Reabrir</button>`
            : `<button class="btn primary" data-complete="${ph.n}" ${all ? '' : 'disabled'}>Fase superada</button>
               <span class="muted">${all ? 'Confirma solo si se cumple el criterio «Listo cuando».' : `Faltan ${ph.tasks.length - d} tareas.`}</span>`}
        </div>
        ${ph.prompt ? `<div class="prompt">
          <div class="prompt-head"><span>Prompt para Claude</span>
            <span class="prompt-actions"><button class="btn small" data-copy="${ph.n}">Copiar prompt</button><button class="btn small ghost" data-copyctx="${ph.n}">Copiar con contexto</button></span></div>
          ${vars.filter(v => !p.vars[v]).length ? `<div class="prompt-vars">${vars.map(v => `<label class="var"><span>[${esc(v)}]</span><input id="pv-${ph.n}-${esc(v)}" data-var="${esc(v)}" value="${esc(p.vars[v] || '')}" placeholder="completa antes de copiar"></label>`).join('')}</div>` : ''}
          <pre>${promptShown}</pre>
          ${p.progress.prompts[ph.n] ? '' : '<div class="prompt-hint">Copiarlo por primera vez da +3 de calor.</div>'}
        </div>` : ''}
        <div class="ask">
          <label for="ask-${ph.n}">Preguntarle a Claude sobre esta fase</label>
          <div class="ask-row"><textarea id="ask-${ph.n}" rows="2" placeholder="Ej.: Me trabé con el AudioMixer, ¿por dónde parto?"></textarea>
          <button class="btn" data-ask="${ph.n}">Preguntar</button></div>
          <div class="ask-out" id="askout-${ph.n}" hidden></div>
        </div>
        <div class="record">
          <div><span class="rl">Inicio real</span><b>${fmtDate(pp.startAt)}</b></div>
          <div><span class="rl">Término real</span><b>${fmtDate(pp.doneAt)}</b></div>
          <div><label class="rl" for="hrs-${ph.n}">Horas reales</label>
            <span class="hrs"><input id="hrs-${ph.n}" type="number" min="0" step="0.5" inputmode="decimal" data-hours="${ph.n}" value="${hours ? Math.round(hours * 100) / 100 : ''}" placeholder="0" ${pp.timerStart ? 'disabled' : ''}>
            <button class="btn small ${pp.timerStart ? 'rec' : 'ghost'}" data-timer="${ph.n}">${pp.timerStart ? 'Detener' : 'Cronómetro'}</button></span></div>
          <div><span class="rl">Diferencia</span><b class="${hours ? (diff > 0 ? 'over' : 'under') : ''}">${hours ? (diff > 0 ? '+' : '') + fmtH(diff) + ' h' : '—'}</b></div>
        </div>
      </div>
    </section>`;
  }

  function bindProject(p) {
    const main = $('#main');
    const phaseByN = n => p.roadmap.phases.find(x => String(x.n) === String(n));
    main.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.toggle != null) {
        const n = Number(b.dataset.toggle);
        state.open.has(n) ? state.open.delete(n) : state.open.add(n);
        const sec = $('#ph-' + n); sec.classList.toggle('open'); sec.querySelector('.ph-body').hidden = !state.open.has(n);
        b.setAttribute('aria-expanded', state.open.has(n));
      } else if (b.dataset.jump != null) {
        const n = Number(b.dataset.jump);
        if (!state.open.has(n)) { state.open.add(n); renderProject(); }
        $('#ph-' + n).scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (b.dataset.task) {
        const ph = phaseByN(b.closest('.phase').dataset.n);
        toggleTask(p, ph, ph.tasks.find(t => t.id === b.dataset.task), b);
      } else if (b.dataset.complete != null) completePhase(p, phaseByN(b.dataset.complete), b);
      else if (b.dataset.reopen != null) reopenPhase(p, phaseByN(b.dataset.reopen));
      else if (b.dataset.timer != null) {
        const ph = phaseByN(b.dataset.timer);
        (p.progress.phases[ph.n] || {}).timerStart ? stopTimer(p, ph) : startTimer(p, ph);
      } else if (b.dataset.copy != null || b.dataset.copyctx != null) {
        const ph = phaseByN(b.dataset.copy != null ? b.dataset.copy : b.dataset.copyctx);
        const text = b.dataset.copy != null ? fillVars(p, ph.prompt) : contextPrompt(p, ph);
        copyText(text, b).then(ok => {
          if (ok && !p.progress.prompts[ph.n]) {
            p.progress.prompts[ph.n] = true; touch(p);
            flame.feed(0.3); renderCompanion();
            say('Prompt copiado: +3. Pégalo en Claude y vuelve con el código.');
            const hint = b.closest('.prompt').querySelector('.prompt-hint'); if (hint) hint.remove();
          }
        });
      } else if (b.dataset.ask != null) ask(p, phaseByN(b.dataset.ask), b);
      else if (b.id === 'reset') {
        $('#dz').innerHTML = `<span>¿Borrar todo el progreso de esta guía?</span><button class="link danger" id="reset-yes">Sí, reiniciar</button><button class="link" id="reset-no">Cancelar</button>`;
      } else if (b.id === 'reset-yes') {
        p.progress = { tasks: {}, phases: {}, prompts: {} }; touch(p); renderAll(); say('Empezamos de cero. Yo sigo aquí.');
      } else if (b.id === 'reset-no') renderProject();
    };
    main.oninput = e => {
      const el = e.target;
      if (el.dataset.var) {
        p.vars[el.dataset.var] = el.value;
        document.querySelectorAll(`[data-var="${CSS.escape(el.dataset.var)}"]`).forEach(o => { if (o !== el) o.value = el.value; });
        clearTimeout(main._vt); main._vt = setTimeout(() => {
          touch(p);
          p.roadmap.phases.forEach(ph => {
            const pre = $('#ph-' + ph.n + ' pre'); if (!pre) return;
            pre.innerHTML = esc(ph.prompt).replace(/\[([A-ZÁÉÍÓÚÑ_ ]{2,20})\]/g, (m, k) => p.vars[k] ? `<mark>${esc(p.vars[k])}</mark>` : `<mark class="hole">[${k}]</mark>`);
          });
        }, 350);
      }
    };
    main.onchange = e => {
      const el = e.target;
      if (el.dataset.hours != null) {
        const ph = phaseByN(el.dataset.hours);
        const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
        pp.hours = Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0);
        if (pp.hours && !pp.startAt) pp.startAt = Date.now();
        touch(p); renderAll();
      }
    };
  }

  async function ask(p, ph, btn) {
    const ta = $('#ask-' + ph.n), out = $('#askout-' + ph.n);
    const q = ta.value.trim();
    if (!q || !state.sample) return;
    btn.disabled = true; out.hidden = false; out.textContent = 'Pensando…';
    const prompt = `Eres un mentor práctico que ayuda a una persona a avanzar en su proyecto, fase por fase. Responde en español, breve (máximo 8 líneas), con pasos concretos. Si hace falta código, solo un fragmento corto.\n\nContexto de la fase:\n${contextPrompt(p, ph)}\n\nPregunta: ${q}`;
    try {
      const r = await state.sample(prompt, { cache: false, onText: ({ text }) => { out.textContent = text; } });
      out.textContent = r.text;
    } catch (e) {
      out.textContent = e && e.code === 'rate_limited' ? 'Claude está ocupado. Intenta en un rato.' :
        e && e.code === 'not_granted' ? 'Sin permiso para preguntar a Claude desde esta página.' : 'No pude obtener respuesta. Revisa tu conexión e intenta otra vez.';
      if (e && e.code === 'not_granted') document.body.classList.remove('can-ask');
    } finally { btn.disabled = false; }
  }

  // ---------- carga de PDF ----------
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script'));
      document.head.appendChild(s);
    });
  }
  async function ensurePdfjs() {
    if (window.pdfjsLib && window.pdfjsWorker) return window.pdfjsLib;
    await loadScript(PDFJS + 'pdf.min.js');
    await loadScript(PDFJS + 'pdf.worker.min.js'); // corre en el hilo principal, sin Worker externo
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    return window.pdfjsLib;
  }
  async function handleFile(file) {
    if (!file) return;
    const st = $('#loadstate');
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { st.textContent = 'Ese archivo no es un PDF.'; return; }
    st.textContent = 'Leyendo ' + file.name + '…';
    try {
      const lib = await ensurePdfjs();
      const rm = await window.RoadmapParser.parsePdf(lib, new Uint8Array(await file.arrayBuffer()));
      if (!rm || !rm.phases.length) { st.textContent = 'No encontré fases («Fase 0: …») en este PDF.'; return; }
      const id = 'p_' + rm.key;
      const existing = state.projects[id];
      if (existing) {
        existing.roadmap = rm; existing.fileName = file.name;
        const ids = new Set(rm.phases.flatMap(ph => ph.tasks.map(t => t.id)));
        Object.keys(existing.progress.tasks).forEach(k => { if (!ids.has(k)) delete existing.progress.tasks[k]; });
        st.textContent = 'Guía actualizada. Conservé tu progreso.';
      } else {
        state.projects[id] = newProject(rm, file.name);
        st.textContent = `Listo: ${rm.phases.length} fases, ${rm.phases.reduce((a, ph) => a + ph.tasks.length, 0)} tareas.`;
      }
      state.activeId = id;
      state.open = new Set();
      const ns = nextStep(state.projects[id]); if (ns) state.open.add(ns.ph.n);
      touch(state.projects[id]);
      renderAll();
      say(existing ? 'Misma guía, nueva versión. No perdí nada.' : `Leña nueva: ${rm.phases.length} fases. ¡A arder!`, true);
    } catch (e) {
      st.textContent = e && e.message === 'script' ? 'No pude cargar el lector de PDF. Revisa tu conexión.' : 'No pude leer ese PDF. ¿Está protegido o es una imagen escaneada?';
    }
  }

  // ---------- inicio ----------
  function boot() {
    flame = window.BrasaFlame($('#flame'));
    loadLocal();
    if (!Object.keys(state.projects).length && window.SAMPLE_ROADMAP) {
      const p = newProject(window.SAMPLE_ROADMAP, '');
      p.untouched = true;
      state.projects[p.id] = p;
    }
    if (!state.projects[state.activeId]) state.activeId = Object.keys(state.projects)[0] || null;
    const ns = nextStep(active()); if (ns) state.open.add(ns.ph.n);
    renderAll();
    $('#bubble').textContent = idleLine();

    $('#file').onchange = e => { handleFile(e.target.files[0]); e.target.value = ''; };
    const drop = document.body;
    drop.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragging'); });
    drop.addEventListener('dragleave', e => { if (e.target === document.body || !e.relatedTarget) document.body.classList.remove('dragging'); });
    drop.addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('dragging'); handleFile(e.dataTransfer.files[0]); });
    $('#projsel').onchange = e => {
      state.activeId = e.target.value; state.open = new Set();
      const n = nextStep(active()); if (n) state.open.add(n.ph.n);
      persistLocal(); renderAll(); $('#bubble').textContent = idleLine();
    };
    const snd = $('#sound');
    const syncSound = () => { snd.setAttribute('aria-pressed', state.sound); snd.textContent = state.sound ? 'Sonido: sí' : 'Sonido: no'; };
    syncSound();
    snd.onclick = () => { state.sound = !state.sound; lsSet(LS_SOUND, state.sound ? 'on' : 'off'); syncSound(); if (state.sound) crackle(1); };
    $('#flame').onclick = () => { flame.feed(0.25); say(idleLine()); };

    // refresca cronómetros y el ánimo de Brasa
    setInterval(() => {
      const p = active();
      if (p && Object.values(p.progress.phases).some(x => x.timerStart)) {
        p.roadmap.phases.forEach(ph => {
          const pp = p.progress.phases[ph.n];
          const inp = $('#hrs-' + ph.n);
          if (pp && pp.timerStart && inp) inp.value = Math.round(((pp.hours || 0) + (Date.now() - pp.timerStart) / 3600000) * 100) / 100;
        });
      }
    }, 15000);
    connectCloud();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
