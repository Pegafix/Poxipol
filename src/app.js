// Mochi Roadmap: cada guía en PDF es una misión principal; cada tarea que tachas alimenta a Mochi.
(function () {
  'use strict';

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const LS_PROJECTS = 'brasa.v1.projects', LS_ACTIVE = 'brasa.v1.active', LS_SOUND = 'brasa.v1.sound', LS_PROFILE = 'brasa.v1.profile';
  const DAY = 86400000;

  const FAMILY = { UNITY: 'build', CLAUDE: 'claude', PRUEBA: 'test' };
  const FAMILY_INFO = {
    build: { label: 'Construir', color: '#5b8cff' },
    claude: { label: 'Delegar', color: '#2fbf8f' },
    create: { label: 'Crear', color: '#f0b429' },
    test: { label: 'Probar', color: '#ff5d6c' }
  };
  const STAGES = [
    { min: 1, name: 'Semilla' }, { min: 2, name: 'Bolita' }, { min: 4, name: 'Pompón' },
    { min: 6, name: 'Nube' }, { min: 9, name: 'Luna' }, { min: 12, name: 'Estrella' }
  ];
  const familyOf = tag => FAMILY[tag] || 'create';

  const SLOTS = { head: 'Cabeza', face: 'Cara', neck: 'Cuello', base: 'Base', aura: 'Aura' };
  const ITEMS = [
    { id: 'gorro', slot: 'head', name: 'Gorro de lana', perk: { fam: 'create', xp: 2 }, req: { type: 'level', n: 2 },
      svg: '<path d="M8 26a12 12 0 0 1 24 0z" fill="#c8423b"/><rect x="6" y="24" width="28" height="7" rx="3.5" fill="#efe6d2"/><circle cx="20" cy="10" r="4" fill="#efe6d2"/>' },
    { id: 'casco', slot: 'head', name: 'Casco minero', perk: { fam: 'build', xp: 2 }, req: { type: 'fam', fam: 'build', n: 10 },
      svg: '<path d="M8 27a12 11 0 0 1 24 0z" fill="#f2b630"/><ellipse cx="20" cy="27" rx="15" ry="3" fill="#f2b630"/><circle cx="20" cy="19" r="4" fill="#fff6c0" stroke="#5a4a2a" stroke-width="2"/>' },
    { id: 'mago', slot: 'head', name: 'Sombrero de mago', perk: { fam: 'claude', xp: 2 }, req: { type: 'fam', fam: 'claude', n: 10 },
      svg: '<path d="M9 30Q18 17 27 4L31 30z" fill="#5b3fa8"/><ellipse cx="20" cy="30" rx="16" ry="3.5" fill="#5b3fa8"/><circle cx="20" cy="21" r="2.4" fill="#ffd95a"/><circle cx="25" cy="13" r="1.6" fill="#ffd95a"/>' },
    { id: 'corona', slot: 'head', name: 'Corona', perk: { all: 2 }, req: { type: 'missions', n: 1 },
      svg: '<path d="M8 31L7 13l7 7 6-12 6 12 7-7-1 18z" fill="#f5c542"/><circle cx="20" cy="24" r="2.8" fill="#e0465b"/><circle cx="12.5" cy="26" r="1.8" fill="#3fb3e0"/><circle cx="27.5" cy="26" r="1.8" fill="#3fb3e0"/>' },
    { id: 'lentes', slot: 'face', name: 'Lentes redondos', perk: { fam: 'claude', xp: 1 }, req: { type: 'prompts', n: 3 },
      svg: '<g fill="none" stroke="#2a1206" stroke-width="2.6"><circle cx="12" cy="21" r="6.5"/><circle cx="28" cy="21" r="6.5"/><path d="M18 20q2-2.5 4 0"/></g>' },
    { id: 'antifaz', slot: 'face', name: 'Antifaz de prueba', perk: { fam: 'test', xp: 3 }, req: { type: 'fam', fam: 'test', n: 5 },
      svg: '<path d="M3 19q17-11 34 0q-4 9-11 7l-6-3-6 3q-7 2-11-7z" fill="#20232b"/><ellipse cx="13" cy="20" rx="3.5" ry="2.5" fill="#fffaf0"/><ellipse cx="27" cy="20" rx="3.5" ry="2.5" fill="#fffaf0"/>' },
    { id: 'monoculo', slot: 'face', name: 'Monóculo', perk: { phase: 10 }, req: { type: 'phases', n: 3 },
      svg: '<circle cx="18" cy="16" r="8.5" fill="none" stroke="#c9a23a" stroke-width="2.8"/><path d="M24 22q7 6 3 14" stroke="#c9a23a" stroke-width="1.6" fill="none"/>' },
    { id: 'bufanda', slot: 'neck', name: 'Bufanda a rayas', perk: { daily: 5 }, req: { type: 'streak', n: 3 },
      svg: '<rect x="5" y="13" width="30" height="9" rx="4.5" fill="#d7463c"/><rect x="24" y="18" width="7" height="16" rx="2" fill="#d7463c"/><path d="M11 13v9M17 13v9M23 13v9M24 29h7" stroke="#f3ead8" stroke-width="2.6"/>' },
    { id: 'corbatin', slot: 'neck', name: 'Corbatín', perk: { phase: 10 }, req: { type: 'phases', n: 1 },
      svg: '<path d="M20 20L6 11v18zM20 20l14-9v18z" fill="#3b6fd8"/><circle cx="20" cy="20" r="4" fill="#2a54b0"/>' },
    { id: 'piedras', slot: 'base', name: 'Cojín mullido', perk: { all: 1 }, req: { type: 'tasks', n: 25 },
      svg: '<ellipse cx="20" cy="26" rx="17" ry="7" fill="#9b7fd1"/><ellipse cx="20" cy="22" rx="14" ry="4.5" fill="#b39ce0"/><circle cx="20" cy="23" r="1.6" fill="#7a5fb3"/>' },
    { id: 'brasero', slot: 'base', name: 'Pila de libros', perk: { all: 1 }, req: { type: 'level', n: 5 },
      svg: '<rect x="6" y="27" width="28" height="6" rx="1.5" fill="#81b29a"/><rect x="8" y="21" width="26" height="6" rx="1.5" fill="#e07a5f"/><rect x="5" y="15" width="27" height="6" rx="1.5" fill="#5b7bd6"/>' },
    { id: 'luciernagas', slot: 'aura', name: 'Luciérnagas', perk: { quest: 5 }, req: { type: 'days', n: 7 },
      svg: '<g fill="#e6ff8c"><circle cx="10" cy="12" r="3"/><circle cx="29" cy="9" r="2.4"/><circle cx="21" cy="24" r="3.2"/><circle cx="8" cy="30" r="2"/><circle cx="32" cy="28" r="2.6"/></g>' },
    { id: 'chispas', slot: 'aura', name: 'Chispas azules', perk: { fam: 'build', xp: 1 }, req: { type: 'hours', n: 10 },
      svg: '<g fill="#7fc4ff"><path d="M12 6l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M28 18l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z"/></g>' },
    { id: 'estrellas', slot: 'aura', name: 'Polvo de estrellas', perk: { all: 2 }, req: { type: 'level', n: 9 },
      svg: '<g fill="#ffe9a8"><path d="M20 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="M32 26l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/><path d="M8 26l1.2 3 3 1.2-3 1.2L8 34.6l-1.2-3-3-1.2 3-1.2z"/></g>' }
  ];
  const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  const DAILY = [
    { id: 't3', text: 'Tacha 3 tareas', goal: 3, xp: 15, prog: d => d.tasks },
    { id: 't5', text: 'Tacha 5 tareas', goal: 5, xp: 25, prog: d => d.tasks },
    { id: 'test', text: 'Completa una tarea de prueba', goal: 1, xp: 15, prog: d => d.fam.test },
    { id: 'claude', text: 'Delega una tarea a Claude', goal: 1, xp: 10, prog: d => d.fam.claude },
    { id: 'build', text: 'Construye: 2 tareas en el editor', goal: 2, xp: 15, prog: d => d.fam.build },
    { id: 'create', text: 'Crea: 1 tarea de diseño, audio o arte', goal: 1, xp: 10, prog: d => d.fam.create },
    { id: 'prompt', text: 'Copia un prompt para Claude', goal: 1, xp: 10, prog: d => d.prompts },
    { id: 'combo', text: 'Logra un combo: 3 tareas en 20 minutos', goal: 1, xp: 20, prog: d => d.combo }
  ];

  // ---------- utilidades ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const fmtDate = t => t ? new Date(t).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—';
  const fmtH = h => (Math.round(h * 10) / 10).toLocaleString('es', { maximumFractionDigits: 1 });
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------- estado ----------
  const state = {
    projects: {},   // id -> misión principal (una por PDF)
    profile: null,  // nombre, equipo, recompensas diarias
    activeId: null,
    screen: 'home',
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
  function newProfile() {
    return { name: 'Mochi', equipped: {}, unlocked: {}, claims: {}, claimedXp: 0, theme: 'system', updatedAt: 0 };
  }
  const active = () => state.projects[state.activeId] || null;
  const missionTitle = p => (p.roadmap.subtitle || p.roadmap.title).replace(/^Proyecto:\s*/i, '').split('·')[0].trim() || p.roadmap.title;

  // ---------- persistencia ----------
  const saveTimers = {}, saving = {};
  function persistLocal() {
    lsSet(LS_PROJECTS, JSON.stringify(state.projects));
    lsSet(LS_PROFILE, JSON.stringify(state.profile));
    lsSet(LS_ACTIVE, state.activeId || '');
  }
  function queueRemote(id) {
    if (!state.db || !state.uid) return;
    clearTimeout(saveTimers[id]);
    saveTimers[id] = setTimeout(() => saveRemote(id), 700);
  }
  function touch(p) {
    p.updatedAt = Date.now();
    p.untouched = false;
    persistLocal();
    queueRemote(p.id);
  }
  function touchProfile() {
    state.profile.updatedAt = Date.now();
    persistLocal();
    queueRemote('profile');
  }
  async function saveRemote(id) {
    if (saving[id]) { saveTimers[id] = setTimeout(() => saveRemote(id), 400); return; }
    const body = id === 'profile' ? state.profile : state.projects[id];
    saving[id] = true;
    try {
      const ref = state.db.collection('data/users/' + state.uid).doc(id);
      if (!body) await ref.delete();
      else await ref.set(JSON.parse(JSON.stringify(body)));
      setSync('Guardado en tu cuenta');
    } catch (e) {
      setSync(e && e.code === 'quota_exceeded' ? 'Sin espacio en la nube: queda guardado en este navegador' : 'Guardado solo en este navegador');
    } finally { saving[id] = false; }
  }
  function setSync(t) { $$('[data-sync]').forEach(el => (el.textContent = t)); }

  function loadLocal() {
    try { state.projects = JSON.parse(lsGet(LS_PROJECTS) || '{}') || {}; } catch (e) { state.projects = {}; }
    try { state.profile = Object.assign(newProfile(), JSON.parse(lsGet(LS_PROFILE) || '{}') || {}); } catch (e) { state.profile = newProfile(); }
    if (state.profile.name === 'Brasa') state.profile.name = 'Mochi';
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
      const remoteAt = {};
      snap.docs.forEach(d => {
        if (!d.exists) return;
        const remote = d.data();
        remoteAt[d.id] = remote.updatedAt || 0;
        if (d.id === 'profile') {
          if ((remote.updatedAt || 0) > (state.profile.updatedAt || 0)) { state.profile = Object.assign(newProfile(), JSON.parse(JSON.stringify(remote))); if (state.profile.name === 'Brasa') state.profile.name = 'Mochi'; changed = true; }
          return;
        }
        if (!d.id.startsWith('p_')) return;
        const local = state.projects[d.id];
        if (!local || local.untouched || (remote.updatedAt || 0) > (local.updatedAt || 0)) {
          state.projects[d.id] = JSON.parse(JSON.stringify(remote)); changed = true;
        }
      });
      // Sube lo que solo existe (o es más nuevo) en este navegador.
      Object.values(state.projects).forEach(p => { if (!p.untouched && (remoteAt[p.id] || 0) < p.updatedAt) saveRemote(p.id); });
      if (state.profile.updatedAt && (remoteAt.profile || 0) < state.profile.updatedAt) saveRemote('profile');
      setSync('Guardado en tu cuenta');
      if (changed) { persistLocal(); if (!active()) state.activeId = Object.keys(state.projects)[0] || null; applyTheme(); renderAll(); }
    } catch (e) { setSync('Guardado en este navegador'); }
    try { state.sample = await window.claude.use('sample'); } catch (e) { state.sample = null; }
    if (state.sample) document.body.classList.add('can-ask');
  }

  // ---------- puntos y logros ----------
  function allTaskEvents() {
    const ev = [];
    Object.values(state.projects).forEach(p => {
      const byId = {};
      p.roadmap.phases.forEach(ph => ph.tasks.forEach(t => (byId[t.id] = t)));
      Object.entries(p.progress.tasks).forEach(([id, v]) => ev.push({ at: v.at, xp: v.xp, tag: byId[id] ? byId[id].tag : '' }));
    });
    return ev;
  }
  function missionDone(p) { return p.roadmap.phases.length > 0 && p.roadmap.phases.every(ph => (p.progress.phases[ph.n] || {}).doneAt); }
  function totals() {
    let xp = state.profile.claimedXp || 0, phases = 0, prompts = 0, hours = 0, missions = 0, last = 0;
    Object.values(state.profile.claims).forEach(day => Object.values(day).forEach(v => (xp += v)));
    const fam = { build: 0, claude: 0, create: 0, test: 0 };
    const days = new Set();
    Object.values(state.projects).forEach(p => {
      Object.values(p.progress.phases).forEach(v => {
        xp += v.xp || 0; hours += v.hours || 0;
        if (v.doneAt) { phases++; last = Math.max(last, v.doneAt); }
      });
      Object.keys(p.progress.prompts).forEach(() => { xp += 3; prompts++; });
      if (missionDone(p)) missions++;
    });
    const events = allTaskEvents();
    events.forEach(e => { xp += e.xp; fam[familyOf(e.tag)]++; days.add(dayKey(e.at)); last = Math.max(last, e.at); });
    return { xp, fam, days, last, phases, prompts, hours, missions, tasks: events.length, events };
  }
  function levelOf(xp) {
    // Curva empinada: cada nivel pide bastante más que el anterior (60, 170, 312, 480, 671…).
    const needFor = L => Math.round(60 * Math.pow(L, 1.5));
    let L = 1, need = needFor(1), rest = xp;
    while (rest >= need) { rest -= need; L++; need = needFor(L); }
    return { L, into: rest, need };
  }
  function stageOf(L) { let s = 0; STAGES.forEach((x, i) => { if (L >= x.min) s = i; }); return s; }
  function streakOf(days) {
    let n = 0, t = Date.now();
    if (!days.has(dayKey(t))) t -= DAY; // la racha sigue viva si ayer hubo avance
    while (days.has(dayKey(t))) { n++; t -= DAY; }
    return n;
  }
  // Vida, maná y estamina del día.
  // HP: constancia; baja 25 por cada día sin avanzar. MP: aprendizaje del día (tareas de Claude y prompts copiados).
  // Estamina: trabajo del día; cada tarea suma 20.
  function vitals(tot) {
    const idle = tot.last ? Math.floor((startOfDay(Date.now()) - startOfDay(tot.last)) / DAY) : 0;
    const hp = Math.max(5, 100 - Math.max(0, idle - 1) * 25);
    const d = todayStats();
    const mp = Math.min(100, (d.fam.claude + d.prompts) * 25);
    const sta = Math.min(100, d.tasks * 20);
    return { hp, mp, sta, idle };
  }
  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function comboNow() {
    const now = Date.now();
    return allTaskEvents().filter(e => now - e.at < 20 * 60000).length;
  }
  function reqProgress(req, tot) {
    const lv = levelOf(tot.xp).L;
    const have = {
      level: lv, fam: tot.fam[req.fam] || 0, missions: tot.missions, prompts: tot.prompts, phases: tot.phases,
      streak: streakOf(tot.days), tasks: tot.tasks, days: tot.days.size, hours: Math.floor(tot.hours)
    }[req.type] || 0;
    return { have: Math.min(have, req.n), need: req.n };
  }
  function reqText(req) {
    return {
      level: `Llega al nivel ${req.n}`,
      fam: `Completa ${req.n} tareas de ${FAMILY_INFO[req.fam] ? FAMILY_INFO[req.fam].label.toLowerCase() : ''}`,
      missions: req.n === 1 ? 'Termina una misión principal' : `Termina ${req.n} misiones principales`,
      prompts: `Copia ${req.n} prompts para Claude`,
      phases: req.n === 1 ? 'Supera una fase' : `Supera ${req.n} fases`,
      streak: `Racha de ${req.n} días`,
      tasks: `Completa ${req.n} tareas`,
      days: `Avanza en ${req.n} días distintos`,
      hours: `Registra ${req.n} horas reales`
    }[req.type];
  }
  function perkText(perk) {
    if (perk.all) return `+${perk.all} de energía por cada tarea`;
    if (perk.fam) return `+${perk.xp} por tarea de ${FAMILY_INFO[perk.fam].label.toLowerCase()}`;
    if (perk.phase) return `+${perk.phase} al superar una fase`;
    if (perk.daily) return `+${perk.daily} con la primera tarea del día`;
    if (perk.quest) return `+${perk.quest} por misión diaria`;
    return '';
  }
  function perkBonus(kind, fam) {
    let b = 0;
    Object.values(state.profile.equipped).forEach(id => {
      const it = ITEM[id]; if (!it) return;
      const k = it.perk;
      if (kind === 'task') { if (k.all) b += k.all; if (k.fam && k.fam === fam) b += k.xp; }
      if (kind === 'phase' && k.phase) b += k.phase;
      if (kind === 'daily' && k.daily) b += k.daily;
      if (kind === 'quest' && k.quest) b += k.quest;
    });
    return b;
  }
  // Desbloquea el equipo cuyo requisito ya se cumple. Lo ganado se queda aunque luego se desmarque algo.
  function checkUnlocks(silent) {
    const tot = totals();
    const fresh = ITEMS.filter(it => !state.profile.unlocked[it.id] && reqProgress(it.req, tot).have >= it.req.n);
    if (!fresh.length) return;
    fresh.forEach(it => (state.profile.unlocked[it.id] = Date.now()));
    state.profile.newItems = (state.profile.newItems || []).concat(fresh.map(i => i.id));
    touchProfile();
    if (!silent) say(`¡Encontré ${fresh.length > 1 ? fresh.length + ' cosas' : '«' + fresh[0].name + '»'}! Míralo en Equipo.`, true);
  }

  // ---------- misiones diarias ----------
  function todaysQuests() {
    const k = dayKey(Date.now());
    let seed = hashStr(k);
    const rnd = () => (seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0, seed / 4294967296);
    const main = rnd() < 0.5 ? DAILY[0] : DAILY[1];
    const rest = DAILY.slice(2).map(q => [rnd(), q]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(x => x[1]);
    return [main, ...rest];
  }
  function todayStats() {
    const k = dayKey(Date.now());
    const ev = allTaskEvents().filter(e => dayKey(e.at) === k).sort((a, b) => a.at - b.at);
    const fam = { build: 0, claude: 0, create: 0, test: 0 };
    ev.forEach(e => fam[familyOf(e.tag)]++);
    let combo = 0;
    for (let i = 2; i < ev.length; i++) if (ev[i].at - ev[i - 2].at <= 20 * 60000) combo = 1;
    let prompts = 0;
    Object.values(state.projects).forEach(p => Object.values(p.progress.prompts).forEach(v => { if (typeof v === 'number' && dayKey(v) === k) prompts++; }));
    return { tasks: ev.length, fam, combo, prompts };
  }
  function questState() {
    const k = dayKey(Date.now()), d = todayStats(), claims = state.profile.claims[k] || {};
    return todaysQuests().map(q => {
      const have = Math.min(q.goal, q.prog(d));
      return { q, have, ready: have >= q.goal && !claims[q.id], claimed: !!claims[q.id] };
    });
  }
  function claimQuest(id, el) {
    const k = dayKey(Date.now());
    const qs = questState().find(x => x.q.id === id);
    if (!qs || !qs.ready) return;
    const xp = qs.q.xp + perkBonus('quest');
    const before = levelOf(totals().xp).L;
    // Guarda solo la última semana día a día; lo anterior queda sumado.
    const claims = state.profile.claims;
    Object.keys(claims).forEach(day => {
      const [y, m, dd] = day.split('-').map(Number);
      if (Date.now() - new Date(y, m - 1, dd).getTime() > 8 * DAY) {
        Object.values(claims[day]).forEach(v => (state.profile.claimedXp += v)); delete claims[day];
      }
    });
    (claims[k] || (claims[k] = {}))[id] = xp;
    touchProfile();
    sparkFrom(el, 'create', () => { feedAll(0.8); crackle(1.5); });
    floatXP(el, '+' + xp);
    const after = levelOf(totals().xp).L;
    checkUnlocks(true);
    renderAll();
    say(after > before ? `Misión diaria cumplida. ¡Nivel ${after}!` : `Misión diaria cumplida: +${xp}.`, after > before);
  }

  // ---------- acciones sobre tareas ----------
  function toggleTask(p, ph, t, fromEl) {
    const prog = p.progress;
    const pp = prog.phases[ph.n] || (prog.phases[ph.n] = {});
    state.activeId = p.id;
    if (prog.tasks[t.id]) {
      delete prog.tasks[t.id];
      if (pp.doneAt) { delete pp.doneAt; pp.xp = 0; }
      touch(p); renderAll();
      say('Lo dejé pendiente otra vez. Sin drama.');
      return;
    }
    const tot = totals();
    const before = levelOf(tot.xp).L;
    const firstToday = !tot.days.has(dayKey(Date.now()));
    const combo = comboNow();
    const mult = combo >= 4 ? 2 : combo >= 2 ? 1.5 : 1;
    let xp = Math.round(((t.tag === 'PRUEBA' ? 12 : 10) + perkBonus('task', familyOf(t.tag))) * mult);
    if (firstToday) xp += 5 + 2 * Math.min(10, streakOf(tot.days)) + perkBonus('daily');
    prog.tasks[t.id] = { at: Date.now(), xp };
    if (!pp.startAt) pp.startAt = Date.now();
    touch(p);
    sparkFrom(fromEl, familyOf(t.tag), () => { feedAll(mult > 1 ? 1 : 0.6); crackle(mult); });
    floatXP(fromEl, '+' + xp + (mult > 1 ? ' ×' + mult : ''));
    const after = levelOf(totals().xp).L;
    checkUnlocks(true);
    renderAll();
    const ready = questState().filter(x => x.ready).length;
    if (after > before) {
      const s = STAGES[stageOf(after)].name;
      say(stageOf(after) > stageOf(before) ? `¡Evolucioné! Ahora soy ${s}. Nivel ${after}.` : `¡Nivel ${after}! Me siento más esponjoso.`, true);
    } else if ((state.profile.newItems || []).length) {
      say('¡Encontré equipo nuevo! Pruébamelo en Equipo.', true);
    } else if (ready) {
      say(`Tienes ${ready === 1 ? 'una misión diaria' : ready + ' misiones diarias'} para reclamar.`);
    } else if (firstToday) {
      const st = streakOf(totals().days);
      say(`Primer bocado del día: +${xp}.${st > 1 ? ' Racha de ' + st + ' días.' : ''}`);
    } else if (mult > 1) {
      say(pick([`Combo ×${mult}. No pares ahora.`, `¡Ñam! Combo ×${mult}.`]));
    } else {
      const left = ph.tasks.filter(x => !prog.tasks[x.id]).length;
      say(left ? pick([`+${xp}. Quedan ${left} en «${ph.title}».`, `Ñam. ${left} más y la fase está.`, `+${xp} de energía. :3`]) :
        `Todas las tareas de «${ph.title}» listas. Confirma: ${(ph.fields.find(f => /^Listo/i.test(f.k)) || {}).v || 'la fase está terminada'}.`);
    }
  }

  function completePhase(p, ph, fromEl) {
    const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
    if (pp.doneAt) return;
    const before = levelOf(totals().xp).L;
    let xp = 40 + 5 * ph.tasks.length + perkBonus('phase');
    if (pp.hours > 0 && ph.hours > 0 && pp.hours <= ph.hours) xp = Math.round(xp * 1.2);
    if (pp.timerStart) stopTimer(p, ph, true);
    pp.doneAt = Date.now(); pp.xp = xp;
    touch(p);
    sparkFrom(fromEl, 'create', () => { feedAll(1.4); crackle(2); });
    floatXP(fromEl, '+' + xp);
    const after = levelOf(totals().xp).L;
    state.open.delete(ph.n);
    const next = p.roadmap.phases.find(x => !(p.progress.phases[x.n] || {}).doneAt);
    if (next) state.open.add(next.n);
    checkUnlocks(true);
    renderAll();
    say(next ? `¡Fase ${ph.n} superada! +${xp}.${after > before ? ' Nivel ' + after + '.' : ''} Sigue «${next.title}».`
      : `¡Misión principal cumplida! «${missionTitle(p)}» está completa. +${xp}.`, true);
  }

  function reopenPhase(p, ph) {
    const pp = p.progress.phases[ph.n];
    if (!pp) return;
    delete pp.doneAt; pp.xp = 0;
    touch(p); renderAll();
  }

  function startTimer(p, ph) {
    const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
    // Solo un cronómetro a la vez: cierra el que esté andando en otra fase o misión.
    Object.values(state.projects).forEach(q => Object.values(q.progress.phases).forEach(o => {
      if (o.timerStart && o !== pp) { o.hours = (o.hours || 0) + (Date.now() - o.timerStart) / 3600000; delete o.timerStart; if (q !== p) touch(q); }
    }));
    pp.timerStart = Date.now();
    if (!pp.startAt) pp.startAt = Date.now();
    touch(p); renderAll();
    say('Cronómetro andando. Yo te acompaño.');
  }
  function stopTimer(p, ph, silent) {
    const pp = p.progress.phases[ph.n];
    if (!pp || !pp.timerStart) return;
    const add = (Date.now() - pp.timerStart) / 3600000;
    pp.hours = (pp.hours || 0) + add;
    delete pp.timerStart;
    if (!silent) { touch(p); checkUnlocks(true); renderAll(); say(`Sumé ${fmtH(add)} h a la fase ${ph.n}.`); }
  }

  const VAR_RE = /\[([A-ZÁÉÍÓÚÑ_ ]{2,20})\]/g;
  function fillVars(p, text) { return text.replace(VAR_RE, (m, k) => (p.vars[k] || '').trim() || m); }
  function promptHTML(p, text) {
    return esc(text).replace(VAR_RE, (m, k) => p.vars[k] ? `<mark>${esc(p.vars[k])}</mark>` : `<mark class="hole">[${k}]</mark>`);
  }
  function contextPrompt(p, ph) {
    const pending = ph.tasks.filter(t => !p.progress.tasks[t.id]);
    return [
      `Estoy trabajando en: ${p.roadmap.subtitle || p.roadmap.title}.`,
      `Fase ${ph.n}: ${ph.title}. Meta: ${ph.meta}`,
      ...ph.fields.map(f => `${f.k}: ${f.v}`),
      pending.length ? 'Tareas que me faltan:\n' + pending.map(t => `- [${t.tag}] ${t.text}`).join('\n') : 'Ya terminé todas las tareas de esta fase.',
      '',
      fillVars(p, ph.prompt)
    ].join('\n');
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
  // La chispa vuela hacia Mochi visible: el grande en inicio, el de la barra en las demás pantallas.
  function targetPet() { return state.screen === 'home' ? pets.home : pets.tab; }
  function feedAll(k) { Object.values(pets).forEach(f => f.feed(k)); }
  function sparkFrom(el, fam, done) {
    if (!el || !el.getBoundingClientRect || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    const r = el.getBoundingClientRect();
    const [tx, ty] = targetPet().center();
    const s = document.createElement('span');
    s.className = 'spark'; s.style.background = FAMILY_INFO[fam].color; s.style.color = FAMILY_INFO[fam].color;
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
    f.style.left = Math.min(window.innerWidth - 60, r.right + 6) + 'px'; f.style.top = r.top + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
  // ---------- reloj interno ----------
  // Mochi respeta el ritmo del sueño: duerme de 23 a 7, despierta lento, rinde más a media mañana
  // y a media tarde, baja después de almuerzo y se calma de noche. Su estado (HP, STA) también pesa.
  function circadian(tot) {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    let phase, alert;
    if (h >= 23 || h < 7) { phase = 'sleep'; alert = 0; }
    else if (h < 9) { phase = 'waking'; alert = 0.35 + (h - 7) * 0.15; }
    else if (h < 13) { phase = 'peak'; alert = 1; }
    else if (h < 15) { phase = 'dip'; alert = 0.55; }
    else if (h < 19) { phase = 'peak2'; alert = 0.9; }
    else if (h < 21) { phase = 'calm'; alert = 0.6; }
    else { phase = 'winddown'; alert = 0.3; }
    const v = vitals(tot || totals());
    if (v.hp <= 25) alert *= 0.5;
    const worn = v.sta >= 80 && h >= 17;
    if (worn) alert *= 0.75;
    const curious = v.mp >= 50;
    const sky = h >= 20.5 || h < 6 ? 'night' : h < 8 ? 'dawn' : h < 18 ? 'day' : 'dusk';
    return { phase, alert: Math.min(1, alert + (curious && phase !== 'sleep' ? 0.1 : 0)), sleeping: phase === 'sleep' || v.hp <= 15, worn, curious, sky, v };
  }

  // ---------- lo que piensa ----------
  const WONDER = [
    '¿Por qué el cielo es azul?', '¿Las estrellas sabrán que las miramos?', '¿De dónde vienen los sueños?',
    '¿Cuántas cosas no sé que no sé?', '¿El universo termina en alguna parte?', '¿Por qué existe algo en vez de nada?',
    '¿Los peces sabrán que están mojados?', '¿Qué es pensar, en realidad?', '¿De qué color ve el mundo un gato?',
    '¿Cuántos granos de arena habrá?', '¿Por qué la música da escalofríos?', '¿Tendrá fin la curiosidad?',
    '¿Qué se sentirá ser una nube?', '¿Por qué bostezar se contagia?', '¿El tiempo existe o solo lo contamos?',
    '¿Qué pensaba la gente hace mil años mirando la luna?', '¿Por qué olvidamos algunas cosas?', '¿Habrá alguien más allá afuera?',
    '¿Qué había antes del primer recuerdo?', '¿Por qué nos da risa lo inesperado?', '¿Por qué soñamos con gente que no conocemos?',
    '¿Cómo sabe una semilla hacia dónde crecer?', '¿Cuál fue la primera palabra que alguien dijo?', '¿Por qué el agua no tiene sabor?'
  ];
  const MUSE = [
    'Hoy quiero entender algo nuevo.', 'Un poquito cada día también es mucho.', 'Equivocarse es otra forma de aprender.',
    'Quiero ser un poquito mejor que ayer.', 'Leer es viajar sin moverse.', 'Si practico, mañana será más fácil.',
    'Aprender cansa, pero me gusta.', 'Las preguntas son más divertidas que las respuestas.', 'Un error menos es un paso más.',
    'Hoy no lo sé. Quizás mañana sí.', 'Todo experto fue principiante.', 'Despacio también se llega.', 'Quiero aprender a aprender.',
    'Cada día sé una cosita más.', 'Lo difícil de hoy es lo fácil de mañana.', 'Me gusta cuando algo por fin tiene sentido.',
    'Mejorar es lento. Y está bien.', 'Si no entiendo, pregunto.', ':3'
  ];
  const BY_PHASE = {
    sleep: ['Zzz…', 'Zzz… soñando con estrellas…', 'Dormir ordena lo que aprendimos hoy… zzz', 'Zzz… mañana seguimos…'],
    waking: ['*bostezo* …buenos días.', 'Todavía tengo los ojos pegados.', 'Despacito, que recién despierto.', 'La luz de la mañana ayuda a despertar.'],
    peak: ['¡Me siento con la cabeza despejada!', 'Buena hora para lo difícil.', 'Hoy tengo ganas de preguntar todo.'],
    dip: ['Después de comer me da sueñito… es normal.', 'Un vaso de agua y seguimos.', 'Un ratito de pausa no hace mal.'],
    peak2: ['La tarde también es buena para aprender.', 'Me volvieron las ganas.', 'Una cosa más y otra más.'],
    calm: ['Ya va bajando el sol.', 'Buen momento para repasar lo de hoy.', 'Hoy aprendimos algo, ¿cierto?'],
    winddown: ['*bostezo* ya casi es hora de dormir.', 'Las pantallas de noche espantan el sueño.', 'Dormir bien también es estudiar.', 'Mañana sigo pensando en eso.']
  };
  // Preguntas para ti, según la hora. Cada respuesta tiene una reacción.
  const ASK = {
    waking: [
      { id: 'dormiste', q: '¿Dormiste bien?', r: [['Sí', '¡Bien! Un cerebro descansado aprende mejor.'], ['Más o menos', 'Hoy vamos suave entonces. Un paso chico basta.']] },
      { id: 'agua', q: '¿Ya tomaste agua?', r: [['Sí', '¡Bien! Yo también… creo.'], ['Todavía no', 'Un vasito y despertamos juntos.']] },
      { id: 'meta', q: '¿Qué quieres aprender hoy?', r: [['Algo nuevo', '¡Me encanta! Vamos a las misiones.', 'misiones'], ['Repasar', 'Repasar es aprender dos veces.']] }
    ],
    peak: [
      { id: 'tarea', q: '¿Hacemos una tarea chiquita?', r: [['Vamos', '¡Sí! Te espero en Misiones.', 'misiones'], ['Después', 'Ok, aquí me quedo pensando.']] },
      { id: 'curioso', q: '¿Qué es lo más raro que sabes?', r: [['Algo genial', '¡Cuéntaselo a alguien! Así no se olvida.'], ['No sé', 'Entonces hoy buscamos uno.']] },
      { id: 'pregunta', q: '¿Tienes alguna duda que nunca preguntaste?', r: [['Sí', 'Pregúntala hoy. Nadie nace sabiendo.'], ['No', 'Seguro aparece una. Siempre aparece.']] }
    ],
    dip: [
      { id: 'almuerzo', q: '¿Almorzaste?', r: [['Sí', 'Por eso el sueñito. Es normal.'], ['No', 'Comer algo ayuda a pensar.']] },
      { id: 'pausa', q: '¿Te tomaste un descanso?', r: [['Sí', 'Descansar también es avanzar.'], ['No', 'Cinco minutos y volvemos mejor.']] }
    ],
    peak2: [
      { id: 'aprendiste', q: '¿Qué aprendiste hoy?', r: [['Algo bueno', '¡Eso! Se me erizan las orejitas.'], ['Nada aún', 'Todavía queda tarde. Una tarea chica.', 'misiones']] },
      { id: 'tarde', q: '¿Una más antes de que oscurezca?', r: [['Dale', '¡Vamos!', 'misiones'], ['Ya hice harto', 'Te creo. Lo hiciste bien.']] }
    ],
    calm: [
      { id: 'mejor', q: '¿Qué fue lo mejor de tu día?', r: [['Algo lindo', 'Guárdalo en la memoria.'], ['Nada especial', 'Los días tranquilos también cuentan.']] },
      { id: 'manana', q: '¿Qué quieres mejorar mañana?', r: [['Tengo idea', 'Pensarlo ya es la mitad.'], ['No sé', 'Lo soñamos y mañana vemos.']] }
    ],
    winddown: [
      { id: 'dormir', q: 'Ya es tarde. ¿Dejamos lo de hoy hasta aquí?', r: [['Sí, a descansar', 'Dormir también es aprender. Buenas noches.'], ['Un poquito más', 'Ok, pero no te desveles mucho.']] }
    ]
  };
  const asked = {};
  let thinkTimer = 0, holdUntil = 0;
  function showThought(text, replies) {
    const b = $('#h-bubble');
    if (!b) return;
    b.classList.add('fade');
    setTimeout(() => {
      b.innerHTML = `<span class="tq">${esc(text)}</span>` + (replies ? `<span class="replies">${replies.map((r, i) => `<button data-reply="${i}">${esc(r[0])}</button>`).join('')}</span>` : '');
      b.classList.toggle('asking', !!replies);
      b.classList.remove('fade');
      b._replies = replies || null;
    }, 260);
  }
  function think(text) {
    clearTimeout(thinkTimer);
    const c = circadian();
    const next = () => { thinkTimer = setTimeout(() => think(), c.sleeping ? 26000 : Math.round(20000 - 11000 * c.alert)); };
    if (text) { showThought(text); holdUntil = Date.now() + 7000; next(); return; }
    if (Date.now() < holdUntil) { next(); return; }
    if (c.sleeping) { showThought(pick(BY_PHASE.sleep)); next(); return; }
    // Preguntar: más probable cuando está despierto o con el maná alto.
    const askP = 0.15 + 0.35 * c.alert + (c.curious ? 0.15 : 0);
    const today = dayKey(Date.now());
    const mine = (ASK[c.phase] || []).filter(x => !asked[today + x.id]);
    const r = Math.random();
    if (mine.length && r < askP * 0.45) {
      const x = pick(mine); asked[today + x.id] = 1;
      pets.home.pop('?');
      showThought(x.q, x.r); holdUntil = Date.now() + 25000; next(); return;
    }
    if (r < askP) { pets.home.pop('?'); showThought(pick(WONDER)); next(); return; }
    if (c.worn && Math.random() < 0.5) { showThought('Hoy trabajaste harto. Descansar también suma.'); next(); return; }
    if (c.v.hp <= 25) { showThought(pick(['Tengo sueño… pero quiero aprender.', 'Un ratito nomás y despierto.', 'Te extrañé. ¿Seguimos?'])); next(); return; }
    showThought(Math.random() < 0.4 ? pick(BY_PHASE[c.phase]) : pick(MUSE));
    next();
  }
  function answer(i) {
    const b = $('#h-bubble');
    const rep = b && b._replies && b._replies[i];
    if (!rep) return;
    pets.home.feed(0.5);
    if (rep[2]) { showThought(rep[1]); holdUntil = Date.now() + 2000; setTimeout(() => go(rep[2]), 1100); return; }
    pets.home.pop('!');
    holdUntil = 0; think(rep[1]);
  }
  // Toques: despierto responde; dormido abre un ojo y vuelve a dormir.
  function poke() {
    const c = circadian();
    if (c.sleeping) {
      pets.home.set({ sleepy: false, drowsy: true });
      think(pick(['Mmm… ¿qué hora es? Es hora de dormir…', 'Shh… dormir también es aprender.', '*abre un ojo* …mañana, ¿ya?']));
      setTimeout(() => renderPets(totals()), 5000);
      return;
    }
    pets.home.feed(0.4);
    holdUntil = 0; think();
  }

  let sayTimer = 0;
  function say(text, big) {
    // En el inicio solo piensa; los avisos de tareas van como aviso en las otras pantallas.
    if (state.screen === 'home') { if (big) think(text.length > 60 ? text.split('. ')[0] + '.' : text); return; }
    const toast = $('#toast');
    toast.textContent = text; toast.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (toast.hidden = true), 3800);
    clearTimeout(sayTimer);
  }

  // ---------- siguiente tarea ----------
  function nextIn(p) {
    if (!p) return null;
    for (const ph of p.roadmap.phases) {
      const pp = p.progress.phases[ph.n] || {};
      if (pp.doneAt) continue;
      return { p, ph, t: ph.tasks.find(x => !p.progress.tasks[x.id]) || null };
    }
    return null;
  }
  // ---------- navegación ----------
  const SCREENS = ['home', 'misiones', 'mision', 'equipo', 'menu'];
  function go(screen, opts) {
    if (!SCREENS.includes(screen)) screen = 'home';
    if (screen === 'mision' && !(opts && opts.id ? state.projects[opts.id] : active())) screen = 'misiones';
    if (opts && opts.id) {
      state.activeId = opts.id; persistLocal();
      state.open = new Set(); const n = nextIn(active()); if (n) state.open.add(n.ph.n);
    }
    state.screen = screen;
    SCREENS.forEach(s => ($('#scr-' + s).hidden = s !== screen));
    $$('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.go === (screen === 'mision' ? 'misiones' : screen) ? 'page' : 'false'));
    $('#toast').hidden = true;
    try { history.replaceState(null, '', '#' + (screen === 'home' ? 'inicio' : screen)); } catch (e) { /* sin historial */ }
    if (screen === 'equipo' && (state.profile.newItems || []).length) { renderAll(); state.profile.newItems = []; touchProfile(); renderTabs(); }
    else renderAll();
    window.scrollTo(0, 0);
  }

  // ---------- render ----------
  const pets = {};
  function renderAll() {
    const tot = totals();
    renderPets(tot);
    renderTabs(tot);
    if (state.screen === 'home') renderHome(tot);
    if (state.screen === 'misiones') renderMissions(tot);
    if (state.screen === 'mision') renderMission();
    if (state.screen === 'equipo') renderEquip(tot);
    if (state.screen === 'menu') renderMenu();
  }

  function renderPets(tot) {
    const lv = levelOf(tot.xp), stg = stageOf(lv.L);
    const heat = tot.last ? Math.max(0.15, 1 - (Date.now() - tot.last) / (3 * DAY)) : 0.45;
    const famTop = Object.entries(tot.fam).sort((a, b) => b[1] - a[1])[0];
    const cz = circadian(tot);
    const room = $('.room'); if (room) { room.dataset.sky = cz.sky; room.dataset.phase = cz.phase; }
    const opts = { stage: stg, heat, sleepy: cz.sleeping, drowsy: !cz.sleeping && cz.alert < 0.5, alert: cz.alert, tint: famTop[1] ? FAMILY_INFO[famTop[0]].color : '#ffd166', ground: 0.85, equip: Object.assign({}, state.profile.equipped) };
    Object.values(pets).forEach(f => f.set(opts));
  }

  function renderTabs(tot) {
    tot = tot || totals();
    const lv = levelOf(tot.xp);
    $('#tab-level').textContent = 'Nv ' + lv.L;
    const ready = questState().filter(x => x.ready).length;
    const b1 = $('#badge-misiones'); b1.hidden = !ready; b1.textContent = ready;
    const fresh = (state.profile.newItems || []).length;
    const b2 = $('#badge-equipo'); b2.hidden = !fresh; b2.textContent = fresh;
  }

  function tagChip(tag) {
    return `<span class="tag" style="--tc:${FAMILY_INFO[familyOf(tag)].color}">${esc(tag)}</span>`;
  }

  // Inicio: el personaje manda; los datos quedan como símbolos pequeños.
  function renderHome(tot) {
    const lv = levelOf(tot.xp), stg = stageOf(lv.L), streak = streakOf(tot.days), c = comboNow();
    const qs = questState(), qDone = qs.filter(x => x.claimed).length, qReady = qs.filter(x => x.ready).length;
    const v = vitals(tot);
    const lvl = $('#h-level');
    lvl.querySelector('b').textContent = lv.L;
    lvl.title = `Nivel ${lv.L} · ${STAGES[stg].name}`; lvl.setAttribute('aria-label', lvl.title);
    const bar = (id, val, label) => {
      const el = $(id); el.querySelector('i').style.width = val + '%'; el.querySelector('em').textContent = val;
      el.title = label; el.setAttribute('aria-label', label);
    };
    bar('#v-hp', v.hp, `Vida ${v.hp}/100: baja si pasas días sin avanzar`);
    bar('#v-mp', v.mp, `Maná ${v.mp}/100: sube al aprender con Claude hoy (tareas de Claude y prompts)`);
    bar('#v-sta', v.sta, `Estamina ${v.sta}/100: sube con cada tarea de hoy`);
    const chip = (id, n, label) => { const el = $(id); el.querySelector('b').textContent = n; el.title = label; el.setAttribute('aria-label', label); };
    chip('#h-streak', streak, `Racha: ${streak} ${streak === 1 ? 'día' : 'días'}`);
    chip('#h-xp', tot.xp >= 10000 ? Math.round(tot.xp / 1000) + 'k' : tot.xp, `Energía total: ${tot.xp}`);
    chip('#h-daily', `${qDone}/${qs.length}`, qReady ? `${qReady} misión diaria lista para reclamar` : `Misiones diarias cobradas: ${qDone} de ${qs.length}`);
    $('#h-daily').classList.toggle('ready', qReady > 0);
    const combo = $('#h-combo');
    combo.hidden = c < 2;
    if (c >= 2) chip('#h-combo', '×' + (c >= 4 ? 2 : 1.5), 'Combo activo');
    const pct = Math.floor(lv.into / lv.need * 100);
    $('#xp-fill').style.width = (lv.into / lv.need * 100).toFixed(1) + '%';
    $('#xp-pct').textContent = pct + '%';
    const xb = $('#xpbar');
    xb.setAttribute('aria-valuenow', pct);
    xb.title = `Nivel ${lv.L}: ${lv.into} de ${lv.need} de energía para el nivel ${lv.L + 1}`;
    if (!$('#h-bubble').textContent) think();
  }

  function renderMissions(tot) {
    const qs = questState();
    $('#m-daily').innerHTML = qs.map(x => `
      <li class="daily ${x.claimed ? 'claimed' : x.ready ? 'ready' : ''}">
        <span class="d-ring" style="--k:${x.have / x.q.goal}"><span>${x.have}/${x.q.goal}</span></span>
        <span class="d-text"><b>${esc(x.q.text)}</b><small>+${x.q.xp + perkBonus('quest')} de energía</small></span>
        ${x.claimed ? '<span class="d-done">Cobrada</span>' : `<button class="btn small ${x.ready ? 'primary' : 'ghost'}" data-claim="${x.q.id}" ${x.ready ? '' : 'disabled'}>Reclamar</button>`}
      </li>`).join('');
    const ids = Object.keys(state.projects).sort((a, b) => state.projects[b].updatedAt - state.projects[a].updatedAt);
    $('#m-main').innerHTML = ids.map(id => {
      const p = state.projects[id], rm = p.roadmap;
      let done = 0, total = 0, est = 0, real = 0, phDone = 0;
      rm.phases.forEach(ph => {
        const pp = p.progress.phases[ph.n] || {};
        total += ph.tasks.length; done += ph.tasks.filter(t => p.progress.tasks[t.id]).length;
        est += ph.hours; real += pp.hours || 0; if (pp.doneAt) phDone++;
      });
      const pct = total ? Math.round(done / total * 100) : 0;
      const fin = missionDone(p);
      const n = nextIn(p);
      return `
      <li><button class="mcard ${fin ? 'fin' : ''} ${id === state.activeId ? 'current' : ''}" data-open-mission="${id}">
        <span class="mc-k">${fin ? 'Cumplida' : id === state.activeId ? 'Misión principal · en curso' : 'Misión principal'}</span>
        <b class="mc-t">${esc(missionTitle(p))}</b>
        <span class="mc-s">${esc(rm.title)}</span>
        <span class="mc-bar"><i style="width:${pct}%"></i></span>
        <span class="mc-meta"><span>${pct}% · ${done}/${total} tareas</span><span>${phDone}/${rm.phases.length} fases</span><span>${fmtH(real)} / ${fmtH(est)} h</span></span>
        ${n ? `<span class="mc-next">Ahora: Fase ${n.ph.n} · ${esc(n.ph.title)}</span>` : ''}
      </button></li>`;
    }).join('') || '';
    $('#m-empty').hidden = ids.length > 0;
  }

  function renderMission() {
    const p = active();
    const box = $('#scr-mision');
    if (!p) { go('misiones'); return; }
    const rm = p.roadmap;
    let done = 0, total = 0, est = 0, real = 0, phasesDone = 0;
    rm.phases.forEach(ph => {
      const pp = p.progress.phases[ph.n] || {};
      total += ph.tasks.length; done += ph.tasks.filter(t => p.progress.tasks[t.id]).length;
      est += ph.hours; real += pp.hours || 0; if (pp.doneAt) phasesDone++;
    });
    const pct = total ? Math.round(done / total * 100) : 0;
    const vars = Array.from(new Set(rm.phases.flatMap(ph => (ph.prompt.match(VAR_RE) || []).map(m => m.slice(1, -1)))));
    const shared = vars.filter(v => rm.phases.filter(ph => ph.prompt.includes('[' + v + ']')).length > 1);
    box.innerHTML = `
      <button class="back" data-go="misiones">← Misiones</button>
      <header class="proj">
        <div class="proj-eyebrow">Misión principal · ${esc(rm.title)}</div>
        <h1>${esc(missionTitle(p))}</h1>
        <p class="proj-sub">${esc((rm.subtitle || '').split('·').slice(1).join('·').trim())}</p>
        <div class="kpis">
          <div class="kpi"><b>${pct}%</b><span>${done} de ${total} tareas</span></div>
          <div class="kpi"><b>${phasesDone}/${rm.phases.length}</b><span>fases superadas</span></div>
          <div class="kpi"><b>${fmtH(real)} h</b><span>de ${fmtH(est)} h estimadas</span></div>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      </header>
      ${rm.intro ? `<p class="intro">${esc(rm.intro)}</p>` : ''}
      ${shared.length ? `<div class="vars"><span class="vars-l">Para los prompts</span>${shared.map(v => `
        <label class="var"><span>[${esc(v)}]</span><input id="var-${esc(v)}" data-var="${esc(v)}" value="${esc(p.vars[v] || '')}" placeholder="${v === 'VERSION' ? 'ej. 6000.0 LTS' : 'valor'}"></label>`).join('')}</div>` : ''}
      <nav class="track" aria-label="Fases">${rm.phases.map(ph => {
        const pp = p.progress.phases[ph.n] || {};
        const d = ph.tasks.filter(t => p.progress.tasks[t.id]).length;
        const k = ph.tasks.length ? d / ph.tasks.length : 0;
        return `<button class="node ${pp.doneAt ? 'is-done' : ''}" data-jump="${ph.n}" title="Fase ${ph.n}: ${esc(ph.title)}" style="--k:${k}"><span>${ph.n}</span></button>`;
      }).join('')}</nav>
      ${rm.legend && rm.legend.length ? `<div class="legend">${rm.legend.map(g => `<span>${g.tags.map(tagChip).join('')} ${esc(g.desc)}</span>`).join('')}</div>` : ''}
      <div class="phases">${rm.phases.map(ph => phaseHTML(p, ph)).join('')}</div>
      <footer class="proj-foot">
        <span>${esc(p.fileName || 'Guía precargada')} · ${rm.phases.length} fases</span>
        <span class="danger-zone" id="dz"><button class="link" id="reset">Reiniciar progreso</button><button class="link" id="remove">Quitar misión</button></span>
      </footer>`;
    bindMission(p);
  }

  function phaseHTML(p, ph) {
    const pp = p.progress.phases[ph.n] || {};
    const d = ph.tasks.filter(t => p.progress.tasks[t.id]).length;
    const all = d === ph.tasks.length;
    const open = state.open.has(ph.n);
    const running = pp.timerStart ? (Date.now() - pp.timerStart) / 3600000 : 0;
    const hours = (pp.hours || 0) + running;
    const diff = hours - ph.hours;
    const vars = Array.from(new Set((ph.prompt.match(VAR_RE) || []).map(m => m.slice(1, -1))));
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
            ? `<span class="gate-ok">Superada el ${fmtDate(pp.doneAt)} · +${pp.xp} de energía</span><button class="link" data-reopen="${ph.n}">Reabrir</button>`
            : `<button class="btn primary" data-complete="${ph.n}" ${all ? '' : 'disabled'}>Fase superada</button>
               <span class="muted">${all ? 'Confirma solo si se cumple el criterio «Listo cuando».' : `Faltan ${ph.tasks.length - d} tareas.`}</span>`}
        </div>
        ${ph.prompt ? `<div class="prompt">
          <div class="prompt-head"><span>Prompt para Claude</span>
            <span class="prompt-actions"><button class="btn small" data-copy="${ph.n}">Copiar prompt</button><button class="btn small ghost" data-copyctx="${ph.n}">Copiar con contexto</button></span></div>
          ${vars.filter(v => !p.vars[v]).length ? `<div class="prompt-vars">${vars.map(v => `<label class="var"><span>[${esc(v)}]</span><input id="pv-${ph.n}-${esc(v)}" data-var="${esc(v)}" value="${esc(p.vars[v] || '')}" placeholder="completa antes de copiar"></label>`).join('')}</div>` : ''}
          <pre>${promptHTML(p, ph.prompt)}</pre>
          ${p.progress.prompts[ph.n] ? '' : '<div class="prompt-hint">Copiarlo por primera vez da +3 de energía.</div>'}
        </div>` : ''}
        <div class="ask">
          <label for="ask-${ph.n}">Preguntarle a Claude sobre esta fase</label>
          <div class="ask-row"><textarea id="ask-${ph.n}" rows="2" placeholder="Ej.: Me trabé con esto, ¿por dónde parto?"></textarea>
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

  function bindMission(p) {
    const box = $('#scr-mision');
    const phaseByN = n => p.roadmap.phases.find(x => String(x.n) === String(n));
    box.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.toggle != null) {
        const n = Number(b.dataset.toggle);
        state.open.has(n) ? state.open.delete(n) : state.open.add(n);
        const sec = $('#ph-' + n); sec.classList.toggle('open'); sec.querySelector('.ph-body').hidden = !state.open.has(n);
        b.setAttribute('aria-expanded', state.open.has(n));
      } else if (b.dataset.jump != null) {
        const n = Number(b.dataset.jump);
        if (!state.open.has(n)) { state.open.add(n); renderMission(); }
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
            p.progress.prompts[ph.n] = Date.now(); touch(p);
            feedAll(0.3); checkUnlocks(true); renderTabs();
            say('Prompt copiado: +3. Pégalo en Claude y vuelve con el resultado.');
            const hint = b.closest('.prompt').querySelector('.prompt-hint'); if (hint) hint.remove();
          }
        });
      } else if (b.dataset.ask != null) ask(p, phaseByN(b.dataset.ask), b);
      else if (b.id === 'reset') {
        $('#dz').innerHTML = `<span>¿Borrar todo el progreso de esta misión?</span><button class="link danger" id="reset-yes">Sí, reiniciar</button><button class="link" id="dz-no">Cancelar</button>`;
      } else if (b.id === 'remove') {
        $('#dz').innerHTML = `<span>¿Quitar esta misión y su progreso?</span><button class="link danger" id="remove-yes">Sí, quitar</button><button class="link" id="dz-no">Cancelar</button>`;
      } else if (b.id === 'reset-yes') {
        p.progress = { tasks: {}, phases: {}, prompts: {} }; touch(p); renderAll(); say('Empezamos de cero. Yo sigo aquí.');
      } else if (b.id === 'remove-yes') {
        delete state.projects[p.id];
        if (window.SAMPLE_ROADMAP && p.key === window.SAMPLE_ROADMAP.key) { state.profile.sampleRemoved = true; touchProfile(); }
        state.activeId = Object.keys(state.projects)[0] || null;
        persistLocal();
        if (state.db && state.uid) saveRemote(p.id);
        go('misiones'); say('Misión quitada. La energía que ganaste con ella se fue con ella.');
      } else if (b.id === 'dz-no') renderMission();
    };
    box.oninput = e => {
      const el = e.target;
      if (!el.dataset.var) return;
      p.vars[el.dataset.var] = el.value;
      $$(`[data-var="${CSS.escape(el.dataset.var)}"]`, box).forEach(o => { if (o !== el) o.value = el.value; });
      clearTimeout(box._vt); box._vt = setTimeout(() => {
        touch(p);
        p.roadmap.phases.forEach(ph => { const pre = $('#ph-' + ph.n + ' pre'); if (pre) pre.innerHTML = promptHTML(p, ph.prompt); });
      }, 350);
    };
    box.onchange = e => {
      const el = e.target;
      if (el.dataset.hours == null) return;
      const ph = phaseByN(el.dataset.hours);
      const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
      pp.hours = Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0);
      if (pp.hours && !pp.startAt) pp.startAt = Date.now();
      touch(p); checkUnlocks(); renderAll();
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

  function renderEquip(tot) {
    const fresh = new Set(state.profile.newItems || []);
    const eq = state.profile.equipped;
    $('#e-name').textContent = state.profile.name || 'Mochi';
    $('#e-slots').innerHTML = Object.entries(SLOTS).map(([k, label]) => {
      const it = ITEM[eq[k]];
      return `<li class="slot ${it ? 'full' : ''}"><span class="slot-ico">${it ? `<svg viewBox="0 0 40 40" aria-hidden="true">${it.svg}</svg>` : ''}</span><span><small>${label}</small><b>${it ? esc(it.name) : 'Vacío'}</b></span></li>`;
    }).join('');
    const perks = Object.values(eq).map(id => ITEM[id]).filter(Boolean).map(it => perkText(it.perk));
    $('#e-perks').textContent = perks.length ? 'Bonos activos: ' + perks.join(' · ') : 'Sin bonos activos. Equipa algo para ganar energía extra.';
    const owned = ITEMS.filter(it => state.profile.unlocked[it.id]).length;
    $('#e-count').textContent = `${owned} de ${ITEMS.length}`;
    $('#e-items').innerHTML = Object.keys(SLOTS).map(slot => ITEMS.filter(i => i.slot === slot).map(it => {
      const has = !!state.profile.unlocked[it.id];
      const on = eq[slot] === it.id;
      const pr = reqProgress(it.req, tot);
      return `<li class="item ${has ? '' : 'locked'} ${on ? 'on' : ''}">
        ${fresh.has(it.id) ? '<span class="new">Nuevo</span>' : ''}
        <span class="item-ico"><svg viewBox="0 0 40 40" aria-hidden="true">${it.svg}</svg></span>
        <span class="item-txt"><small>${SLOTS[slot]}</small><b>${esc(it.name)}</b><span>${esc(perkText(it.perk))}</span>
          ${has ? '' : `<span class="req">${esc(reqText(it.req))} · ${pr.have}/${pr.need}</span>`}</span>
        ${has ? `<button class="btn small ${on ? '' : 'primary'}" data-equip="${it.id}">${on ? 'Quitar' : 'Equipar'}</button>` : '<span class="lock" aria-label="Bloqueado">Bloqueado</span>'}
      </li>`;
    }).join('')).join('');

    const max = Math.max(1, ...Object.values(tot.fam));
    $('#e-stats').innerHTML = Object.entries(FAMILY_INFO).map(([k, f]) => `
      <div class="stat"><span class="stat-l">${f.label}</span>
        <span class="stat-bar"><i style="width:${(tot.fam[k] / max * 100).toFixed(0)}%;background:${f.color}"></i></span>
        <span class="stat-n">${tot.fam[k]}</span></div>`).join('');
    const counts = {};
    tot.events.forEach(e => { const k = dayKey(e.at); counts[k] = (counts[k] || 0) + 1; });
    let cells = '';
    for (let i = 27; i >= 0; i--) {
      const t = Date.now() - i * DAY, c = counts[dayKey(t)] || 0;
      const lvl = c === 0 ? 0 : c < 2 ? 1 : c < 4 ? 2 : c < 7 ? 3 : 4;
      cells += `<i class="h${lvl}" title="${fmtDate(t)}: ${c} tarea${c === 1 ? '' : 's'}"></i>`;
    }
    $('#e-heat').innerHTML = cells;
    $('#e-facts').innerHTML = `
      <div><b>${tot.tasks}</b><span>tareas</span></div><div><b>${tot.phases}</b><span>fases</span></div>
      <div><b>${tot.missions}</b><span>misiones</span></div><div><b>${fmtH(tot.hours)}</b><span>horas</span></div>`;
  }

  function renderMenu() {
    const pr = state.profile;
    const nm = $('#menu-name'); if (document.activeElement !== nm) nm.value = pr.name || 'Mochi';
    $$('[name="theme"]').forEach(r => (r.checked = r.value === (pr.theme || 'system')));
    const snd = $('#menu-sound'); snd.checked = state.sound;
  }

  function applyTheme() {
    const t = state.profile.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
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
  async function handleFiles(files) {
    files = Array.from(files || []).filter(Boolean);
    if (!files.length) return;
    const st = $('#loadstate');
    const added = [], updated = [], failed = [];
    for (const file of files) {
      if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { failed.push(file.name + ' (no es PDF)'); continue; }
      st.textContent = 'Leyendo ' + file.name + '…';
      try {
        const lib = await ensurePdfjs();
        const rm = await window.RoadmapParser.parsePdf(lib, new Uint8Array(await file.arrayBuffer()));
        if (!rm || !rm.phases.length) { failed.push(file.name + ' (sin fases «Fase 0: …»)'); continue; }
        const id = 'p_' + rm.key;
        const existing = state.projects[id];
        if (existing) {
          existing.roadmap = rm; existing.fileName = file.name;
          const ids = new Set(rm.phases.flatMap(ph => ph.tasks.map(t => t.id)));
          Object.keys(existing.progress.tasks).forEach(k => { if (!ids.has(k)) delete existing.progress.tasks[k]; });
          updated.push(existing);
        } else {
          state.projects[id] = newProject(rm, file.name);
          added.push(state.projects[id]);
        }
        state.activeId = id;
        touch(state.projects[id]);
      } catch (e) {
        failed.push(file.name + (e && e.message === 'script' ? ' (no cargó el lector de PDF; revisa tu conexión)' : ' (no se pudo leer; ¿protegido o escaneado?)'));
      }
    }
    const parts = [];
    if (added.length) parts.push(added.length === 1 ? `Nueva misión: «${missionTitle(added[0])}».` : `${added.length} misiones nuevas.`);
    if (updated.length) parts.push(updated.length === 1 ? 'Misión actualizada, progreso conservado.' : `${updated.length} misiones actualizadas.`);
    if (failed.length) parts.push('No pude con: ' + failed.join(', ') + '.');
    st.textContent = parts.join(' ');
    if (added.length || updated.length) {
      if (state.screen === 'misiones') renderAll(); else go('misiones');
      say(added.length ? `¡Misión nueva! ${added.length === 1 ? added[0].roadmap.phases.length + ' fases por delante.' : 'Tengo tareas para rato.'}` : 'Misma guía, nueva versión. No perdí nada.', true);
    }
  }

  // ---------- inicio ----------
  function boot() {
    pets.home = window.MochiPet($('#pet'), { fit: 'scene' });
    pets.tab = window.MochiPet($('#tab-pet'), { fit: 'icon' });
    pets.equip = window.MochiPet($('#equip-pet'), { fit: 'card' });
    loadLocal();
    applyTheme();
    if (!Object.keys(state.projects).length && window.SAMPLE_ROADMAP && !state.profile.sampleRemoved) {
      const p = newProject(window.SAMPLE_ROADMAP, '');
      p.untouched = true;
      state.projects[p.id] = p;
    }
    if (!state.projects[state.activeId]) state.activeId = Object.keys(state.projects)[0] || null;
    checkUnlocks(true);

    document.addEventListener('click', e => {
      const g = e.target.closest('[data-go]');
      if (g) { go(g.dataset.go); return; }
      const m = e.target.closest('[data-open-mission]');
      if (m) { go('mision', { id: m.dataset.openMission }); return; }
      const c = e.target.closest('[data-claim]');
      if (c) { claimQuest(c.dataset.claim, c); return; }
      const q = e.target.closest('[data-equip]');
      if (q) {
        const it = ITEM[q.dataset.equip];
        const eq = state.profile.equipped;
        if (eq[it.slot] === it.id) delete eq[it.slot]; else eq[it.slot] = it.id;
        touchProfile(); feedAll(0.5); renderAll();
        say(eq[it.slot] === it.id ? `¿Cómo me queda ${it.name.toLowerCase()}? ${perkText(it.perk)}.` : 'Me lo saqué. Igual sigo feliz. :3');
      }
    });
    $('#file').onchange = e => { handleFiles(e.target.files); e.target.value = ''; };
    document.body.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragging'); });
    document.body.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
    document.body.addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('dragging'); handleFiles(e.dataTransfer.files); });
    $('#pet').onclick = poke;
    $('#h-bubble').onclick = e => { const r = e.target.closest('[data-reply]'); if (r) answer(Number(r.dataset.reply)); };

    // Menú
    const nm = $('#menu-name');
    nm.oninput = () => { clearTimeout(nm._t); nm._t = setTimeout(() => { state.profile.name = nm.value.trim().slice(0, 24) || 'Mochi'; touchProfile(); }, 400); };
    $$('[name="theme"]').forEach(r => (r.onchange = () => { state.profile.theme = r.value; touchProfile(); applyTheme(); }));
    $('#menu-sound').onchange = e => { state.sound = e.target.checked; lsSet(LS_SOUND, state.sound ? 'on' : 'off'); if (state.sound) crackle(1); };
    $('#menu-reset').onclick = () => { $('#menu-reset-confirm').hidden = false; };
    $('#menu-reset-no').onclick = () => { $('#menu-reset-confirm').hidden = true; };
    $('#menu-reset-yes').onclick = () => {
      Object.values(state.projects).forEach(p => { p.progress = { tasks: {}, phases: {}, prompts: {} }; touch(p); });
      const keep = { name: state.profile.name, theme: state.profile.theme };
      state.profile = Object.assign(newProfile(), keep); touchProfile();
      $('#menu-reset-confirm').hidden = true;
      go('home'); say('Volví a ser una chispa. Empecemos otra vez.', true);
    };

    const fromHash = (location.hash || '').replace('#', '');
    go(fromHash === 'inicio' || fromHash === 'brasa' ? 'home' : fromHash || 'home');

    // Refresca los cronómetros.
    setInterval(() => {
      if (state.screen !== 'mision') return;
      const p = active();
      if (!p) return;
      p.roadmap.phases.forEach(ph => {
        const pp = p.progress.phases[ph.n];
        const inp = $('#hrs-' + ph.n);
        if (pp && pp.timerStart && inp) inp.value = Math.round(((pp.hours || 0) + (Date.now() - pp.timerStart) / 3600000) * 100) / 100;
      });
    }, 15000);
    setInterval(() => { renderPets(totals()); }, 60000);
    connectCloud();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
