// Mochi Roadmap: cada guía en PDF es una misión principal; cada tarea que tachas alimenta a Mochi.
(function () {
  'use strict';

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const LS_PROJECTS = 'brasa.v1.projects', LS_ACTIVE = 'brasa.v1.active', LS_SOUND = 'brasa.v1.sound', LS_PROFILE = 'brasa.v1.profile', LS_MUSIC = 'brasa.v1.music', LS_MUSIC_VOL = 'brasa.v1.musicVol';
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

  const SLOTS = { head: 'Cabeza', face: 'Cara', neck: 'Cuello', joya: 'Joya', base: 'Base', aura: 'Aura' };
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
      svg: '<g fill="#ffe9a8"><path d="M20 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="M32 26l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/><path d="M8 26l1.2 3 3 1.2-3 1.2L8 34.6l-1.2-3-3-1.2 3-1.2z"/></g>' },
    // Joyas: se forjan en el Taller
    { id: 'anillo', slot: 'joya', name: 'Anillo de plata de ley', perk: { fam: 'build', xp: 2 }, req: { type: 'craft', n: 1 }, color: '#e3e6ea',
      svg: '<circle cx="20" cy="22" r="10" fill="none" stroke="#d9dde4" stroke-width="4"/><circle cx="20" cy="11" r="3.5" fill="#bfe6f5"/>' },
    { id: 'amuleto', slot: 'joya', name: 'Cuentas de vidrio', perk: { fam: 'claude', xp: 2 }, req: { type: 'craft', n: 1 }, color: '#6ec5ff',
      svg: '<path d="M14 6h12" stroke="#c9a23a" stroke-width="2"/><path d="M20 10l8 10-8 12-8-12z" fill="#6ec5ff"/><path d="M20 10l3 10-3 12" fill="#a8defd"/>' },
    { id: 'broche', slot: 'joya', name: 'Broche de bronce', perk: { fam: 'create', xp: 2 }, req: { type: 'craft', n: 1 }, color: '#b0793c',
      svg: '<circle cx="20" cy="20" r="11" fill="#b0793c"/><circle cx="20" cy="20" r="6" fill="#d39a5c"/><path d="M9 20h22" stroke="#7a4f24" stroke-width="2"/>' },
    { id: 'dije', slot: 'joya', name: 'Colgante de oro rosa', perk: { fam: 'test', xp: 3 }, req: { type: 'craft', n: 1 }, color: '#e6a58f',
      svg: '<path d="M14 5q6 6 12 0" stroke="#e6a58f" stroke-width="2" fill="none"/><path d="M20 10c5 6 8 10 8 14a8 8 0 0 1-16 0c0-4 3-8 8-14z" fill="#e6a58f"/>' },
    { id: 'perlas', slot: 'joya', name: 'Moneda de electro', perk: { quest: 5 }, req: { type: 'craft', n: 1 }, color: '#e8d27a',
      svg: '<circle cx="20" cy="22" r="11" fill="#e8d27a" stroke="#c9a23a" stroke-width="2"/><path d="M15 22q5-6 10 0q-5 6-10 0z" fill="#c9a23a"/><path d="M20 4v7" stroke="#c9a23a" stroke-width="1.5"/>' },
    { id: 'pulsera', slot: 'joya', name: 'Pulsera de latón', perk: { bond: 20 }, req: { type: 'craft', n: 1 }, color: '#d4b04a',
      svg: '<circle cx="20" cy="20" r="11" fill="none" stroke="#d4b04a" stroke-width="4"/><circle cx="20" cy="9" r="3" fill="#ff8fb1"/>' }
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
      startPlaza(db, user);
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
    let xp = (state.profile.claimedXp || 0) + (state.profile.teachXp || 0), phases = 0, prompts = 0, hours = 0, missions = 0, last = 0;
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
  // ---------- sueño y efectos del día ----------
  // Cada vez que lo despiertas de noche queda anotado. Al otro día, con suerte o sin ella, amanece con efectos.
  const EFFECTS = {
    descansado: { name: 'Descansado', good: true, text: 'Durmió de corrido: +1 XP por tarea y más ánimo.',
      svg: '<path d="M12 4a8 8 0 1 0 8 8 6 6 0 0 1-8-8z" fill="#ffd166" stroke="#ffd166"/>' },
    ojeras: { name: 'Ojeras', text: 'Durmió mal: la estamina no pasa de 70 hoy.',
      svg: '<circle cx="8" cy="10" r="2.5" fill="currentColor"/><circle cx="16" cy="10" r="2.5" fill="currentColor"/><path d="M5 15q3 2 6 0M13 15q3 2 6 0" stroke="#a78bfa"/>' },
    nublado: { name: 'Cabeza nublada', text: 'Le cuesta concentrarse: el maná sube a la mitad hoy.',
      svg: '<path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1A4 4 0 0 0 7 17z" fill="#9aa6bd" stroke="#9aa6bd"/>' },
    malhumor: { name: 'Malhumor', text: 'Anda de malas: las misiones diarias dan 5 menos hoy.',
      svg: '<path d="M8 8l3 2M16 8l-3 2" stroke="#ff6b81"/><path d="M8 17q4-3 8 0" stroke="#ff6b81"/><circle cx="12" cy="12" r="9" stroke="#ff6b81"/>' },
    agotado: { name: 'Agotado', text: 'Lo despertaste 6 veces: anda apático, con poca paciencia y le cuesta todo.',
      svg: '<path d="M5 9h5M14 9h5" stroke="#ff6b81"/><path d="M8 16h8" stroke="#ff6b81"/><path d="M12 3v2M4 5l1.5 1.5M20 5l-1.5 1.5" stroke="#ff6b81"/>' },
    lento: { name: 'Lento', text: 'Va en cámara lenta: 2 XP menos por tarea hoy.',
      svg: '<path d="M4 16c0-4 3-7 7-7s6 3 6 6H4zM17 15h3" stroke="#6fbf8e"/><circle cx="11" cy="14" r="2.5" stroke="#6fbf8e"/>' }
  };
  function nightKey(t) { const h = new Date(t).getHours(); return dayKey(h >= 23 ? t + DAY : t); }
  function sleepData() { return state.profile.sleep || (state.profile.sleep = { log: {}, roll: null }); }
  function registerWake() {
    const sd = sleepData(), k = nightKey(Date.now());
    sd.log[k] = Math.min(6, (sd.log[k] || 0) + 1);
    const keys = Object.keys(sd.log);
    if (keys.length > 10) keys.slice(0, keys.length - 10).forEach(x => delete sd.log[x]);
    touchProfile();
    return sd.log[k];
  }
  // Efectos de hoy según cómo durmió anoche (se sortean una vez por día, con la misma suerte si recargas).
  function todayEffects() {
    const h = new Date().getHours();
    if (h >= 23 || h < 7) return [];
    const sd = sleepData(), today = dayKey(Date.now());
    if (!sd.roll || sd.roll.day !== today) {
      const wakes = sd.log[today] || 0;
      let seed = hashStr(today + ':' + wakes);
      const rnd = () => (seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0, seed / 4294967296);
      let list = [];
      if (!wakes) list = ['descansado'];
      else {
        const p = Math.min(0.9, 0.25 * wakes);
        list = ['ojeras', 'nublado', 'malhumor', 'lento'].filter(() => rnd() < p);
        if (!list.length && wakes >= 3) list = ['ojeras'];
        list = list.slice(0, 3);
        if (wakes >= 6) list = ['agotado'].concat(list.slice(0, 2));
      }
      sd.roll = { day: today, wakes, effects: list, told: false };
      touchProfile();
    }
    const cured = (state.profile.boosts && state.profile.boosts.day === today && state.profile.boosts.cured) || [];
    return sd.roll.effects.filter(id => !cured.includes(id));
  }
  const hasFx = id => todayEffects().includes(id);
  // Cuántos malestares trae hoy por dormir mal (0 a 3).
  const badFx = () => todayEffects().filter(id => !EFFECTS[id].good).length;
  const isDrained = () => hasFx('agotado');

  // Vida, maná y estamina del día.
  // HP: constancia; baja 25 por cada día sin avanzar. MP: aprendizaje del día (tareas de Claude y prompts copiados).
  // Estamina: trabajo del día; cada tarea suma 20.
  function vitals(tot) {
    const idle = tot.last ? Math.floor((startOfDay(Date.now()) - startOfDay(tot.last)) / DAY) : 0;
    const hp = Math.max(5, Math.round(100 - Math.max(0, idle - 1) * 25 * (1 - Math.min(0.5, 0.05 * statB('resiliencia')))));
    const d = todayStats();
    const mp = Math.min(100, (d.fam.claude + d.prompts) * (hasFx('nublado') ? 12.5 : 25));
    const sta = Math.min(hasFx('ojeras') ? 70 : 100, d.tasks * 20);
    const bo = state.profile.boosts && state.profile.boosts.day === dayKey(Date.now()) ? state.profile.boosts : null;
    if (bo) return { hp: Math.min(100, hp + (bo.hp || 0)), mp: Math.min(100, mp + (bo.mp || 0)), sta: Math.min(hasFx('ojeras') ? 70 : 100, sta + (bo.sta || 0)), idle };
    return { hp, mp, sta, idle };
  }
  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function comboNow() {
    const now = Date.now();
    return allTaskEvents().filter(e => now - e.at < comboWindow()).length;
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
      craft: 'Fórjala en el Taller',
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
    if (perk.all) return `+${perk.all} XP por cada tarea`;
    if (perk.fam) return `+${perk.xp} XP por tarea de ${FAMILY_INFO[perk.fam].label.toLowerCase()}`;
    if (perk.phase) return `+${perk.phase} XP al superar una fase`;
    if (perk.daily) return `+${perk.daily} XP con la primera tarea del día`;
    if (perk.quest) return `+${perk.quest} XP por misión diaria`;
    if (perk.bond) return `+${perk.bond} % de empatía cuando lo tratas bien`;
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
      if (kind === 'bond' && k.bond) b += k.bond;
    });
    return b;
  }
  // ---------- stats: atributos de Mochi ----------
  // Dos formas de subir, como en un JRPG pero sin los típicos fuerza/defensa:
  //  1. Usándolos (estilo Final Fantasy II): cada tarea, fase, mezcla o conversación entrena lo que de verdad usa.
  //     Repetir lo mismo el mismo día rinde cada vez menos (retornos decrecientes).
  //  2. Un punto por nivel que repartes tú.
  const ATTRS = [
    { id: 'logica', g: 'cog', name: 'Razonamiento lógico', color: '#7fc4ff',
      what: 'Resolver problemas nuevos encadenando pasos.',
      basis: 'Inteligencia fluida (Cattell). Mejora practicando el mismo tipo de problema; lo que se entrena en un juego se transfiere poco a otras cosas.',
      how: 'Delegar a Claude, construir y probar.', eff: b => `+${Math.ceil(b / 2)} XP por tarea de Claude` },
    { id: 'memoria', g: 'cog', name: 'Memoria de trabajo', color: '#a98bff',
      what: 'Mantener varias cosas en la cabeza mientras trabajas.',
      basis: 'Modelo de Baddeley. Su capacidad casi no se entrena, pero partir el trabajo en pasos baja la carga (Sweller, carga cognitiva).',
      how: 'Fases completas y misiones diarias.', eff: b => `+${Math.min(15, b)} XP por misión diaria` },
    { id: 'agilidad', g: 'cog', name: 'Agilidad manual', color: '#5fd3a0',
      what: 'Precisión y soltura con las herramientas.',
      basis: 'Aprendizaje motor en etapas (Fitts y Posner): de pensar cada movimiento a que salga solo. Necesita repetición espaciada.',
      how: 'Construir, crear y mezclar en el Taller.', eff: b => `+${Math.ceil(b / 2)} XP por tarea de construir o crear` },
    { id: 'analisis', g: 'cog', name: 'Análisis crítico', color: '#ffb35c',
      what: 'Revisar, dudar y encontrar fallas.',
      basis: 'Pensamiento lento y deliberado (Kahneman). Se entrena verificando resultados, no solo leyéndolos.',
      how: 'Probar, revisar lo que hace Claude y descubrir recetas.', eff: b => `+${Math.ceil(b / 2)} XP por tarea de prueba` },
    { id: 'tolerancia', g: 'emo', name: 'Tolerancia a la frustración', color: '#ff8f8f',
      what: 'Seguir aunque algo no salga.',
      basis: 'Regulación emocional (Gross): notar la emoción y elegir qué hacer con ella, en vez de reprimirla.',
      how: 'Pruebas, mezclas fallidas y volver a intentar.', eff: b => `Mochi aguanta ${b * 4} % más toques` },
    { id: 'resiliencia', g: 'emo', name: 'Resiliencia', color: '#ffd166',
      what: 'Volver después de una pausa o un tropiezo.',
      basis: 'Mentalidad de crecimiento (Dweck): el error como información. En estudios grandes el efecto es modesto; ayuda más cuando hay apoyo.',
      how: 'Volver después de días sin avanzar y acertar después de fallar.', eff: b => `La vida baja ${Math.min(50, b * 5)} % más lento` },
    { id: 'empatia', g: 'emo', name: 'Empatía', color: '#ff7fb0',
      what: 'Entender lo que siente el otro y responder bien.',
      basis: 'Inteligencia emocional (Goleman) y responder a las invitaciones a conectar (Gottman).',
      how: 'Tratar bien a Mochi, responder sus preguntas y aprender de otros en la Plaza.', eff: b => `+${b * 4} % de empatía ganada con Mochi` },
    { id: 'enfoque', g: 'emo', name: 'Enfoque', color: '#6fd6e8',
      what: 'Sostener la atención en una sola cosa.',
      basis: 'Estado de flujo (Csikszentmihalyi) y práctica deliberada (Ericsson): bloques concentrados con un objetivo claro.',
      how: 'Combos, días seguidos y misiones diarias.', eff: b => `Ventana de combo +${Math.min(10, b)} min` },
    { id: 'metacog', g: 'emo', name: 'Metacognición', color: '#c7a6ff',
      what: 'Saber cómo aprendes y planificar.',
      basis: 'Flavell; dificultades deseables (Bjork): estimar, revisar y ajustar en vez de solo repetir.',
      how: 'Registrar horas, terminar fases dentro de lo estimado y copiar prompts.', eff: b => `+${b * 3} % XP al superar una fase` }
  ];
  const ATTR = Object.fromEntries(ATTRS.map(a => [a.id, a]));
  // Stats de juego: los que subes tú con 1 punto por nivel, para Jugar con Mochi.
  // Parten en 5. Además, cada 3 niveles entrenados del atributo afín suman +1 (lo que aprendes también cuenta).
  const GAME_BASE = 5;
  const GAME_STATS = [
    { id: 'vit', ab: 'VIT', name: 'Vigor / Salud', color: '#ff6b81', aff: 'resiliencia',
      what: 'Define la reserva total de vida (HP) y la resistencia a estados alterados corporales.', out: v => ['Vida máxima', 40 + 8 * v] },
    { id: 'str', ab: 'STR', name: 'Fuerza bruta', color: '#e8774a', aff: null,
      what: 'Determina el daño de impacto, la capacidad de empuje y de levantamiento.', out: v => ['Daño de impacto', 2 * v] },
    { id: 'fit', ab: 'FIT', name: 'Potencia muscular / Acondicionamiento', color: '#ffb35c', aff: 'enfoque',
      what: 'Influye en la estamina (MP/STA) y en el daño sostenido.', out: v => ['Estamina', 20 + 6 * v] },
    { id: 'dex', ab: 'DEX', name: 'Destreza fina', color: '#5fd3a0', aff: 'agilidad',
      what: 'Manipulación de objetos pequeños, cerrajería, puntería a distancia y manualidades.', out: v => ['Precisión', Math.min(95, 50 + 3 * v) + ' %'] },
    { id: 'agi', ab: 'AGI', name: 'Agilidad / Reflejos', color: '#6fd6e8', aff: null,
      what: 'Velocidad de desplazamiento, tiempo de reacción y esquiva.', out: v => ['Esquiva', Math.min(60, 2 * v) + ' %'] },
    { id: 'int', ab: 'INT', name: 'Inteligencia / Lógica', color: '#7fc4ff', aff: 'logica',
      what: 'Conocimiento académico, memoria, análisis de debilidades y magia de fórmulas (arcana o tecnológica).', out: v => ['Poder de fórmulas', 2 * v] },
    { id: 'wit', ab: 'WIT', name: 'Ingenio / Astucia', color: '#a98bff', aff: 'metacog',
      what: 'Velocidad mental para improvisar, velocidad de lanzamiento de hechizos, iniciativa y engaño.', out: v => ['Iniciativa', v] },
    { id: 'per', ab: 'PER', name: 'Sabiduría / Percepción', color: '#c7a6ff', aff: 'analisis',
      what: 'Observación de detalles, detectar trampas y sigilo, y sentido común.', out: v => ['Detección', 3 * v] },
    { id: 'wil', ab: 'WIL', name: 'Voluntad / Templanza', color: '#ff8fb1', aff: 'tolerancia',
      what: 'Resistencia a la magia mental (control, miedo), perseverancia y control del dolor.', out: v => ['Resistencia mental', Math.min(75, 3 * v) + ' %'] },
    { id: 'dev', ab: 'DEV', name: 'Fe / Devoción', color: '#ffd166', aff: 'empatia',
      what: 'Conexión con entidades superiores, milagros, magia sagrada o canalización de energía vital.', out: v => ['Poder vital', 2 * v] }
  ];
  const GAME = Object.fromEntries(GAME_STATS.map(g => [g.id, g]));
  // Qué entrena cada tipo de tarea (suma 1).
  const FAM_TRAINS = {
    build: { agilidad: 0.45, logica: 0.35, memoria: 0.2 },
    claude: { analisis: 0.4, logica: 0.35, metacog: 0.25 },
    create: { agilidad: 0.4, enfoque: 0.35, memoria: 0.25 },
    test: { analisis: 0.45, tolerancia: 0.35, logica: 0.2 }
  };
  const attrNeed = L => Math.round(20 * Math.pow(L, 1.25)); // 20, 48, 79, 113, 150…
  let attrCache = { t: 0, v: null };
  function attrs(tot) {
    if (!tot && attrCache.v && Date.now() - attrCache.t < 1500) return attrCache.v;
    tot = tot || totals();
    const pts = Object.fromEntries(ATTRS.map(a => [a.id, 0]));
    const reps = {};
    const add = (day, id, p) => { const k = day + '|' + id, r = reps[k] || 0; reps[k] = r + 1; pts[id] += p / (1 + 0.15 * r); };
    const ev = tot.events.slice().sort((a, b) => a.at - b.at);
    ev.forEach((e, i) => {
      const d = dayKey(e.at);
      Object.entries(FAM_TRAINS[familyOf(e.tag)]).forEach(([id, w]) => add(d, id, 10 * w));
      if (i >= 2 && e.at - ev[i - 2].at <= 20 * 60000) add(d, 'enfoque', 3);
    });
    // Días: cada día activo entrena enfoque; volver después de 2+ días sin avanzar entrena resiliencia.
    const starts = [...new Set(ev.map(e => startOfDay(e.at)))].sort((a, b) => a - b);
    starts.forEach((s, i) => {
      const d = dayKey(s);
      add(d, 'enfoque', 1);
      if (i && Math.round((s - starts[i - 1]) / DAY) >= 3) add(d, 'resiliencia', 12);
      else add(d, 'resiliencia', 1);
    });
    Object.values(state.projects).forEach(p => {
      p.roadmap.phases.forEach(ph => {
        const pp = p.progress.phases[ph.n];
        if (!pp) return;
        if (pp.hours > 0) pts.metacog += 2;
        if (!pp.doneAt) return;
        const d = dayKey(pp.doneAt);
        add(d, 'memoria', 6); add(d, 'metacog', 5);
        if (pp.hours > 0 && ph.hours > 0 && pp.hours <= ph.hours) add(d, 'metacog', 6);
      });
      Object.values(p.progress.prompts).forEach(v => { const d = dayKey(typeof v === 'number' ? v : 0); add(d, 'metacog', 2); add(d, 'analisis', 1); });
    });
    const pr = state.profile;
    const claimN = (pr.claimsOld || 0) + Object.values(pr.claims).reduce((n, day) => n + Object.keys(day).length, 0);
    pts.memoria += 3 * claimN; pts.enfoque += 2 * claimN;
    const ws = workshop();
    Object.entries(ws.trylog || {}).forEach(([d, [ok, fail, back]]) => {
      for (let i = 0; i < ok; i++) { add(d, 'agilidad', 4); add(d, 'analisis', 2); }
      for (let i = 0; i < fail; i++) { add(d, 'agilidad', 2); add(d, 'tolerancia', 3); }
      for (let i = 0; i < back; i++) { add(d, 'tolerancia', 4); add(d, 'resiliencia', 4); }
    });
    const bd = bond();
    Object.entries(bd.pos).forEach(([d, n]) => { for (let i = 0; i < n; i++) add(d, 'empatia', 1.5); });
    pts.empatia += 5 * Object.keys(bd.lessons).length + (bd.empOld || 0);
    if (bd.lessons.respect) pts.tolerancia += 5;

    // Los atributos de aprendizaje solo suben usándolos.
    const out = { _spent: 0, _game: {} };
    ATTRS.forEach(a => {
      let L = 1, rest = pts[a.id];
      while (rest >= attrNeed(L)) { rest -= attrNeed(L); L++; }
      out[a.id] = { trained: L, into: rest, need: attrNeed(L), value: L, pts: pts[a.id] };
    });
    // Los stats de juego reciben los puntos de nivel.
    const alloc = pr.gamePts || {};
    GAME_STATS.forEach(g => {
      const given = alloc[g.id] || 0, aff = g.aff ? Math.floor((out[g.aff].trained - 1) / 3) : 0;
      out._spent += given;
      out._game[g.id] = { given, aff, value: GAME_BASE + given + aff };
    });
    out._avail = Math.max(0, levelOf(tot.xp).L - 1 - out._spent);
    attrCache = { t: Date.now(), v: out };
    return out;
  }
  const statB = id => attrs()[id].value - 1; // bono: lo que tiene por sobre el nivel 1
  function giveStat(id) {
    const a = attrs(totals());
    if (!GAME[id] || a._avail < 1) return;
    const pr = state.profile;
    pr.gamePts = pr.gamePts || {};
    pr.gamePts[id] = (pr.gamePts[id] || 0) + 1;
    attrCache.t = 0; touchProfile();
    renderAll();
    const g = GAME[id], v = attrs()._game[id].value;
    say(pick([`${g.ab} sube a ${v}. ¡Lo siento en las orejitas!`, `¡+1 a ${g.name.toLowerCase()}! Ya quiero probarlo jugando.`, `Gracias. Voy a usar bien ese punto de ${g.ab}.`]));
  }
  function resetStats() {
    const pr = state.profile, k = dayKey(Date.now());
    if (pr.statReset === k || !Object.keys(pr.gamePts || {}).length) return;
    if (!confirm('¿Reasignar todos los puntos de los stats de juego? Puedes hacerlo una vez al día.')) return;
    pr.gamePts = {}; pr.statReset = k; attrCache.t = 0; touchProfile(); renderAll();
  }
  // Antes los puntos iban a los atributos de aprendizaje; ahora vuelven para repartirlos en los de juego.
  function migrateStatPoints() {
    const pr = state.profile;
    if (!pr.statPts || !Object.keys(pr.statPts).length) { delete pr.statPts; return false; }
    delete pr.statPts; attrCache.t = 0; touchProfile();
    return true;
  }
  // Lo que subió practicando entre dos fotos de los atributos.
  function attrUps(before) {
    attrCache.t = 0;
    const now = attrs(totals());
    return ATTRS.filter(a => now[a.id].trained > before[a.id].trained).map(a => `${a.name} ${now[a.id].trained}`);
  }
  function noteProgress(before, lvBefore, lvAfter) {
    const ups = attrUps(before);
    const msgs = [];
    if (lvAfter > lvBefore) msgs.push(`Tienes ${lvAfter - lvBefore === 1 ? '1 punto' : (lvAfter - lvBefore) + ' puntos'} para tus stats de juego.`);
    if (ups.length) msgs.push(`Practicando subió: ${ups.join(', ')}.`);
    if (msgs.length) setTimeout(() => say(msgs.join(' '), state.screen === 'home'), 2600);
  }
  const comboWindow = () => (20 + Math.min(10, statB('enfoque'))) * 60000;

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

  // ---------- taller: química, cocina y orfebrería de verdad ----------
  // Todas las mezclas son reales: aleaciones, vidrio, cerámica, jabón, cocina y experimentos caseros seguros.
  // La app NO enseña las recetas: no hay pistas. Se descubren probando, aplicando lo que sabes
  // o aprendiendo de otras personas en la Plaza.
  const svgJar = (fill, extra) => `<path d="M12 10h16v4l3 4v14a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V18l3-4z" fill="${fill}" stroke="#aab2c0" stroke-width="1.2"/><rect x="11" y="6" width="18" height="5" rx="2" fill="#8a6247"/>${extra || ''}`;
  const svgOre = fill => `<path d="M7 27l5-11h16l5 11z" fill="${fill}"/><path d="M12 16h16l2 4H10z" fill="#ffffff" opacity=".35"/>`;
  const svgBag = fill => `<path d="M10 14q10-6 20 0l2 18H8z" fill="${fill}" stroke="#aab2c0" stroke-width="1.2"/><path d="M14 13q6-6 12 0" stroke="#8a6247" stroke-width="2" fill="none"/>`;
  const svgLeaf = fill => `<path d="M20 34c0-12 2-20 10-26-1 10-4 18-10 26z" fill="${fill}"/><path d="M20 34C18 24 14 18 8 14c2 10 6 16 12 20z" fill="${fill}" opacity=".75"/>`;
  // Materiales base. "src" dice de dónde salen al avanzar.
  const MATS = {
    agua: { name: 'Agua', src: 'siempre hay', color: '#7fc4ff', svg: '<path d="M20 6c6 9 10 14 10 19a10 10 0 0 1-20 0c0-5 4-10 10-19z" fill="#7fc4ff"/>' },
    cobre: { name: 'Cobre', src: 'build', color: '#c8743f', svg: svgOre('#c8743f') },
    estano: { name: 'Estaño', src: 'build', color: '#b9c0c9', svg: svgOre('#b9c0c9') },
    zinc: { name: 'Zinc', src: 'build', color: '#9fb0b8', svg: svgOre('#9fb0b8') },
    hierro: { name: 'Hierro', src: 'build', color: '#7d8597', svg: svgOre('#7d8597') },
    carbon: { name: 'Carbón', src: 'build', color: '#3a3a40', svg: '<path d="M8 26l6-12 8 2 8-4 4 14z" fill="#3a3a40"/>' },
    arena: { name: 'Arena', src: 'claude', color: '#e2c48f', svg: svgBag('#e2c48f') },
    sosa: { name: 'Carbonato de sodio', src: 'claude', color: '#eceff4', svg: svgJar('#eceff4') },
    cal: { name: 'Cal', src: 'claude', color: '#f2f2ec', svg: svgBag('#f2f2ec') },
    vinagre: { name: 'Vinagre', src: 'claude', color: '#e9d9a6', svg: svgJar('#e9d9a6') },
    bicarbonato: { name: 'Bicarbonato', src: 'claude', color: '#ffffff', svg: svgJar('#ffffff') },
    maicena: { name: 'Maicena', src: 'claude', color: '#f6edd4', svg: svgBag('#f6edd4') },
    harina: { name: 'Harina', src: 'create', color: '#f3ead6', svg: svgBag('#f3ead6') },
    levadura: { name: 'Levadura', src: 'create', color: '#d9b77a', svg: svgJar('#d9b77a') },
    azucar: { name: 'Azúcar', src: 'create', color: '#fbfbfb', svg: svgJar('#fbfbfb') },
    cacao: { name: 'Cacao', src: 'create', color: '#6b4127', svg: svgBag('#6b4127') },
    cera: { name: 'Cera de abeja', src: 'create', color: '#f2c14e', svg: '<path d="M20 6l12 7v14l-12 7-12-7V13z" fill="#f2c14e"/>' },
    aceite: { name: 'Aceite', src: 'create', color: '#d9c45a', svg: svgJar('#d9c45a') },
    arcilla: { name: 'Arcilla', src: 'create', color: '#c97a5c', svg: '<path d="M8 26c0-8 6-14 12-14s12 6 12 14c0 4-6 6-12 6s-12-2-12-6z" fill="#c97a5c"/>' },
    leche: { name: 'Leche', src: 'test', color: '#fafafa', svg: svgJar('#fafafa') },
    limon: { name: 'Limón', src: 'test', color: '#f5d33d', svg: '<ellipse cx="20" cy="21" rx="11" ry="8" fill="#f5d33d"/><path d="M31 21l3-2M9 21l-3 2" stroke="#e0b820" stroke-width="2"/>' },
    sal: { name: 'Sal', src: 'test', color: '#f4f6f8', svg: svgJar('#f4f6f8') },
    hielo: { name: 'Hielo', src: 'test', color: '#cfeaff', svg: '<rect x="9" y="11" width="22" height="20" rx="4" fill="#cfeaff"/><path d="M13 15h6" stroke="#fff" stroke-width="2"/>' },
    ceniza: { name: 'Ceniza de leña', src: 'test', color: '#9b9b9b', svg: svgBag('#9b9b9b') },
    miel: { name: 'Miel', src: 'test', color: '#e9a527', svg: svgJar('#e9a527') },
    oro: { name: 'Oro', src: 'fase', color: '#f5c542', svg: svgOre('#f5c542') },
    plata: { name: 'Plata', src: 'raro', color: '#d9dde4', svg: svgOre('#d9dde4') },
    manzanilla: { name: 'Manzanilla', src: 'cariño', color: '#e8e27a', svg: svgLeaf('#9cc76a') + '<circle cx="27" cy="11" r="3" fill="#fff6b0"/>' },
    menta: { name: 'Menta', src: 'cariño', color: '#4fbf8a', svg: svgLeaf('#4fbf8a') }
  };
  // Productos que también sirven como material para otras mezclas.
  const PRODUCTS = {
    bronce: { name: 'Bronce', color: '#b0793c' }, laton: { name: 'Latón', color: '#d4b04a' }, acero: { name: 'Acero', color: '#8e98a8' },
    ororosa: { name: 'Oro rosa', color: '#e6a58f' }, electro: { name: 'Electro', color: '#e8d27a' }, platadeley: { name: 'Plata de ley', color: '#e3e6ea' },
    vidrio: { name: 'Vidrio', color: '#bfe6f5' }, ceramica: { name: 'Cerámica', color: '#c4683f' }, mortero: { name: 'Mortero', color: '#c9c3b6' },
    jabon: { name: 'Jabón', color: '#f3e9c6' }, caseina: { name: 'Plástico de leche', color: '#f1ead8' }, salmuera: { name: 'Salmuera', color: '#d9eef7' }
  };
  Object.entries(PRODUCTS).forEach(([id, p]) => (MATS[id] = { name: p.name, src: 'hecho', color: p.color, svg: id === 'vidrio' ? '<path d="M14 8h12l-2 24h-8z" fill="#bfe6f5" stroke="#8fc9e0"/>' : svgOre(p.color), made: true }));
  const PROC = { frio: 'En frío', calentar: 'Calentar', hornear: 'Hornear', fundir: 'Fundir', forjar: 'Forjar' };
  // kind: mat (queda como material), food (se le da a Mochi), exp (experimento que se ve y ya), jewel (joya equipable).
  const RECIPES = {
    'cobre+estano|fundir': { kind: 'mat', out: 'bronce', fact: 'Unos 9 de cobre por 1 de estaño. Con esta aleación empezó una edad entera de la historia humana.' },
    'cobre+zinc|fundir': { kind: 'mat', out: 'laton', fact: 'El latón es cobre con zinc: más dorado y fácil de trabajar. Lo tienen muchas llaves y trompetas.' },
    'carbon+hierro|fundir': { kind: 'mat', out: 'acero', fact: 'Un poquito de carbono en el hierro lo vuelve acero: más duro y resistente.' },
    'cobre+oro|fundir': { kind: 'mat', out: 'ororosa', fact: 'El oro rosa es oro con cobre; mientras más cobre, más rosado.' },
    'oro+plata|fundir': { kind: 'mat', out: 'electro', fact: 'El electro existe en la naturaleza. Con él se acuñaron algunas de las primeras monedas, en Lidia.' },
    'cobre+plata|fundir': { kind: 'mat', out: 'platadeley', fact: 'La plata de ley tiene 92,5 % de plata y el resto cobre, porque la plata pura es muy blanda.' },
    'arena+cal+sosa|fundir': { kind: 'mat', out: 'vidrio', fact: 'Arena (sílice), carbonato de sodio y cal: la receta del vidrio común de ventanas y botellas.' },
    'agua+arcilla|hornear': { kind: 'mat', out: 'ceramica', fact: 'El barro cocido a alta temperatura se vuelve cerámica: ya no se deshace con agua.' },
    'agua+arena+cal|frio': { kind: 'mat', out: 'mortero', fact: 'Cal, arena y agua: el mortero con que se pegaron ladrillos por miles de años.' },
    'aceite+agua+ceniza|calentar': { kind: 'mat', out: 'jabon', fact: 'La ceniza de leña tiene potasa; con grasa y calor se hace jabón. Así se hacía antiguamente.' },
    'leche+vinagre|calentar': { kind: 'mat', out: 'caseina', fact: 'El ácido separa la caseína de la leche caliente: un "plástico" que se puede moldear.' },
    'agua+sal|frio': { kind: 'mat', out: 'salmuera', fact: 'Agua con mucha sal: sirve para conservar alimentos.' },
    'agua+harina+levadura|hornear': { kind: 'food', id: 'pan', name: 'Pan', color: '#d9a55a', text: '+15 de vida hoy.', boost: { hp: 15 }, fact: 'La levadura come azúcares de la harina y suelta gas: por eso el pan se infla.' },
    'agua+harina|hornear': { kind: 'food', id: 'acimo', name: 'Pan ácimo', color: '#e8c98f', text: '+8 de vida hoy.', boost: { hp: 8 }, fact: 'Sin levadura el pan queda plano. Es uno de los panes más antiguos.' },
    'azucar|calentar': { kind: 'food', id: 'caramelo', name: 'Caramelo', color: '#c8862f', text: '+15 de estamina hoy.', boost: { sta: 15 }, fact: 'Calentado, el azúcar se derrite y cambia: eso es la caramelización.' },
    'leche+limon|calentar': { kind: 'food', id: 'requeson', name: 'Requesón', color: '#f6f1e2', text: '+20 de estamina hoy.', boost: { sta: 20 }, fact: 'El ácido del limón corta la leche caliente y separa la cuajada.' },
    'azucar+cacao+leche|calentar': { kind: 'food', id: 'chocolate', name: 'Chocolate caliente', color: '#6b4127', text: 'Le quita el malhumor de hoy.', cure: ['malhumor'], fact: 'El cacao se disuelve mejor en leche caliente.' },
    'agua+azucar+limon|frio': { kind: 'food', id: 'limonada', name: 'Limonada', color: '#f5e27a', text: '+25 de estamina hoy.', boost: { sta: 25 }, fact: 'El azúcar equilibra la acidez del limón.' },
    'agua+limon+miel|calentar': { kind: 'food', id: 'miellimon', name: 'Agua de miel y limón', color: '#f0c25a', text: '+25 de vida hoy.', boost: { hp: 25 }, fact: 'Un remedio casero de toda la vida para la garganta.' },
    'agua+manzanilla|calentar': { kind: 'food', id: 'te', name: 'Té de manzanilla', color: '#e3e08a', text: 'Quita las ojeras y la lentitud de hoy.', cure: ['ojeras', 'lento'], fact: 'Infusión suave que mucha gente toma para relajarse.' },
    'agua+manzanilla+miel|calentar': { kind: 'food', id: 'temiel', name: 'Manzanilla con miel', color: '#ecc76a', text: 'Cura el agotamiento y el malhumor de hoy.', cure: ['agotado', 'malhumor'], fact: 'Una taza tibia y dulce para bajar las revoluciones.' },
    'agua+menta|calentar': { kind: 'food', id: 'temen', name: 'Té de menta', color: '#7fd1a3', text: 'Despeja la cabeza nublada y da +15 de maná hoy.', cure: ['nublado'], boost: { mp: 15 }, fact: 'El mentol da sensación de frescor.' },
    'bicarbonato+vinagre|frio': { kind: 'exp', name: 'Erupción de espuma', color: '#f2f2f2', fact: 'Ácido + base: el bicarbonato y el vinagre reaccionan y sueltan dióxido de carbono.' },
    'hielo+sal|frio': { kind: 'exp', name: 'Mezcla frigorífica', color: '#cfeaff', fact: 'La sal hace que el hielo se derrita absorbiendo calor: la mezcla baja de 0 °C.' },
    'agua+maicena|frio': { kind: 'exp', name: 'Fluido no newtoniano', color: '#f6edd4', fact: 'Si lo golpeas está duro; si lo tocas suave, se escurre.' },
    'agua+jabon|frio': { kind: 'exp', name: 'Burbujas de jabón', color: '#d9f2ff', fact: 'El jabón baja la tensión del agua y deja formar películas finitas.' },
    'agua+sal|calentar': { kind: 'exp', name: 'Cristales de sal', color: '#f4f6f8', fact: 'Al evaporarse el agua, la sal vuelve a cristalizar.' },
    'platadeley|forjar': { kind: 'jewel', id: 'anillo', fact: 'La plata de ley se martilla y se pule para hacer anillos.' },
    'vidrio|forjar': { kind: 'jewel', id: 'amuleto', fact: 'Las cuentas de vidrio se hacen enrollando vidrio caliente en una varilla.' },
    'bronce|forjar': { kind: 'jewel', id: 'broche', fact: 'Los broches de bronce se usaban para cerrar capas hace miles de años.' },
    'ororosa|forjar': { kind: 'jewel', id: 'dije', fact: 'El oro rosa es popular en joyería por su tono cálido.' },
    'electro|forjar': { kind: 'jewel', id: 'perlas', fact: 'Una moneda de electro, como las primeras de la historia.' },
    'laton|forjar': { kind: 'jewel', id: 'pulsera', fact: 'El latón se dobla bien en frío y en caliente: ideal para pulseras.' }
  };
  const FOOD = Object.fromEntries(Object.values(RECIPES).filter(r => r.kind === 'food').map(r => [r.id, r]));
  FOOD.engrudo = { id: 'engrudo', name: 'Engrudo raro', color: '#a3a07a', text: 'No hace nada… pero Mochi lo prueba igual.' };
  const FAIL = {
    frio: 'No pasó nada interesante: quedó todo revuelto.', calentar: 'Se entibió, burbujeó un poco… y nada más.',
    hornear: 'Salió algo duro y raro del horno.', fundir: 'Lo que no se fundió se quemó. Huele a carbón.', forjar: 'Lo martillaste, pero no tomó forma.'
  };
  const recipeOutName = r => r.kind === 'mat' ? MATS[r.out].name : r.kind === 'jewel' ? ITEM[r.id].name : r.name;
  function workshop() {
    const pr = state.profile;
    if (!pr.mats) pr.mats = {};
    if (!pr.bag) pr.bag = {};
    if (!pr.recipes) pr.recipes = {};
    if (pr.ws !== 2) {
      // migración: materiales viejos a reales, recetario nuevo y un kit de inicio de cocina básica
      const old = pr.mats, map = { hierro: 'hierro', cristal: 'arena', arcilla: 'arcilla', chispa: 'limon', oro: 'oro', perla: 'plata', hierba: 'manzanilla' };
      const mats = {};
      Object.entries(old).forEach(([k, n]) => { const to = map[k] || (MATS[k] ? k : null); if (to) mats[to] = (mats[to] || 0) + n; });
      [['limon', 1], ['azucar', 2], ['harina', 2], ['levadura', 1], ['manzanilla', 1], ['leche', 1]].forEach(([k, n]) => (mats[k] = (mats[k] || 0) + n));
      pr.mats = mats;
      pr.bag = Object.fromEntries(Object.entries(pr.bag).filter(([k]) => FOOD[k]));
      pr.recipes = {};
      pr.ws = 2;
    }
    return pr;
  }
  const POOLS = { build: [], claude: [], create: [], test: [] };
  Object.entries(MATS).forEach(([id, m]) => { if (POOLS[m.src]) POOLS[m.src].push(id); });
  function giveMat(id, n, silent) {
    const pr = workshop();
    pr.mats[id] = (pr.mats[id] || 0) + (n || 1);
    touchProfile();
    if (!silent) floatMat(id, n || 1);
  }
  // Recompensa según de dónde viene: tipo de tarea, fase, diaria, cariño.
  function giveFrom(src, n) {
    const pool = src === 'fase' ? ['oro', 'plata'] : src === 'raro' ? ['plata', 'oro', 'cacao', 'cera'] : src === 'cariño' ? ['manzanilla', 'menta', 'miel'] : POOLS[src];
    if (!pool || !pool.length) return;
    for (let i = 0; i < (n || 1); i++) giveMat(pick(pool), 1, src === 'cariño');
  }
  function floatMat(id, n) {
    const tab = document.querySelector('.tab[data-go="taller"]');
    if (!tab || !tab.getBoundingClientRect().width) return;
    const r = tab.getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'floatxp mat'; f.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${MATS[id].svg}</svg>+${n}`;
    f.style.left = r.left + r.width / 2 - 14 + 'px'; f.style.top = r.top - 26 + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1100);
  }
  const cauldron = [];
  let process = 'frio', trySource = null;
  const mixKey = (list, proc) => list.slice().sort().join('+') + '|' + proc;
  function doMix() {
    const pr = workshop();
    if (!cauldron.length) return;
    const key = mixKey(cauldron, process);
    const rec = RECIPES[key];
    if (rec && rec.kind === 'jewel' && pr.unlocked[rec.id]) {
      $('#t-result').innerHTML = `<p class="muted">Ya tienes ${esc(ITEM[rec.id].name.toLowerCase())}. Guarda el material para otra cosa.</p>`; return;
    }
    cauldron.forEach(m => { if (m !== 'agua') pr.mats[m] = Math.max(0, (pr.mats[m] || 0) - 1); });
    cauldron.length = 0;
    const isNew = rec && !pr.recipes[key];
    // Cada intento entrena (estilo FF2): acertar, fallar y sobre todo acertar después de fallar.
    const tk = dayKey(Date.now());
    pr.trylog = pr.trylog || {};
    const tl = pr.trylog[tk] || (pr.trylog[tk] = [0, 0, 0]);
    if (rec) { tl[0]++; if (pr.lastFail) tl[2]++; } else tl[1]++;
    pr.lastFail = !rec;
    let title, icon, sub, fact;
    if (!rec) {
      title = 'Mezcla fallida'; sub = FAIL[process]; icon = foodSvg(FOOD.engrudo);
      if (Math.random() < 0.35) { pr.bag.engrudo = (pr.bag.engrudo || 0) + 1; sub += ' Quedó un engrudo raro.'; }
    } else {
      pr.recipes[key] = pr.recipes[key] || Date.now();
      fact = rec.fact;
      if (rec.kind === 'mat') { pr.mats[rec.out] = (pr.mats[rec.out] || 0) + 1; title = MATS[rec.out].name; sub = 'Nuevo material: sirve para otras mezclas.'; icon = `<svg viewBox="0 0 40 40" aria-hidden="true">${MATS[rec.out].svg}</svg>`; }
      else if (rec.kind === 'food') { pr.bag[rec.id] = (pr.bag[rec.id] || 0) + 1; title = rec.name; sub = rec.text + ' Está en tu mochila.'; icon = foodSvg(rec); }
      else if (rec.kind === 'exp') { title = rec.name; sub = 'Experimento: se ve, se aprende y se acaba.'; icon = foodSvg(rec); if (pets.home) pets.home.express('surprised', 2000); }
      else { pr.unlocked[rec.id] = Date.now(); pr.newItems = (pr.newItems || []).concat(rec.id); title = ITEM[rec.id].name; sub = perkText(ITEM[rec.id].perk) + '. Póntela en Equipo.'; icon = `<svg viewBox="0 0 40 40" aria-hidden="true">${ITEM[rec.id].svg}</svg>`; }
      // si venía de un aporte de la Plaza, se lo agradece a quien enseñó
      if (trySource && trySource.key === key && plazaReady) { plazaMine().learned[trySource.post] = Date.now(); savePlaza(); bondChange(1, 'learn'); }
    }
    trySource = null;
    touchProfile();
    crackle(rec ? 1.5 : 0.6); feedAll(rec ? 0.4 : 0.1);
    const pot = $('#t-pot'); pot.classList.remove('boil'); void pot.offsetWidth; pot.classList.add('boil');
    renderWorkshop();
    $('#t-result').innerHTML = `<div class="made ${rec ? '' : 'odd'}">
      <span class="made-ico">${icon}</span>
      <span><small>${rec ? (isNew ? '¡Descubrimiento!' : 'Lo hiciste otra vez') : esc(PROC[process])}</small><b>${esc(title)}</b>
      <span>${esc(sub)}</span>${fact ? `<em>${esc(fact)}</em>` : ''}</span></div>`;
    say(rec ? (isNew ? `¡Descubriste ${title.toLowerCase()}! Cuéntalo en la Plaza.` : `Hiciste ${title.toLowerCase()}.`) : 'Eso no salió… pero así se aprende.', !!(rec && isNew));
  }
  function foodSvg(r) {
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 14h20v6a10 10 0 0 1-20 0z" fill="${r.color || '#ccc'}"/><path d="M30 16h3a3 3 0 0 1 0 6h-3" stroke="#9aa3b8" stroke-width="2" fill="none"/><path d="M8 32h24" stroke="#9aa3b8" stroke-width="3" stroke-linecap="round"/></svg>`;
  }
  // Darle algo hecho a Mochi: cura efectos o sube vitales hoy. Cuidar también es un idioma.
  function usePotion(id, el) {
    const pr = workshop(), r = FOOD[id];
    if (!r || !(pr.bag[id] > 0)) return;
    pr.bag[id]--;
    const today = dayKey(Date.now());
    if (!pr.boosts || pr.boosts.day !== today) pr.boosts = { day: today, hp: 0, mp: 0, sta: 0, cured: [] };
    const b = pr.boosts;
    (r.cure || []).forEach(c => { if (!b.cured.includes(c)) b.cured.push(c); });
    Object.entries(r.boost || {}).forEach(([k, v]) => (b[k] = Math.min(100, (b[k] || 0) + v)));
    touchProfile();
    sparkFrom(el, 'create', () => feedAll(0.8));
    bondChange(id === 'engrudo' ? 0.5 : 2, 'care');
    renderAll();
    say(id === 'engrudo' ? pick(['*lo prueba* …sabe a lunes. Gracias igual.', 'Mmm… crujiente. ¿Era comida?']) : pick([`¡Gracias por ${r.name.toLowerCase()}! Me siento mejor.`, 'Qué rico… me cuidaste. Gracias.']), true);
    if (pets.home) pets.home.express(id === 'engrudo' ? 'dizzy' : 'love', 2500);
  }

  // ---------- plaza: comunidad ----------
  // Un lugar compartido entre quienes usan esta página. Cada persona escribe solo su propio documento
  // (plaza/<su id>) y todos leen los de todos. Aquí se aprende de otras personas, no de la app:
  // se comparten descubrimientos, se pregunta, se debate y se regalan materiales.
  let myPlazaDoc = null, plazaDocs = {}, plazaReady = false, plazaNames = {}, plazaDraft = null, plazaSaveT = 0, plazaUser = null;
  const KINDS = { descubrimiento: 'Descubrimiento', pregunta: 'Pregunta', debate: 'Debate', pedido: 'Pedido' };
  function plazaMine() {
    if (!state.uid || !plazaReady) return { posts: [], replies: [], likes: {}, votes: {}, learned: {}, gifts: [] };
    // Mi documento vive aquí y manda sobre lo que llegue del servidor (evita perder cambios aún no guardados).
    if (!myPlazaDoc) myPlazaDoc = JSON.parse(JSON.stringify(plazaDocs[state.uid] || {}));
    const d = plazaDocs[state.uid] = myPlazaDoc;
    d.posts = Array.isArray(d.posts) ? d.posts : []; d.replies = Array.isArray(d.replies) ? d.replies : [];
    d.likes = d.likes || {}; d.votes = d.votes || {}; d.learned = d.learned || {}; d.gifts = Array.isArray(d.gifts) ? d.gifts : [];
    return d;
  }
  function savePlaza() {
    if (!state.db || !state.uid) return;
    clearTimeout(plazaSaveT);
    plazaSaveT = setTimeout(async () => {
      const d = plazaMine();
      // límites para que el documento no crezca sin fin
      d.posts = d.posts.slice(-80); d.replies = d.replies.slice(-300); d.gifts = d.gifts.slice(-100);
      d.updatedAt = Date.now();
      try { await state.db.collection('plaza').doc(state.uid).set(JSON.parse(JSON.stringify(d))); }
      catch (e) { const st = $('#p-state'); if (st) st.textContent = 'No se pudo publicar. Necesitas permiso de Colaborador en esta página para escribir en la Plaza.'; }
    }, 300);
  }
  const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
  const okId = v => typeof v === 'string' && /^[a-z0-9]{4,24}$/i.test(v);
  // Todo lo de otras personas se valida y recorta antes de usarlo.
  function allPosts() {
    const out = [];
    Object.entries(plazaDocs).forEach(([uid, d]) => (Array.isArray(d.posts) ? d.posts : []).forEach(p => {
      if (!p || !okId(p.id) || !KINDS[p.kind]) return;
      out.push({ uid, id: p.id, at: Number(p.at) || 0, kind: p.kind, title: clip(p.title, 90), body: clip(p.body, 800), mix: RECIPES[p.mix] ? p.mix : null });
    }));
    return out.sort((a, b) => b.at - a.at);
  }
  function repliesTo(pid) {
    const out = [];
    Object.entries(plazaDocs).forEach(([uid, d]) => (Array.isArray(d.replies) ? d.replies : []).forEach(r => {
      if (r && r.to === pid && okId(r.id)) out.push({ uid, id: r.id, at: Number(r.at) || 0, body: clip(r.body, 400), stance: r.stance === 'si' || r.stance === 'no' ? r.stance : '' });
    }));
    return out.sort((a, b) => a.at - b.at);
  }
  const countIn = (field, pid, val) => Object.values(plazaDocs).filter(d => d && d[field] && (val ? d[field][pid] === val : d[field][pid])).length;
  function timeAgo(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'recién'; if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
    return `hace ${Math.round(h / 24)} d`;
  }
  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  // Regalos y enseñanzas que otras personas dejaron para ti.
  function collectFromOthers() {
    if (!state.uid) return;
    const pr = workshop();
    pr.giftsIn = pr.giftsIn || {}; pr.taught = pr.taught || {};
    const today = dayKey(Date.now());
    let changed = false, msgs = [];
    Object.entries(plazaDocs).forEach(([uid, d]) => {
      if (uid === state.uid || !d) return;
      (Array.isArray(d.gifts) ? d.gifts : []).forEach(g => {
        if (!g || g.to !== state.uid || !okId(g.id) || !MATS[g.mat] || MATS[g.mat].made || g.mat === 'agua') return;
        const k = uid + ':' + g.id, dayK = uid + ':' + today;
        if (pr.giftsIn[k]) return;
        // máximo 5 regalos al día por persona
        pr.giftsIn[dayK] = (pr.giftsIn[dayK] || 0);
        if (pr.giftsIn[dayK] >= 5) return;
        pr.giftsIn[dayK]++; pr.giftsIn[k] = 1;
        pr.mats[g.mat] = (pr.mats[g.mat] || 0) + 1; changed = true;
        msgs.push(`${plazaName(uid)} te regaló ${MATS[g.mat].name.toLowerCase()}`);
      });
      const mine = new Set(plazaMine().posts.map(p => p.id));
      Object.keys(d.learned || {}).forEach(pid => {
        if (!mine.has(pid)) return;
        const k = uid + ':' + pid;
        if (pr.taught[k] || Object.keys(pr.taught).length >= 40) return;
        pr.taught[k] = Date.now(); pr.teachXp = (pr.teachXp || 0) + 15; changed = true;
        msgs.push(`${plazaName(uid)} aprendió con lo que compartiste: +15 XP`);
        bondChange(1, 'teach');
      });
    });
    if (changed) { touchProfile(); renderAll(); if (msgs.length) say(msgs.slice(0, 2).join(' · ') + '.', true); }
  }
  function plazaName(uid) { return uid === state.uid ? 'Tú' : plazaNames[uid] || 'Alguien'; }
  async function resolveNames() {
    if (!plazaUser || typeof plazaUser.profiles !== 'function') return;
    const ids = Object.keys(plazaDocs).filter(id => !(id in plazaNames));
    if (!ids.length) return;
    try { const ps = await plazaUser.profiles(ids); ids.forEach(id => (plazaNames[id] = (ps[id] && ps[id].name) || '')); if (state.screen === 'plaza') renderPlaza(); } catch (e) { /* sin nombres */ }
  }
  function startPlaza(db, user) {
    plazaUser = user;
    try {
      db.collection('plaza').onSnapshot(snap => {
        const next = {};
        snap.docs.forEach(d => { if (d.exists) next[d.id] = d.data(); });
        plazaDocs = JSON.parse(JSON.stringify(next));
        if (myPlazaDoc) plazaDocs[state.uid] = myPlazaDoc;
        plazaReady = true;
        resolveNames().then(collectFromOthers, collectFromOthers);
        if (state.screen === 'plaza') renderPlaza();
      }, () => { plazaReady = false; if (state.screen === 'plaza') renderPlaza(); });
    } catch (e) { plazaReady = false; }
  }
  function mixText(key) {
    const [ing, proc] = key.split('|');
    return ing.split('+').map(m => MATS[m].name).join(' + ') + ' · ' + PROC[proc].toLowerCase();
  }
  function renderPlaza() {
    const st = $('#p-state'), box = $('#p-feed'), comp = $('#p-compose');
    const pr = workshop();
    if (!state.db || !state.uid || !plazaReady) {
      comp.hidden = true;
      st.textContent = 'La Plaza se activa cuando abres esta página en claude.ai con tu sesión iniciada. Para que otras personas participen, compártela desde el menú Compartir con permiso de Colaborador.';
      box.innerHTML = ''; return;
    }
    comp.hidden = false;
    const mine = plazaMine();
    const taught = Object.keys(pr.taught || {}).length, learned = Object.keys(mine.learned).length;
    st.textContent = `${Object.keys(plazaDocs).length} ${Object.keys(plazaDocs).length === 1 ? 'persona' : 'personas'} en la Plaza · enseñaste a ${taught} · aprendiste de ${learned}`;
    // borrador que viene del recetario
    if (plazaDraft) {
      $('#p-kind').value = plazaDraft.kind; $('#p-mixrow').hidden = plazaDraft.kind !== 'descubrimiento';
      fillMixSelect(plazaDraft.mix); if (!$('#p-title').value) $('#p-title').value = `Descubrí ${recipeOutName(RECIPES[plazaDraft.mix]).toLowerCase()}`;
      plazaDraft = null;
    } else fillMixSelect($('#p-mix').value);
    const posts = allPosts();
    box.innerHTML = posts.length ? posts.map(p => {
      const reps = repliesTo(p.id), isMine = p.uid === state.uid;
      const likes = countIn('likes', p.id), si = countIn('votes', p.id, 'si'), no = countIn('votes', p.id, 'no'), myVote = mine.votes[p.id];
      const learnedN = countIn('learned', p.id);
      return `<li class="post k-${p.kind}" id="post-${p.id}">
        <div class="post-top"><span class="kchip">${KINDS[p.kind]}</span><span class="who-p">${esc(plazaName(p.uid))} · ${timeAgo(p.at)}</span></div>
        ${p.title ? `<h3>${esc(p.title)}</h3>` : ''}
        ${p.body ? `<p>${esc(p.body)}</p>` : ''}
        ${p.mix ? `<div class="mixbox"><span>${esc(mixText(p.mix))}</span>${isMine ? '' : `<button class="btn small" data-try="${p.id}" data-key="${esc(p.mix)}">Probar en mi caldero</button>`}${learnedN ? `<em>${learnedN} ${learnedN === 1 ? 'persona aprendió' : 'personas aprendieron'} con esto</em>` : ''}</div>` : ''}
        ${p.kind === 'debate' ? `<div class="vote"><button class="${myVote === 'si' ? 'on' : ''}" data-vote="${p.id}" data-v="si">De acuerdo · ${si}</button><button class="${myVote === 'no' ? 'on' : ''}" data-vote="${p.id}" data-v="no">En desacuerdo · ${no}</button></div>` : ''}
        <div class="post-actions">
          <button class="link ${mine.likes[p.id] ? 'liked' : ''}" data-like="${p.id}">Útil · ${likes}</button>
          ${isMine ? `<button class="link danger" data-delpost="${p.id}">Borrar</button>` : `<span class="gift"><select id="g-${p.id}" aria-label="Material para regalar">${Object.entries(pr.mats).filter(([id, n]) => n > 0 && MATS[id] && !MATS[id].made).map(([id, n]) => `<option value="${id}">${esc(MATS[id].name)} (${n})</option>`).join('')}</select><button class="link" data-gift="${p.id}" data-to="${esc(p.uid)}">Regalar</button></span>`}
        </div>
        <ul class="replies-list">${reps.map(r => `<li><b>${esc(plazaName(r.uid))}</b>${r.stance ? `<span class="st st-${r.stance}">${r.stance === 'si' ? 'de acuerdo' : 'en desacuerdo'}</span>` : ''}<span>${esc(r.body)}</span></li>`).join('')}</ul>
        <div class="reply-row"><input id="r-${p.id}" maxlength="400" placeholder="${p.kind === 'debate' ? 'Primero repite su idea con tus palabras, después da la tuya' : 'Responder…'}" autocomplete="off">
          ${p.kind === 'debate' ? `<select id="rs-${p.id}" aria-label="Postura"><option value="">Postura</option><option value="si">De acuerdo</option><option value="no">En desacuerdo</option></select>` : ''}
          <button class="btn small" data-reply-to="${p.id}">Enviar</button></div>
      </li>`;
    }).join('') : '<li class="muted">Todavía no hay nada. Sé la primera persona en compartir algo.</li>';
  }
  function fillMixSelect(sel) {
    const pr = workshop();
    const found = Object.keys(pr.recipes).filter(k => RECIPES[k]);
    $('#p-mix').innerHTML = '<option value="">Sin receta adjunta</option>' + found.map(k => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(recipeOutName(RECIPES[k]))}</option>`).join('');
  }
  function plazaClick(e) {
    const b = e.target.closest('button');
    if (!b || !state.uid) return;
    const mine = plazaMine();
    if (b.id === 'p-send') {
      const kind = $('#p-kind').value, title = $('#p-title').value.trim().slice(0, 90), body = $('#p-body').value.trim().slice(0, 800);
      const mix = kind === 'descubrimiento' ? $('#p-mix').value : '';
      if (!title && !body) { $('#p-title').focus(); return; }
      mine.posts.push({ id: newId(), at: Date.now(), kind, title, body, mix: RECIPES[mix] ? mix : null });
      savePlaza(); $('#p-title').value = ''; $('#p-body').value = '';
      bondChange(1, kind === 'debate' ? 'debate' : 'bid'); renderPlaza();
      say(kind === 'pregunta' ? 'Preguntar es valiente. Ojalá alguien responda pronto.' : '¡Publicado! Compartir lo que sabes ayuda a otros.');
    } else if (b.dataset.replyTo) {
      const pid = b.dataset.replyTo, inp = $('#r-' + pid), body = inp.value.trim().slice(0, 400);
      if (!body) { inp.focus(); return; }
      const stance = ($('#rs-' + pid) || {}).value || '';
      mine.replies.push({ id: newId(), at: Date.now(), to: pid, body, stance });
      savePlaza(); bondChange(1, stance ? 'debate' : 'bid'); renderPlaza();
    } else if (b.dataset.like) { mine.likes[b.dataset.like] ? delete mine.likes[b.dataset.like] : (mine.likes[b.dataset.like] = 1); savePlaza(); renderPlaza(); }
    else if (b.dataset.vote) { const v = b.dataset.v; mine.votes[b.dataset.vote] === v ? delete mine.votes[b.dataset.vote] : (mine.votes[b.dataset.vote] = v); savePlaza(); renderPlaza(); }
    else if (b.dataset.delpost) { mine.posts = mine.posts.filter(p => p.id !== b.dataset.delpost); savePlaza(); renderPlaza(); }
    else if (b.dataset.gift) {
      const sel = $('#g-' + b.dataset.gift), mat = sel && sel.value, pr = workshop();
      if (!mat || !(pr.mats[mat] > 0)) return;
      pr.mats[mat]--; touchProfile();
      mine.gifts.push({ id: newId(), at: Date.now(), to: b.dataset.to, mat });
      savePlaza(); bondChange(1, 'care'); renderPlaza();
      say(`Regalaste ${MATS[mat].name.toLowerCase()}. Dar también se siente bien.`);
    } else if (b.dataset.try) {
      const key = b.dataset.key, [ing, proc] = key.split('|'), pr = workshop();
      const need = ing.split('+'), missing = need.filter(m => m !== 'agua' && (pr.mats[m] || 0) < need.filter(x => x === m).length);
      cauldron.length = 0; need.forEach(m => { if (m === 'agua' || (pr.mats[m] || 0) > 0) cauldron.push(m); });
      process = proc; trySource = { post: b.dataset.try, key };
      go('taller');
      if (missing.length) $('#t-result').innerHTML = `<p class="muted">Te falta: ${missing.map(m => esc(MATS[m].name)).join(', ')}. Pídelo en la Plaza o sigue avanzando en tus misiones.</p>`;
    }
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
    for (let i = 2; i < ev.length; i++) if (ev[i].at - ev[i - 2].at <= comboWindow()) combo = 1;
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
  const questXp = q => Math.max(1, q.xp + perkBonus('quest') + Math.min(15, statB('memoria')) - (hasFx('malhumor') ? 5 : 0));
  function claimQuest(id, el) {
    const k = dayKey(Date.now());
    const qs = questState().find(x => x.q.id === id);
    if (!qs || !qs.ready) return;
    const xp = questXp(qs.q);
    const before = levelOf(totals().xp).L, aBefore = attrs(totals());
    // Guarda solo la última semana día a día; lo anterior queda sumado.
    const claims = state.profile.claims;
    Object.keys(claims).forEach(day => {
      const [y, m, dd] = day.split('-').map(Number);
      if (Date.now() - new Date(y, m - 1, dd).getTime() > 8 * DAY) {
        Object.values(claims[day]).forEach(v => (state.profile.claimedXp += v));
        state.profile.claimsOld = (state.profile.claimsOld || 0) + Object.keys(claims[day]).length; delete claims[day];
      }
    });
    (claims[k] || (claims[k] = {}))[id] = xp;
    giveFrom('raro');
    touchProfile();
    sparkFrom(el, 'create', () => { feedAll(0.8); crackle(1.5); });
    floatXP(el, '+' + xp + ' XP');
    const after = levelOf(totals().xp).L;
    checkUnlocks(true);
    renderAll();
    noteProgress(aBefore, before, after);
    say(after > before ? `Misión diaria cumplida: +${xp} XP. ¡Nivel ${after}!` : `Misión diaria cumplida: +${xp} XP.`, after > before);
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
    const fx = (hasFx('descansado') ? 1 : 0) - (hasFx('lento') ? 2 : 0);
    const fam = familyOf(t.tag), aBefore = attrs(tot);
    const sb = Math.ceil(statB(fam === 'claude' ? 'logica' : fam === 'test' ? 'analisis' : 'agilidad') / 2);
    let xp = Math.max(1, Math.round(((t.tag === 'PRUEBA' ? 12 : 10) + perkBonus('task', fam) + fx + sb) * mult));
    if (firstToday) xp += 5 + 2 * Math.min(10, streakOf(tot.days)) + perkBonus('daily');
    prog.tasks[t.id] = { at: Date.now(), xp };
    // material por tipo de tarea, una sola vez por tarea
    prog.mats = prog.mats || {};
    if (!prog.mats[t.id]) { prog.mats[t.id] = 1; giveFrom(familyOf(t.tag)); }
    if (!pp.startAt) pp.startAt = Date.now();
    touch(p);
    sparkFrom(fromEl, familyOf(t.tag), () => { feedAll(mult > 1 ? 1 : 0.6); crackle(mult); });
    floatXP(fromEl, '+' + xp + (mult > 1 ? ' ×' + mult : ''));
    const after = levelOf(totals().xp).L;
    checkUnlocks(true);
    renderAll();
    const ready = questState().filter(x => x.ready).length;
    noteProgress(aBefore, before, after);
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
      say(left ? pick([`+${xp}. Quedan ${left} en «${ph.title}».`, `Ñam. ${left} más y la fase está.`, `+${xp} XP. :3`]) :
        `Todas las tareas de «${ph.title}» listas. Confirma: ${(ph.fields.find(f => /^Listo/i.test(f.k)) || {}).v || 'la fase está terminada'}.`);
    }
  }

  function completePhase(p, ph, fromEl) {
    const pp = p.progress.phases[ph.n] || (p.progress.phases[ph.n] = {});
    if (pp.doneAt) return;
    const before = levelOf(totals().xp).L;
    const aBefore = attrs(totals());
    let xp = 40 + 5 * ph.tasks.length + perkBonus('phase');
    if (pp.hours > 0 && ph.hours > 0 && pp.hours <= ph.hours) xp = Math.round(xp * 1.2);
    xp = Math.round(xp * (1 + 0.03 * statB('metacog')));
    if (pp.timerStart) stopTimer(p, ph, true);
    pp.doneAt = Date.now(); pp.xp = xp;
    if (!pp.oro) { pp.oro = 1; giveFrom('fase', 2); }
    touch(p);
    sparkFrom(fromEl, 'create', () => { feedAll(1.4); crackle(2); });
    floatXP(fromEl, '+' + xp);
    const after = levelOf(totals().xp).L;
    state.open.delete(ph.n);
    const next = p.roadmap.phases.find(x => !(p.progress.phases[x.n] || {}).doneAt);
    if (next) state.open.add(next.n);
    checkUnlocks(true);
    renderAll();
    noteProgress(aBefore, before, after);
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
    if (phase !== 'sleep') { if (hasFx('lento')) alert *= 0.85; if (hasFx('agotado')) alert *= 0.7; if (hasFx('descansado')) alert = Math.min(1, alert + 0.1); }
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
    sleep: ['Zzz…', 'Zzz… zzz…', 'Zzz… (ronquidito)', '…mmm…', 'Zzz… soñando con estrellas…', 'Dormir ordena lo que aprendimos hoy… zzz', 'Zzz… mañana seguimos…', 'Zzz… *se da vuelta*', 'Zzz… el cerebro guarda lo de hoy…', '…ñam ñam… zzz', 'Zzz… *suspiro*'],
    waking: ['*bostezo* …buenos días.', 'Todavía tengo los ojos pegados.', 'Despacito, que recién despierto.', 'La luz de la mañana ayuda a despertar.'],
    peak: ['¡Me siento con la cabeza despejada!', 'Buena hora para lo difícil.', 'Hoy tengo ganas de preguntar todo.'],
    dip: ['Después de comer me da sueñito… es normal.', 'Un vaso de agua y seguimos.', 'Un ratito de pausa no hace mal.'],
    peak2: ['La tarde también es buena para aprender.', 'Me volvieron las ganas.', 'Una cosa más y otra más.'],
    calm: ['Ya va bajando el sol.', 'Buen momento para repasar lo de hoy.', 'Hoy aprendimos algo, ¿cierto?'],
    winddown: ['*bostezo* ya casi es hora de dormir.', 'Las pantallas de noche espantan el sueño.', 'Dormir bien también es estudiar.', 'Mañana sigo pensando en eso.']
  };
  // ---------- vínculo y empatía ----------
  // Basado en ideas de psicología de las relaciones:
  //  - Gottman: las "invitaciones a conectar" (responder o ignorar), la proporción sana 5:1 y la reparación tras un roce.
  //  - Rosenberg (Comunicación No Violenta): límites con observación, sentimiento, necesidad y petición.
  //  - Ponerle nombre a las emociones (affect labeling) y validar lo que siente el otro.
  const TIERS = [
    { min: 0, name: 'Reservado', text: 'Todavía no confía mucho: habla poco y pregunta poco.' },
    { min: 20, name: 'Tímido', text: 'Se está soltando: a veces se anima a preguntar.' },
    { min: 40, name: 'Amigable', text: 'Conversa tranquilo y te pregunta cómo estás.' },
    { min: 60, name: 'Cercano', text: 'Te cuenta cómo se siente, tiene más paciencia y más cariño.' },
    { min: 80, name: 'Confidente', text: 'Se siente seguro contigo: mucha paciencia, mucha ternura y conversaciones más hondas.' }
  ];
  const LESSONS = {
    bid: { t: 'Responder es conectar', d: 'Cuando alguien te habla, es una pequeña invitación. Responder, aunque sea corto, construye la relación. (Gottman: "bids for connection")' },
    ratio: { t: 'Cinco a uno', d: 'En las relaciones que funcionan hay unas cinco interacciones buenas por cada mala. No hace falta ser perfecto: hace falta que pesen más las buenas. (Gottman)' },
    boundary: { t: 'Un límite con cariño', d: 'Un buen límite dice lo que pasa, lo que siento, lo que necesito y pide algo concreto. Así se cuida la relación sin atacar. (Rosenberg, Comunicación No Violenta)' },
    respect: { t: 'Respetar una pausa', d: 'Dar espacio cuando el otro lo pide también es cariño. La confianza crece cuando el otro se siente seguro contigo.' },
    repair: { t: 'Reparar después de un roce', d: 'Un "¿estamos bien?" o un "perdón" después de un roce fortalece más la relación que nunca haber tenido roces. (Gottman: intentos de reparación)' },
    feelings: { t: 'Ponerle nombre a lo que sientes', d: 'Decir "estoy cansado" o "estoy mal" ayuda a calmar la emoción. Nombrarla es el primer paso para cuidarla.' },
    validate: { t: 'Validar no es estar de acuerdo', d: 'Validar es decir "tiene sentido que te sientas así". Hace que el otro se sienta escuchado.' },
    cold: { t: 'Decir cómo te hizo sentir', d: 'Si alguien te responde frío, puedes decir cómo te hizo sentir sin atacar: "eso me dolió un poquito". Así el otro entiende sin sentirse culpado.' },
    sleep: { t: 'Cuidar el descanso del otro', d: 'Respetar el sueño y los tiempos del otro es una forma silenciosa de respeto.' },
    care: { t: 'Cuidar también es un idioma', d: 'Hacer algo concreto por el otro, como un tecito cuando está cansado, también dice "me importas". (Chapman: actos de servicio)' },
    learn: { t: 'Aprender de otros', d: 'Lo que otra persona ya sabe te ahorra muchos intentos. Preguntar no es debilidad: es la forma más rápida de aprender.' },
    teach: { t: 'Enseñar es aprender dos veces', d: 'Cuando explicas algo a otra persona lo entiendes mejor tú. (Efecto protegido o "learning by teaching")' },
    debate: { t: 'Debatir sin pelear', d: 'En un desacuerdo, primero repite con tus palabras lo que dijo el otro; después da tu idea. Se discuten ideas, no personas.' },
    consent: { t: 'Leer las señales antes de tocar', d: 'A nadie le gusta que lo toquen sin parar. Pedir lo que uno quiere con palabras, mirar cómo reacciona el otro y parar cuando dice "ya" es respeto, no frialdad.' },
    space: { t: 'Aceptar un "no quiero hablar"', d: 'Cuando alguien no quiere hablar, aceptarlo sin insistir le deja la puerta abierta para volver.' }
  };
  function bond() {
    const pr = state.profile;
    return pr.bond || (pr.bond = { emp: 35, pos: {}, neg: {}, ignored: {}, lessons: {}, nightBonus: '' });
  }
  const tierOf = e => { let t = 0; TIERS.forEach((x, i) => { if (e >= x.min) t = i; }); return t; };
  // Cambia la empatía. Sube más lento cuando ya es alta y baja más suave si el vínculo es fuerte (como en la vida).
  function bondChange(delta, lesson) {
    const bd = bond(), k = dayKey(Date.now());
    if (delta > 0) { bd.pos[k] = (bd.pos[k] || 0) + 1; delta *= (bd.emp > 70 ? 0.6 : 1) * (1 + perkBonus('bond') / 100) * (1 + 0.04 * statB('empatia')); }
    if (delta < 0) { bd.neg[k] = (bd.neg[k] || 0) + 1; delta *= bd.emp > 70 ? 0.7 : 1; }
    const before = tierOf(bd.emp);
    bd.emp = Math.max(0, Math.min(100, Math.round((bd.emp + delta) * 10) / 10));
    [bd.pos, bd.neg, bd.ignored].forEach(m => { const ks = Object.keys(m); if (ks.length > 14) ks.slice(0, ks.length - 14).forEach(x => { if (m === bd.pos) bd.empOld = (bd.empOld || 0) + 1.5 * m[x]; delete m[x]; }); });
    if (lesson && !bd.lessons[lesson]) bd.lessons[lesson] = Date.now();
    if (!bd.lessons.ratio && (bd.pos[k] || 0) >= 5 && (bd.pos[k] || 0) >= 5 * (bd.neg[k] || 0)) bd.lessons.ratio = Date.now();
    touchProfile();
    const after = tierOf(bd.emp);
    if (state.screen === 'home') renderHome(totals());
    // Avisa al subir de etapa; al bajar, solo si de verdad se alejó (evita avisos por un punto en el borde).
    if (after > before || (after < before && bd.emp <= TIERS[before].min - 3)) setTimeout(() => think(after > before
      ? pick([`Siento que te conozco más. Me siento ${TIERS[after].name.toLowerCase()} contigo.`, 'Gracias por cómo me tratas. Me haces sentir seguro.'])
      : 'Hoy me siento un poquito más lejos de ti… pero las cosas se pueden arreglar.', after > before ? 'love' : 'sad'), 2600);
  }

  // Preguntas para ti, según la hora. Cada respuesta: [texto, reacción, tono (warm|ok|cold), destino, lección].
  const ASK = {
    waking: [
      { id: 'dormiste', q: '¿Dormiste bien?', r: [['Sí', '¡Bien! Un cerebro descansado aprende mejor.', 'warm'], ['Más o menos', 'Hoy vamos suave entonces. Un paso chico basta.', 'ok'], ['Qué te importa', 'Uy, eso me dolió un poquito. Igual me importa cómo estás.', 'cold']] },
      { id: 'agua', q: '¿Ya tomaste agua?', r: [['Sí', '¡Bien! Yo también… creo.', 'warm'], ['Todavía no', 'Un vasito y despertamos juntos.', 'ok'], ['No molestes', 'Ok. Te lo decía porque te cuido, no para molestar.', 'cold']] },
      { id: 'meta', q: '¿Qué quieres aprender hoy?', r: [['Algo nuevo', '¡Me encanta! Vamos a las misiones.', 'warm', 'misiones'], ['Repasar', 'Repasar es aprender dos veces.', 'ok']] }
    ],
    peak: [
      { id: 'tarea', q: '¿Hacemos una tarea chiquita?', r: [['Vamos', '¡Sí! Te espero en Misiones.', 'warm', 'misiones'], ['Después', 'Ok, aquí me quedo pensando.', 'ok'], ['Déjame', 'Está bien. Me gusta cuando me lo dices claro.', 'cold']] },
      { id: 'curioso', q: '¿Qué es lo más raro que sabes?', r: [['Algo genial', '¡Cuéntaselo a alguien! Así no se olvida.', 'warm'], ['No sé', 'Entonces hoy buscamos uno.', 'ok']] },
      { id: 'pregunta', q: '¿Tienes alguna duda que nunca preguntaste?', r: [['Sí', 'Pregúntala hoy. Nadie nace sabiendo.', 'warm'], ['No', 'Seguro aparece una. Siempre aparece.', 'ok']] }
    ],
    dip: [
      { id: 'almuerzo', q: '¿Almorzaste?', r: [['Sí', 'Por eso el sueñito. Es normal.', 'warm'], ['No', 'Comer algo ayuda a pensar.', 'ok']] },
      { id: 'pausa', q: '¿Te tomaste un descanso?', r: [['Sí', 'Descansar también es avanzar.', 'warm'], ['No', 'Cinco minutos y volvemos mejor.', 'ok'], ['No es tu problema', 'Tienes razón, es tu decisión. Solo quería que estuvieras bien.', 'cold']] }
    ],
    peak2: [
      { id: 'aprendiste', q: '¿Qué aprendiste hoy?', r: [['Algo bueno', '¡Eso! Se me erizan las orejitas.', 'warm'], ['Nada aún', 'Todavía queda tarde. Una tarea chica.', 'ok', 'misiones']] },
      { id: 'tarde', q: '¿Una más antes de que oscurezca?', r: [['Dale', '¡Vamos!', 'warm', 'misiones'], ['Ya hice harto', 'Te creo. Lo hiciste bien.', 'ok']] }
    ],
    calm: [
      { id: 'mejor', q: '¿Qué fue lo mejor de tu día?', r: [['Algo lindo', 'Guárdalo en la memoria.', 'warm'], ['Nada especial', 'Los días tranquilos también cuentan.', 'ok']] },
      { id: 'manana', q: '¿Qué quieres mejorar mañana?', r: [['Tengo idea', 'Pensarlo ya es la mitad.', 'warm'], ['No sé', 'Lo soñamos y mañana vemos.', 'ok']] }
    ],
    winddown: [
      { id: 'dormir', q: 'Ya es tarde. ¿Dejamos lo de hoy hasta aquí?', r: [['Sí, a descansar', 'Dormir también es aprender. Buenas noches.', 'warm'], ['Un poquito más', 'Ok, pero no te desveles mucho.', 'ok']] }
    ]
  };
  // Preguntas del corazón: aparecen cuando ya hay confianza.
  const HEART_ASK = [
    { min: 40, id: 'sientes', q: '¿Cómo te sientes hoy?', r: [['Bien', '¡Qué bueno! Me contagias.', 'warm', null, 'feelings'], ['Cansado', 'Tiene sentido estar cansado. Hoy podemos ir más suave.', 'warm', null, 'validate'], ['Mal', 'Gracias por contarme. No tienes que estar bien siempre. Aquí estoy.', 'warm', null, 'validate']] },
    { min: 40, id: 'animo', q: '¿Te puedo preguntar algo? ¿Hoy necesitas ánimo o calma?', r: [['Ánimo', '¡Tú puedes! Un paso chiquito y ya vamos ganando.', 'warm', null, 'feelings'], ['Calma', 'Respira conmigo: inhala… exhala… Así, despacito.', 'warm', null, 'feelings']] },
    { min: 60, id: 'preocupa', q: '¿Hay algo que te preocupe?', r: [['Sí', 'A veces decirlo en voz alta lo hace más chiquito. Puedes escribirlo en un papel.', 'warm', null, 'feelings'], ['No', 'Me alegro. Si aparece algo, aquí estoy.', 'warm'], ['No quiero hablar', 'Está bien. Respeto tu espacio. La puerta queda abierta.', 'ok', null, 'space']] },
    { min: 60, id: 'orgullo', q: '¿De qué te sientes orgulloso esta semana?', r: [['De algo', 'Me encanta. Date crédito, te lo ganaste.', 'warm'], ['De nada', 'A veces no lo vemos, pero seguir intentando ya es algo.', 'warm', null, 'validate']] },
    { min: 80, id: 'gracias', q: '¿Sabes? Me gusta aprender contigo. ¿A ti también?', r: [['Sí', 'Jiji. Entonces somos un buen equipo.', 'warm'], ['A veces', 'Está bien. Lo importante es que sea de verdad.', 'ok']] }
  ];
  // Su manera de ser según la confianza.
  const TIER_LINES = [
    ['Hola.', 'Estoy bien, gracias.', 'Todavía te estoy conociendo.', 'Me cuesta un poco abrirme.', 'Prefiero ir de a poquito.'],
    ['Me gusta cuando vienes.', '¿Puedo preguntarte algo? …mejor después.', 'Creo que nos estamos conociendo.', 'Jiji, ¿hola?'],
    ['Qué bueno verte.', 'Hoy me siento con ganas de conversar.', '¿Sabías que me gusta cuando respondes mis preguntas?'],
    ['Me alegra que estés aquí.', 'Contigo aprendo más.', 'Si un día estás mal, también puedes contarme.', 'Hoy te extrañé un poquito.'],
    ['Gracias por tratarme bonito.', 'Eres mi persona favorita para aprender.', 'Me siento seguro contigo.', 'Cuando algo sale mal, igual estamos juntos.', 'Te quiero, ¿sabías?']
  ];
  const ASK_MULT = [0.4, 0.7, 1, 1.2, 1.3];
  // Agotado: apático y seco, pero igual pensando, y sobre lo que le pasa.
  const DRAINED_LINES = ['Mmm.', 'No tengo ganas de mucho hoy.', 'Todo me cuesta el doble.', 'Perdona si ando seco. Dormí fatal.',
    'Hoy solo quiero existir despacito.', 'No es contigo… es el sueño.', 'Estoy, pero a medias.', 'Meh.', 'Me pesan hasta las orejas.'];
  const DRAINED_WONDER = ['¿Por qué si no duermo, todo me molesta más?', '¿Se puede recuperar el sueño perdido?',
    '¿Por qué el cuerpo no se acostumbra a dormir poco?', '¿Cuántas horas duerme un gato al día?', '¿Será que el cerebro se limpia mientras dormimos?',
    '¿Por qué de noche todo parece más grave?', '¿Un café arregla una mala noche? Creo que no.'];
  const DRAINED_ASK = [
    { id: 'malanoche', q: '¿Tú también has dormido mal alguna vez?', r: [['Sí', 'Entonces me entiendes. Hoy vamos lento.', 'warm', null, 'validate'], ['No', 'Qué suerte. Cuídalo mucho.', 'ok']] },
    { id: 'tranquilo', q: '¿Me dejas tranquilo un rato? No es contigo.', r: [['Claro', 'Gracias. De verdad.', 'warm', null, 'space'], ['¿Por qué?', 'Porque dormí fatal y necesito bajar las revoluciones.', 'ok']] },
    { id: 'curar', q: '¿Me harías un tecito en el Taller? Eso me ayudaría.', r: [['Voy', 'Gracias… eres buena persona.', 'warm', 'taller'], ['Después', 'Ok…', 'ok']] }
  ];

  // Habla dormido: incoherencias de sueño.
  const SLEEPTALK = [
    '…no, mamá, las nubes no se doblan…', '…pásame el queso de la luna…', '…¿quién dejó el martes encendido?…',
    '…tres patos y un teorema…', '…sí, sí, ya compilé el arcoíris…', '…las tareas tienen patitas…',
    '…¿y si el café soñara conmigo?…', '…cinco minutitos más…', '…mi oreja izquierda sabe algo…',
    '…no me cambien la gravedad…', '…el wifi de los peces…', '…¿quién movió la luna? ah, fui yo…',
    '…ñam… tarta de ecuaciones…', '…sí profe, el gato hizo la tarea…', '…shhh, los números están durmiendo…',
    '…¿ya es jueves en Saturno?…', '…me falta un calcetín del universo…', '…bolita… redonda… infinita…',
    '…no, no, el lunes no, por favor…', '…aprendí a volar pero solo los domingos…', '…dile a la lámpara que la quiero…',
    '…mmm… prompts de chocolate…', '…el examen era de cantar…', '…¿por qué la tostada sabe mi nombre?…',
    '…los pingüinos me deben plata…', '…ya voy, ya voy… *no va*…', '…el agua está muy mojada hoy…',
    '…siete por ocho… ¿frambuesa?…', '…esa nube me copió el peinado…'
  ];
  // Lo que dice si lo despiertas: medio borracho de sueño.
  const WOKEN = [
    '¿Eh? ¿Quién? ¿Ya es la prueba?', '…¿dónde dejé mis orejas?…', 'No estaba durmiendo… pensaba con los ojos cerrados.',
    '¿Qué hora es? ¿Por qué hay luz en mi cara?', 'Mmm… ¿las tareas ya se fueron a dormir?', '…cinco minutos más… o cinco años…',
    '¡Oye! Estaba soñando con un teorema de pan.', '¿Ah? Sí, sí… el gato es el presidente… zzz', '…¿mañana es hoy o ayer?…',
    '*bosteza* …¿ya ganamos?', 'Estaba en la mejor parte del sueño…', 'Shh… dormir también es aprender.'
  ];
  // Segunda o tercera vez: todavía tierno, pero ya pide dormir.
  const WOKEN_AGAIN = [
    '…¿otra vez tú? jiji… zzz… tengo sueñito…', 'Mmm… te quiero, pero quiero mi almohada…', '…¿es una emergencia de abrazos?… zzz',
    'Mi cuerpito necesita sus horas… zzz', '…shhh… estoy soñando contigo y con un queque…'
  ];
  // Mucho despertar: pone un límite claro y cariñoso (observación, sentimiento, necesidad y petición).
  const WOKEN_LIMIT = [
    'Me gusta estar contigo, pero cuando me despiertas tantas veces me siento muy cansado, porque mi cuerpo necesita dormir. ¿Hablamos mañana en la mañana?',
    'Te quiero harto. Ahora necesito dormir para estar bien mañana. Te pido que me dejes descansar hasta que salga el sol, ¿sí?',
    'Oye, me despertaste varias veces y me cuesta volver a dormirme. No estoy enojado contigo; solo necesito descansar. Nos vemos mañana.'
  ];
  // Cómo amanece según la noche.
  const MORNING_FX = {
    descansado: ['¡Dormí como piedra! Me siento nuevo.', 'Qué rico dormir de corrido.'],
    ojeras: ['Anoche dormí mal… ando con ojeras.', 'Me despertaron… hoy no doy para tanto.'],
    nublado: ['Tengo la cabeza nublada. Me cuesta pensar.', 'Hoy las ideas vienen lento, como con neblina.'],
    malhumor: ['Ando de malas. No es contigo.', 'Hmph. Dormí poquito.'],
    agotado: ['Me despertaste seis veces. Hoy no estoy bien.', 'Dormí fatal. No me pidas mucho hoy, por favor.'],
    lento: ['Hoy voy en cámara lenta…', 'Mis orejitas no despiertan todavía.']
  };
  // ---------- de buen humor ----------
  // Cuando durmió bien (Descansado) o anda sin malestares y con vida alta, piensa distinto:
  // datos curiosos con una vuelta de tuerca, preguntas más ingeniosas y propuestas concretas según tu avance.
  // Descansado: 60 % de sus pensamientos salen de aquí. Bien a secas: 30 %. Con malestares, nada.
  function glow() {
    if (isDrained() || badFx() > 0 || hasFx('malhumor')) return 0;
    if (hasFx('descansado')) return 2;
    return circadian().v.hp >= 75 ? 1 : 0;
  }
  // Datos reales, cada uno con una pregunta que deja pensando.
  const BRIGHT_FACTS = [
    'Los pulpos tienen tres corazones y dos tercios de sus neuronas están en los brazos. ¿Un brazo de pulpo piensa solo?',
    'Hay más formas de ordenar una baraja de 52 cartas que átomos en la Tierra. Cada vez que barajas, probablemente creas un orden que nunca existió.',
    'Cleopatra vivió más cerca de la llegada a la Luna que de la construcción de la Gran Pirámide. El tiempo es más largo de lo que parece.',
    'Los tiburones existían antes que los árboles. ¿Qué otras cosas "de siempre" son en realidad nuevas?',
    'En Venus un día dura más que un año. Ahí cumplirías años antes de que se haga de noche.',
    'La luz del sol que te toca ahora salió hace unos ocho minutos. Siempre vemos el sol un poquito en el pasado.',
    'El cerebro es cerca del 2 % del peso del cuerpo y usa como el 20 % de la energía. Pensar es caro, por eso cansa.',
    'Los flamencos son rosados por lo que comen. Si comieran otra cosa, serían blancos. ¿Qué color tendrías tú por lo que consumes?',
    'Las abejas bailan para decirle a las otras dónde están las flores. Un idioma hecho de movimiento.',
    'El ADN de una sola célula tuya, estirado, mide unos dos metros. Y lo tienes doblado en algo invisible.',
    'Botánicamente, el plátano es una baya y la frutilla no. Las palabras y la ciencia no siempre se ponen de acuerdo.',
    'El corazón de un colibrí puede latir más de mil veces por minuto. El mío late a ritmo de bolita.',
    'Mientras duermes, el cerebro repasa lo que aprendiste y lo guarda mejor. Hoy me desperté con todo ordenado.',
    'Repasar algo en días separados se recuerda mucho mejor que repasarlo diez veces seguidas. Se llama efecto de espaciado.',
    'Explicarle algo a otra persona es de las mejores formas de aprenderlo. Por eso te pregunto tanto, jiji.',
    'Los wombats hacen caca en forma de cubito. La naturaleza tiene sentido del humor.',
    'Las nutrias marinas se toman de las manos para no separarse mientras duermen. Qué buena idea.',
    'Un rayo está varias veces más caliente que la superficie del sol, pero dura menos que un parpadeo.'
  ];
  // Pensamientos con energía, según la hora.
  const BRIGHT_LINES = {
    waking: ['Abrí los ojos y ya tenía ideas. ¿Esto es estar descansado?', 'Hoy me desperté con las orejitas listas para aprender.', 'Buenos días. Hoy siento que puedo con algo difícil.'],
    peak: ['Mi cerebro está como recién lavado. Aprovechémoslo.', 'Es la mejor hora para lo difícil, y yo ando a mil.', 'Hoy entiendo las cosas a la primera. Bueno, a la segunda.'],
    dip: ['Después de almuerzo baja la energía… pero hoy dormí bien, así que aguanto.', 'Truco: algo fácil y corto ahora, lo difícil más tarde.', 'Un vaso de agua y una tarea chica. Fórmula de siesta evitada.'],
    peak2: ['¡Segundo aire! La tarde también es buena para pensar.', 'Hoy alcanzamos a hacer una cosa más, lo presiento.', 'Me volvieron las ganas, y con intereses.'],
    calm: ['Qué buen día fue. ¿Notaste lo que aprendimos?', 'El atardecer es buen momento para repasar en la cabeza.', 'Hoy me sentí con pila todo el día. Gracias por dejarme dormir.'],
    winddown: ['Hoy fue un buen día. Ahora a guardarlo durmiendo.', 'Si repasas una cosa antes de dormir, mañana la recuerdas mejor.', 'Mañana quiero amanecer igual de bien. ¿Me ayudas a dormir temprano?']
  };
  // Preguntas más ingeniosas, con consecuencias. [texto, reacción, tono, destino, lección]
  const BRIGHT_ASK = {
    any: [
      { id: 'b-animal', q: 'Pregunta rara: si tu proyecto fuera un animal, ¿cuál sería?', r: [['Un gato', 'Independiente y medio misterioso. Le tengo respeto.', 'warm'], ['Una tortuga', 'Lento pero llega. Como las mejores cosas.', 'warm'], ['Un pulpo', '¡Ocho cosas a la vez! Ojo con la memoria de trabajo: una a la vez.', 'warm']] },
      { id: 'b-empezar', q: '¿Qué te cuesta más: empezar o terminar?', r: [['Empezar', 'Truco: comprométete solo a 5 minutos. Arrancar es lo difícil; seguir sale solo.', 'warm', null, 'feelings'], ['Terminar', 'Entonces miremos qué falta para cerrar una fase. Lo que está cerca se termina.', 'warm', 'mision'], ['Las dos', 'Honesto. Hoy hagamos solo una cosa chica de principio a fin.', 'ok']] },
      { id: 'b-frase', q: 'Desafío: ¿puedes explicar en una frase qué estás construyendo?', r: [['Sí', 'Si cabe en una frase, lo entiendes de verdad. Eso es metacognición.', 'warm'], ['Me cuesta', '¡Buen dato! Lo que cuesta explicar es lo que aún no está claro. Ahí hay que mirar.', 'warm', null, 'feelings']] },
      { id: 'b-sinfallar', q: '¿Qué harías si supieras que no puedes fallar?', r: [['Algo grande', 'Entonces el miedo era lo único en el camino. Un pedacito de eso, hoy.', 'warm'], ['Lo mismo', 'Eso significa que haces lo que te gusta. Qué lindo.', 'warm'], ['No sé', 'Pregunta para pensar en la ducha. Me la cuentas mañana.', 'ok']] },
      { id: 'b-futuro', q: '¿Qué de lo que hagas hoy te va a agradecer el tú de mañana?', r: [['Una tarea', '¡Vamos por ella! El tú de mañana ya está aplaudiendo.', 'warm', 'misiones'], ['Descansar', 'También cuenta. Dormir bien es un regalo al tú de mañana.', 'warm'], ['Nada', 'Todavía hay tiempo de darle una sorpresa.', 'ok']] },
      { id: 'b-superpoder', q: 'Si pudieras aprender una cosa en un día, sin esfuerzo, ¿qué sería?', r: [['Un idioma', 'Buena. Y la buena noticia: con 10 minutos diarios, en un año también se puede.', 'warm'], ['Un instrumento', 'La música es práctica espaciada pura. Igual que tus tareas.', 'warm'], ['Programar', 'Ya lo estás haciendo, solo que sin el "sin esfuerzo", jiji.', 'warm', 'misiones']] },
      { id: 'b-error', q: '¿Cuál fue tu último error que te enseñó algo?', r: [['Tengo uno', 'Los errores que enseñan son los mejores. Cuéntalo en la Plaza, a alguien le sirve.', 'warm', null, 'learn'], ['No me acuerdo', 'Quizás porque ya lo superaste. Eso también es aprender.', 'ok']] },
      { id: 'b-ensenar', q: 'Si tuvieras que enseñarme una cosa que sabes, ¿qué sería?', r: [['Algo de mi trabajo', '¡Me encantaría! Enseñar es aprender dos veces.', 'warm', null, 'teach'], ['Algo de la vida', 'Esas son las mejores clases. Te escucho cuando quieras.', 'warm', null, 'teach']] }
    ],
    waking: [
      { id: 'b-plan', q: 'Dormí increíble. ¿Planificamos el día en tres cosas chicas?', r: [['Dale', '¡Eso! Tres cosas chicas valen más que una gigante sin empezar.', 'warm', 'misiones'], ['Improviso', 'También vale. Hoy confío en tu instinto.', 'ok']] },
      { id: 'b-sueno', q: '¿Te acuerdas de lo que soñaste?', r: [['Sí', 'Los sueños mezclan lo que vivimos. ¿Era algo del proyecto? Jiji.', 'warm'], ['No', 'Casi nadie se acuerda. Igual el cerebro trabajó toda la noche.', 'ok']] }
    ],
    peak: [
      { id: 'b-sapo', q: 'Tengo la mente afilada. ¿Atacamos la tarea más difícil primero?', r: [['Sí, la difícil', 'Valiente. Lo difícil con la cabeza fresca sale mejor.', 'warm', 'mision'], ['Mejor una fácil', 'Calentar motores también vale. Después la difícil.', 'ok', 'mision']] },
      { id: 'b-modo', q: '¿Hoy quieres modo valiente o modo constante?', r: [['Valiente', 'Algo nuevo, algo que asuste un poquito. ¡Vamos!', 'warm', 'misiones'], ['Constante', 'Paso a paso. La constancia le gana al talento casi siempre.', 'warm', 'misiones']] }
    ],
    dip: [
      { id: 'b-siesta', q: 'Truco anti-sueñito: diez minutos de algo fácil. ¿Probamos?', r: [['Probemos', 'Lo fácil ahora, lo difícil después del bajón.', 'warm', 'mision'], ['Prefiero pausa', 'Una pausa corta también funciona. Te espero.', 'ok']] }
    ],
    peak2: [
      { id: 'b-repaso', q: '¿Me cuentas en voz alta una cosa que aprendiste hoy? Decirlo ayuda a recordarlo.', r: [['Ya, te cuento', 'Listo: ahora tu cerebro lo tiene dos veces.', 'warm', null, 'teach'], ['Hoy no aprendí', 'Todavía queda tarde. Una tarea y ya tienes qué contar.', 'ok', 'misiones']] }
    ],
    calm: [
      { id: 'b-titulo', q: 'Si hoy fuera un capítulo de un libro, ¿qué título le pondrías?', r: [['Épico', '"El día que todo avanzó". Me gusta.', 'warm'], ['Tranquilo', '"Un día en paz". Esos también hacen falta.', 'warm'], ['Raro', '"Lo inesperado". Los capítulos raros son los que más se recuerdan.', 'warm']] }
    ],
    winddown: [
      { id: 'b-noche', q: 'Si repasas una cosa justo antes de dormir, se guarda mejor. ¿Repasamos una de hoy?', r: [['Sí', 'Piénsala una vez más… listo. Ahora el sueño hace el resto.', 'warm'], ['Mañana', 'Ok. Igual, dormir bien ya es estudiar.', 'ok']] }
    ]
  };
  // Propuestas concretas según cómo va tu avance. Cada una devuelve [texto, respuestas?] o null.
  const PROACTIVE = [
    () => { const n = nextIn(active()); return n && n.t ? [`Hoy tengo la cabeza clarita. ¿Y si hacemos "${n.t.text.slice(0, 70)}${n.t.text.length > 70 ? '…' : ''}"? Creo que sale.`, [['Vamos', '¡Eso! Te espero allá.', 'warm', 'mision'], ['Después', 'Ok, la dejo anotada en mi cabecita.', 'ok']]] : null; },
    () => { const r = questState().filter(x => x.ready).length; return r ? [`Tienes ${r === 1 ? 'una misión diaria lista' : r + ' misiones diarias listas'}. ¡No dejes XP en la mesa!`, [['A reclamar', '¡Ñam, XP!', 'warm', 'misiones'], ['Luego', 'Ok, no se van a ir a ninguna parte.', 'ok']]] : null; },
    () => { const a = attrs()._avail; return a ? [`Tengo ${a === 1 ? 'un punto' : a + ' puntos'} sin usar para mis stats de juego. ¿Me ayudas a elegir? ¿Fuerza, ingenio, fe…?`, [['Vamos a ver', '¡Qué emoción!', 'warm', 'stats'], ['Después', 'Me los guardo para un buen momento.', 'ok']]] : null; },
    () => {
      const a = attrs(), x = ATTRS.map(t => [t, a[t.id].into / a[t.id].need]).filter(([, f]) => f >= 0.7).sort((p, q) => q[1] - p[1])[0];
      return x ? [`Me falta poquito para subir ${x[0].name.toLowerCase()}. ${x[0].how.replace(/\.$/, '')} y lo logro.`] : null;
    },
    () => { const s = streakOf(totals().days); return s >= 2 ? [pick([`Llevamos ${s} días seguidos. Mañana serían ${s + 1}… solo digo.`, `${s} días seguidos. La constancia se nota en las orejitas.`])] : null; },
    () => { const n = Object.values(workshop().mats || {}).reduce((x, y) => x + y, 0); return n >= 4 ? [`Tenemos ${n} materiales guardados en el Taller. ¿Qué haría alguien de verdad con ellos? Yo tengo una sospecha.`, [['Probemos', '¡Al Taller! Piensa en la vida real.', 'warm', 'taller'], ['Otro día', 'Ok, los cuido mientras.', 'ok']]] : null; },
    () => { const n = nextIn(active()); const pp = n && n.p.progress.phases[n.ph.n]; return pp && pp.startAt && !pp.hours && n.ph.hours ? [`¿Cuántas horas llevas en «${n.ph.title}»? Si las anotas, aprendemos a estimar mejor. La guía decía ${n.ph.hours} h.`] : null; },
    () => tierOf(bond().emp) >= 2 ? [pick(['¿Y si hoy le preguntas algo a alguien en la Plaza? Preguntar no es debilidad: es el atajo.', 'Alguien en la Plaza puede saber justo lo que te falta. O tú lo que le falta a otro.']), [['Vamos', '¡A conversar!', 'warm', 'plaza'], ['Hoy no', 'Está bien. La Plaza no se va.', 'ok']]] : null
  ];
  // Con mal dormir (sin llegar a agotado): frases según el malestar, cansadas pero con cariño.
  const LOW_LINES = {
    ojeras: ['Me pesan los párpados… pero aquí sigo.', 'Mis ojeras tienen ojeras.', 'Hoy veo todo un poquito borroso.', 'Si cierro los ojos un segundo, ¿cuenta como siesta?'],
    nublado: ['Leí la misma frase tres veces y no la entendí.', 'Hoy las ideas llegan con neblina.', 'Tengo la cabeza como algodón mojado.', '¿Qué estaba pensando? Se me fue.'],
    malhumor: ['Hoy me molesta hasta el zumbido de la lámpara.', 'Ando sensible. No es contigo, es el sueño.', 'Respiro hondo y sigo. Despacito.', 'Hmph. Bueno, igual estoy contento de verte.'],
    lento: ['Hoy pienso en cámara lenta…', 'Voy a mi ritmo hoy: ritmo caracol.', 'Mis orejitas todavía no despiertan.', 'Un paso a la vez. Hoy, medio paso.']
  };
  function lowThought() {
    const fx = todayEffects().filter(id => LOW_LINES[id]);
    if (!fx.length) return false;
    const id = pick(fx);
    if (pets.home) pets.home.express(pick(id === 'malhumor' ? ['grumpy', 'sad'] : ['drowsy', 'yawn', 'squint']), 3000);
    showThought(draw('low' + id, LOW_LINES[id]));
    return true;
  }
  const proSeen = {};
  // Devuelve true si mostró algo.
  function brightThought(c, tier, today) {
    const face = n => pets.home && pets.home.express(n, 3000);
    const roll = Math.random(), g = glow();
    // Propuestas (más con confianza)
    if (roll < 0.28 + 0.03 * tier) {
      // Cada propuesta descansa 90 min antes de repetirse.
      const now = Date.now(), opts = PROACTIVE.map((f, i) => (now - (proSeen[i] || 0) > 90 * 60000 ? [i, f()] : null)).filter(x => x && x[1]);
      if (opts.length) {
        const [i, [t, r]] = pick(opts);
        proSeen[i] = now;
        if (r) { pending = 'proactive'; holdUntil = Date.now() + 22000; pets.home.pop('!'); } else holdUntil = Date.now() + Math.max(7000, t.length * 80);
        face(pick(['sparkle', 'happy', 'wink'])); showThought(t, r); return true;
      }
    }
    // Preguntas ingeniosas
    if (roll < 0.55) {
      const pool = (BRIGHT_ASK[c.phase] || []).concat(BRIGHT_ASK.any).filter(x => !asked[today + x.id]);
      if (pool.length && Math.random() < ASK_MULT[tier]) {
        const x = pick(pool); asked[today + x.id] = 1;
        pets.home.pop('?'); face(pick(['thinking', 'sparkle']));
        showThought(x.q, x.r); pending = x.id; holdUntil = Date.now() + 25000; return true;
      }
    }
    // Datos curiosos
    if (roll < 0.8) { const t = draw('bfact', BRIGHT_FACTS); face(pick(['sparkle', 'surprised', 'thinking'])); showThought(t); holdUntil = Date.now() + Math.max(8000, t.length * 85); return true; }
    const ls = BRIGHT_LINES[c.phase]; if (!ls) return false;
    face(pick(g === 2 ? ['happy', 'sparkle', 'wink', 'love'] : ['happy', 'wink'])); showThought(draw('bl' + c.phase, ls)); return true;
  }
  const asked = {};
  let thinkTimer = 0, holdUntil = 0, pending = null;
  function showThought(text, replies) {
    const b = $('#h-bubble');
    if (!b) return;
    b.classList.add('fade');
    setTimeout(() => {
      b.innerHTML = `<span class="tq">${esc(text)}</span>` + (replies ? `<span class="replies">${replies.map((r, i) => `<button data-reply="${i}" class="${r[2] || ''}">${esc(r[0])}</button>`).join('')}</span>` : '');
      b.classList.toggle('asking', !!replies);
      b.classList.remove('fade');
      b._replies = replies || null;
    }, 260);
  }
  // Una pregunta que se queda sin respuesta es una invitación ignorada (resta poquito, máx. 3 al día).
  function expirePending() {
    if (!pending) return;
    const wasProposal = pending === 'proactive';
    pending = null;
    if (wasProposal) return; // una propuesta ignorada no es una invitación ignorada
    const bd = bond(), k = dayKey(Date.now());
    if ((bd.ignored[k] || 0) < 3) { bd.ignored[k] = (bd.ignored[k] || 0) + 1; bondChange(-1); }
  }

  // Pensamientos con expresión. "expr" acompaña la frase (pensativo, guiño, enojón…).
  function think(text, expr) {
    clearTimeout(thinkTimer);
    const c = circadian();
    const next = () => { thinkTimer = setTimeout(() => think(), c.sleeping ? 16000 : Math.round(20000 - 11000 * c.alert)); };
    const face = (n, ms) => { if (pets.home && n) pets.home.express(n, ms || 3200); };
    if (text) { pending = null; showThought(text); face(expr); holdUntil = Date.now() + Math.max(7000, text.length * 90); next(); return; }
    if (Date.now() < holdUntil) { next(); return; }
    expirePending();
    if (Date.now() < pause.until) { showThought(pick(['Estoy en mi pausa. Vuelvo prontito.', '*respira hondo*', 'Un ratito y ya estoy.'])); next(); return; }
    if (c.sleeping) {
      // a veces habla dormido
      if (Math.random() < 0.4) showThought(pick(SLEEPTALK)); else showThought(pick(BY_PHASE.sleep));
      next(); return;
    }
    const bd = bond(), tier = tierOf(bd.emp);
    if (isDrained() && !(sleepData().roll && !sleepData().roll.told)) {
      const today0 = dayKey(Date.now()), r0 = Math.random();
      const dq = DRAINED_ASK.filter(x => !asked[today0 + x.id]);
      if (dq.length && r0 < 0.18) { const x = pick(dq); asked[today0 + x.id] = 1; face('apathetic', 2000); showThought(x.q, x.r); pending = x.id; holdUntil = Date.now() + 25000; next(); return; }
      if (r0 < 0.45) { pets.home.pop('?'); face('apathetic', 3000); showThought(pick(DRAINED_WONDER)); next(); return; }
      face(Math.random() < 0.15 ? 'grumpy' : 'apathetic', 2500); showThought(pick(DRAINED_LINES)); next(); return;
    }
    // Primer pensamiento del día: cómo durmió.
    const sd = sleepData(), fx = todayEffects();
    if (sd.roll && !sd.roll.told && fx.length) {
      sd.roll.told = true; touchProfile();
      const main = fx.includes('agotado') ? 'agotado' : fx[0];
      if (main === 'descansado' && bd.nightBonus !== sd.roll.day) { bd.nightBonus = sd.roll.day; bondChange(2, 'sleep'); }
      showThought(pick(MORNING_FX[main]));
      const nb = badFx();
      face(main === 'descansado' ? 'happy' : isDrained() ? 'grumpy' : nb >= 2 ? 'sad' : 'yawn', 4000);
      holdUntil = Date.now() + 9000; next(); return;
    }
    // De buen humor piensa distinto: datos curiosos, preguntas ingeniosas y propuestas concretas.
    const gl = glow();
    if (gl && Math.random() < (gl === 2 ? 0.6 : 0.3) && brightThought(c, tier, dayKey(Date.now()))) { next(); return; }
    if (!gl && badFx() > 0 && Math.random() < 0.35 && lowThought()) { next(); return; }
    // Preguntar: más probable cuando está despierto, con el maná alto y con más confianza.
    const askP = (0.15 + 0.35 * c.alert + (c.curious ? 0.15 : 0)) * ASK_MULT[tier];
    const today = dayKey(Date.now());
    const mine = (ASK[c.phase] || []).concat(HEART_ASK.filter(x => bd.emp >= x.min)).filter(x => !asked[today + x.id]);
    const r = Math.random();
    if (mine.length && r < askP * 0.5) {
      const x = pick(mine); asked[today + x.id] = 1;
      pets.home.pop('?'); face('thinking', 2500);
      showThought(x.q, x.r); pending = x.id; holdUntil = Date.now() + 25000; next(); return;
    }
    if (r < askP) { pets.home.pop('?'); face(Math.random() < 0.7 ? 'thinking' : 'sparkle', 3500); showThought(pick(WONDER)); next(); return; }
    if (hasFx('malhumor') && !isDrained() && badFx() >= 2 && Math.random() < 0.3) { face('sad', 3000); showThought(pick(['Hoy ando sensible por el sueño. Ten paciencia conmigo, ¿sí?', 'Dormí poquito y se me nota. No es contigo.', 'Hmph… bueno, igual te quiero.'])); next(); return; }
    if (c.worn && Math.random() < 0.5) { face('drowsy', 3000); showThought(pick(['Hoy trabajaste harto. Descansar también suma.', 'Uf, qué día. Me sudan las orejitas.'])); next(); return; }
    if (c.v.hp <= 25) { face('sad', 3500); showThought(pick(['Tengo sueño… pero quiero aprender.', 'Un ratito nomás y despierto.', 'Te extrañé. ¿Seguimos?'])); next(); return; }
    const roll = Math.random();
    if (roll < 0.3) { showThought(pick(TIER_LINES[tier])); face(tier >= 3 ? pick(['love', 'shy', 'happy']) : tier === 0 ? null : 'shy', 2400); next(); return; }
    const phaseLine = roll < 0.6;
    showThought(phaseLine ? pick(BY_PHASE[c.phase]) : pick(MUSE));
    if (!phaseLine) face(pick(tier >= 2 ? ['wink', 'happy', 'shy', null] : [null, null, 'shy']), 2200);
    else if (c.phase === 'waking' || c.phase === 'winddown') face('yawn', 1600);
    next();
  }
  function answer(i) {
    const b = $('#h-bubble');
    const rep = b && b._replies && b._replies[i];
    if (!rep) return;
    const [, reaction, tone, dest, lesson, fx] = rep;
    const isRepair = pending === 'repair', isLimit = pending === 'limit';
    pending = null;
    if (tone === 'warm') {
      const bdh = bond(), kh = dayKey(Date.now());
      bdh.herbs = bdh.herbs || {};
      if ((bdh.herbs[kh] || 0) < 5) { bdh.herbs = { [kh]: (bdh.herbs[kh] || 0) + 1 }; giveFrom('cariño'); }
    }
    if (tone === 'warm') { pets.home.feed(0.5); bondChange(isRepair ? 4 : isLimit ? 1.5 : 3, isRepair ? 'repair' : lesson || 'bid'); }
    else if (tone === 'ok') bondChange(1, lesson || 'bid');
    else bondChange(-2, 'cold');
    if (fx) fx();
    if (dest) { showThought(reaction); pets.home.express('surprised', 1200); holdUntil = Date.now() + 2000; setTimeout(() => go(dest), 1100); return; }
    if (tone !== 'cold') pets.home.pop('!');
    holdUntil = 0; think(reaction, tone === 'warm' ? 'love' : tone === 'ok' ? 'shy' : 'sad');
  }

  // ---------- paciencia ----------
  // A nadie le gusta que lo toquen sin parar. Cada toque suma "molestia", que se va pasando sola con unos segundos de calma.
  // Etapas: ternura → juego → juntar paciencia → refunfuñar y pullas → "¿estás aburrido?" → límite con cariño → pausa.
  // No es un bucle: cada pausa del día lo deja con menos paciencia, pullas más pesadas y pausas más largas.
  // Con 30 min sin pausas se le va pasando. La paciencia depende de la empatía, de cómo durmió y de la hora.
  const pause = { until: 0, broken: 0 };
  const irk = { v: 0, at: 0, last: 0, stage: -1, asked: false, said: new Set() };
  function pester() {
    const bd = bond(), k = dayKey(Date.now());
    let p = bd.pester;
    if (!p || p.d !== k) p = bd.pester = { d: k, n: 0, last: 0 };
    // Se le pasa de a poco: una "ronda" menos cada 30 min sin pausas.
    const calm = Math.floor((Date.now() - p.last) / 1800000);
    if (p.n && p.last && calm > 0) { p.n = Math.max(0, p.n - calm); p.last += calm * 1800000; }
    return p;
  }
  function patience() {
    const c = circadian(), bd = bond();
    let k = 1;
    if (isDrained()) k *= 0.55;
    else {
      if (hasFx('malhumor')) k *= 0.8;
      ['ojeras', 'nublado', 'lento'].forEach(f => { if (hasFx(f)) k *= 0.92; });
      if (hasFx('descansado')) k *= 1.15;
    }
    if (c.worn || c.v.hp <= 25) k *= 0.85;
    k *= { waking: 0.8, peak: 1, dip: 0.85, peak2: 1, calm: 0.95, winddown: 0.75 }[c.phase] || 1;
    k *= 1 + 0.04 * statB('tolerancia');
    k /= 1 + 0.3 * pester().n;
    return (12 + bd.emp / 7) * k; // de 12 a 26 toques seguidos en un día tranquilo
  }
  function annoyance(add) {
    const now = Date.now();
    irk.v = Math.max(0, irk.v - (now - irk.at) / 3000); // un punto menos cada 3 s de calma
    irk.at = now;
    if (irk.v < 0.5) irk.asked = irk.limited = false;
    if (add) irk.v += add;
    return irk.v / patience();
  }
  // Sin repetir hasta agotar el mazo (y nunca la misma dos veces seguidas).
  const decks = {};
  function draw(name, arr) {
    let d = decks[name];
    if (!d || !d.left.length || d.src !== arr.length) {
      const left = arr.slice().sort(() => Math.random() - 0.5);
      if (d && left.length > 1 && left[left.length - 1] === d.prev) left.unshift(left.pop());
      d = decks[name] = { left, src: arr.length, prev: d && d.prev };
    }
    return (d.prev = d.left.pop());
  }
  const tg = () => { const t = tierOf(bond().emp); return t === 0 ? 0 : t <= 2 ? 1 : 2; }; // reservado, tímido/amigable, cercano/confidente
  const hourTxt = () => { const h = new Date().getHours(); return h === 1 ? 'la una' : `las ${h}`; };

  const CUTE = [
    ['Ah… hola.', '¿Sí?', '*se sorprende*', '¿Necesitas algo?', 'Mm, hola.', '*parpadea*'],
    ['¡Jiji, cosquillas!', '¡Blub!', '¿Me llamaste?', '¡Boing!', '*rueda feliz*', '¡Hola, hola!', 'Jeje, ¿qué pasó?', '*hace burbujitas*', '¿Jugamos?'],
    ['¡Mi persona favorita!', '¿Me extrañabas? Yo sí.', '*se acurruca en tu dedo*', '¡Jiji, cosquillas!', '¡Hola, hola, hola!', '¡Boing! Te quiero.', '*hace burbujitas de cariño*', '¿Me vienes a ver a mí? Qué lindo.']
  ];
  const CUTE_PHASE = {
    waking: ['¡Buenos días! *estira las orejas*', 'Mmm… hola… todavía estoy despertando.', '*bostezo* hola, hola.'],
    peak: ['¡Hola! Ando con toda la energía.', '¡Boing boing! Hoy estoy despierto.'],
    dip: ['Hola… *ojitos de siesta*', 'Mmm, después de almuerzo ando lento.'],
    peak2: ['¡Hola! Me volvieron las ganas.', '¡Toc toc! Aquí estoy.'],
    calm: ['Hola, qué tarde más tranquila.', '*mira por la ventana* ¿Viste el atardecer?'],
    winddown: ['Hola… *bostezo* ya casi me duermo.', 'Shh, ya es tarde… hola igual.']
  };
  const CUTE_MOOD = {
    agotado: ['Mmm.', '¿Qué?', 'Hoy no tengo pila.', 'Estoy aquí… más o menos.', 'Ajá.', '…hola.'],
    malhumor: ['Hmph, hola.', 'Hola. Hoy ando sensible.', 'Ya, ya, hola.'],
    ojeras: ['Hola… mira mis ojeras.', 'Hola. Dormí poquito.'],
    descansado: ['¡Hola! Dormí increíble.', '¡Boing! Hoy ando con pila.']
  };
  const PLAYFUL = [
    ['Ya. Suficiente cosquillas.', 'Me estoy mareando.', '¿Cuántas veces vas?', 'Ok… ya entendí que estás ahí.'],
    ['Jeje, ya, ya… me estoy mareando un poquito.', 'Uy, tantas cosquillas me dan vueltas las orejas.', '¡Me vas a hacer rodar del escritorio! Jiji.', '¿Me estás contando los pelitos? Son cero.', 'Jiji… ¿y si mejor me saludas con la mano?'],
    ['Jiji, me encanta que me busques… pero me estoy mareando.', 'Ay, ya, mis orejitas van a salir volando.', 'Te quiero, pero mi panza no es un botón.', '*rueda* ¡Me vas a dejar tonto de tanto cariño!']
  ];
  // Juntando paciencia: todavía no se enoja, pero se le nota el esfuerzo.
  const HOLD = [
    '*respira hondo*', 'Uno… dos… tres… paciencia, Mochi.', 'Estoy juntando paciencia.', 'Mmm… ok… ok…', 'Contando hasta diez… voy en cuatro.',
    '*mira para otro lado*', 'Me tiemblan las orejitas, y no es de frío.', 'Inhala… exhala… es alguien que quiero… inhala…',
    'Calma, Mochi, calma.', '*infla los cachetes*', 'Estoy siendo muy paciente. Que quede registrado.', 'Mi paciencia está en modo ahorro de batería.'
  ];
  const HOLD_MOOD = {
    agotado: ['No tengo energía ni para enojarme… pero casi.', 'Dormí fatal y tú tocándome. Qué combo.', '*suspiro largo*'],
    malhumor: ['Hoy ando con la mecha corta. Cuidadito.', 'Hmph. Respira, Mochi.'],
    ojeras: ['¿Te parece que con estas ojeras estoy para cosquillas?'],
    descansado: ['Hoy dormí bien, así que te aguanto un poquito más. Un poquito.']
  };
  // Refunfuña: dice lo que siente sin atacar.
  const GRUMBLE = [
    'Ya, ya, ya.', '¿Otra vez?', 'No soy un botón, eh.', 'Oye, que no soy un pop-it.', 'Si me sigues tocando me voy a desinflar.',
    'A nadie le gusta que lo toquen tanto, ¿sabes?', 'Imagina que alguien te toca la cara cada dos segundos.', 'Ya sé que soy suavecito, pero igual.',
    'Me estás gastando la paciencia y la pelusa.', 'Toc, toc, toc… ¿y si mejor me hablas?', '¿Esto es un experimento? Porque el resultado es: me molesta.'
  ];
  // Ya le dijiste que estabas aburrido y te dio una idea… y sigues tocándolo.
  const ADVISED = [
    'Te di una idea hace un ratito, ¿eh?', 'Dijiste que estabas aburrido. La tarea sigue ahí, esperándote.',
    'Yo te propuse algo y tú elegiste seguir tocándome. Interesante.', 'El aburrimiento no se quita tocando bolitas. Te lo prometo.'
  ];
  // Las pullas típicas de internet, de suaves a pesadas. El nivel sube con cada ronda del día.
  const TEASE = [
    ['¿Estás aburrido? Hay misiones esperándote.', '¿Y si tomas agüita?', 'Pestañea, que se te secan los ojos.', '¿Ya estiraste la espalda hoy?', 'Hay un mundo detrás de esta pantalla, ¿sabías?'],
    ['Creo que te haría bien salir a tocar pasto.', 'El sol existe, te lo juro.', '¿Hace cuánto no ves el cielo de verdad?', 'Afuera hay bolitas como yo. Se llaman piedras. Ve a verlas.', 'Tocar pasto es gratis, ¿sabías?', '¿Y si llamas a alguien? A una persona, digo.'],
    ['A veces agarrar la pala es bueno.', '¿No tienes tareas? Porque yo veo varias.', 'Esto no cuenta como ejercicio, eh.', 'Si tocarme fuera trabajo ya serías gerente.', 'Tus tareas te están mirando feo.', 'Ve a hacer algo productivo y vuelve a contarme.'],
    ['Busca trabajo. Con cariño, pero busca trabajo.', 'Agarra la pala, campeón.', 'Ve a tocar pasto. Mínimo diez minutos.', 'Sal de la pieza, que te va a salir musgo.', 'Bañarse también es una opción, eh.', '¿Tú no tenías algo que entregar?', 'Hasta la planta del escritorio sale más que tú.', 'Mi abuela era una piedra y tocaba menos.']
  ];
  const TEASE_PHASE = {
    waking: [() => `Recién son ${hourTxt()} y ya me estás tocando. ¿Desayunaste?`, () => 'Primero el café, después los toques.', () => 'Abre la ventana: la luz de la mañana despierta mejor que yo.'],
    peak: [() => 'Es la mejor hora para aprender y la estás usando en tocarme.', () => 'Con este sol, tocar pasto está fácil.', () => 'Tu cerebro está en su mejor hora. Úsalo en algo, porfa.'],
    dip: [() => 'Hora de siesta y tú tocándome… ¿no te da sueño a ti?', () => 'Después de almuerzo se camina, no se toca bolitas.'],
    peak2: [() => 'Queda tarde todavía: alcanzas a salir un rato.', () => 'Una tarea antes de que oscurezca, ¿y si?'],
    calm: [() => 'Ya se está poniendo el sol. ¿Saliste hoy, aunque sea un ratito?', () => 'El atardecer se ve mejor afuera que en esta pantalla.'],
    winddown: [() => `Son ${hourTxt()}. Deja de tocarme y anda a dormir.`, () => 'La pantalla de noche te espanta el sueño… y a mí la paciencia.', () => 'Mañana tocas pasto. Hoy tocas almohada.']
  };
  const TEASE_MOOD = {
    agotado: ['Dormí fatal por tu culpa y ahora esto. Ve a tocar pasto, yo me quedo apático aquí.', 'No me queda ni energía para pullas. Sal un rato. Por los dos.'],
    malhumor: ['Hoy no estoy para esto. Anda a buscar otra cosa que hacer, ¿sí?'],
    ojeras: ['Uno de los dos necesita dormir y otro necesita salir. Adivina cuál eres tú.']
  };
  // Lo que dice el límite: observación, sentimiento, necesidad y petición (Rosenberg).
  const LIMIT = [
    ['Me tocas muchas veces seguidas y me siento incómodo. Necesito espacio. Para, por favor.', 'Ya no quiero más toques. Necesito calma.'],
    ['Oye, cuando me tocas tantas veces seguidas me mareo y me cuesta pensar. Necesito un poquito de calma. ¿Me das un momento?', 'Me gusta jugar contigo. Ahora me siento abrumado con tantos toques. ¿Podemos bajar el ritmo un ratito?'],
    ['Te quiero harto, y por eso te lo digo claro: tantos toques me abruman. Necesito calma. ¿Me das un ratito?', 'Me encanta que me busques, pero mi cuerpito ya no da. Necesito que pares un momento, ¿sí?']
  ];
  const LIMIT_AGAIN = [
    'Ya te lo pedí antes hoy. Cuando me tocas así después de pedirte calma, siento que no me escuchas. Necesito que pares.',
    'Es otra vez lo mismo de hace rato. Me cansa tener que pedirlo de nuevo. Para, por favor.'
  ];
  const PAUSE_LINES = [
    'Te quiero, y por eso te lo digo claro: necesito una pausa. Voy a descansar un ratito y después seguimos.',
    'Ok. Me tomo una pausa. No es castigo: es que necesito calma para estar bien contigo.',
    'Ya, me voy a mirar la pared un rato. La pared no me toca.',
    'Pausa larga. Mientras, de verdad, sal a tocar pasto. Te va a hacer bien a ti y a mí.'
  ];
  const PAUSE_POKE = [
    ['Estoy en mi pausa. Vuelvo prontito.'],
    ['Shh. Pausa.', 'Todavía no, porfa.'],
    ['Te pedí un momento. Cuando lo respetas, me siento seguro contigo.'],
    ['…', '*se da vuelta*', 'Sigo en pausa. La pared y yo estamos conversando.', 'Cada toque le suma tiempo a mi pausa.', 'No estoy. Deja tu mensaje después del pitido.', '*hace como que es una piedra*']
  ];

  // Mezcla según lo que pesa más ahora: cómo durmió, la hora o la confianza.
  function moodKey() { return isDrained() ? 'agotado' : hasFx('malhumor') ? 'malhumor' : badFx() >= 1 && hasFx('ojeras') ? 'ojeras' : hasFx('descansado') ? 'descansado' : null; }
  let lastLine = '';
  function flavor(base, byMood, byPhase) {
    const m = moodKey(), r = Math.random();
    let out = base;
    const ph = byPhase && byPhase[circadian().phase];
    const moodOk = m && byMood && byMood[m] && !(m === 'descansado' && circadian().phase === 'winddown');
    if (moodOk && r < (m === 'agotado' ? 0.75 : 0.35)) out = draw('m' + m + byMood[m].length, byMood[m]);
    else if (ph && r < 0.6) { const x = draw('p' + circadian().phase + ph.length, ph); out = typeof x === 'function' ? x() : x; }
    // Las frases de ánimo u hora no se repiten en la misma ronda.
    if (out !== base && (out === lastLine || irk.said.has(out))) out = base;
    if (out !== base) irk.said.add(out);
    return (lastLine = out);
  }
  function tease() {
    const lvl = Math.min(3, pester().n + (annoyance() > 0.8 ? 1 : 0));
    const pool = TEASE.slice(Math.max(0, lvl - 1), lvl + 1).flat();
    let t = flavor(draw('tease' + lvl, pool), TEASE_MOOD, TEASE_PHASE);
    const g = tg();
    if (g === 2 && Math.random() < 0.4) t += pick([' Lo digo con cariño.', ' Te quiero, eh.', ' Jiji.']);
    if (g === 0 && Math.random() < 0.4) t = t.replace(/ Con cariño,/, '');
    return t;
  }
  // "¿Estás aburrido?": la respuesta cambia lo que pasa después.
  function askBored() {
    const p = pester(), g = tg(), nt = nextIn(active());
    irk.asked = true;
    const q = p.n >= 2 ? 'Ya van varias veces hoy. ¿Qué te pasa? ¿Estás aburrido?'
      : g === 0 ? '¿Estás aburrido o qué?' : g === 2 ? 'Te pregunto en serio, con cariño: ¿estás aburrido?' : 'Oye… ¿estás aburrido?';
    const c = circadian();
    const outside = c.phase === 'winddown' ? 'Entonces apaga un rato la pantalla y lee algo en papel. Mañana sales.'
      : c.phase === 'calm' ? 'Entonces sal a ver el atardecer cinco minutos. Yo te espero.'
      : 'Entonces sal diez minutos a caminar. Tocar pasto de verdad ayuda: el cerebro descansa con verde y luz.';
    const bored = nt && nt.t && Math.random() < 0.5
      ? `Te propongo algo: "${nt.t.text.slice(0, 60)}${nt.t.text.length > 60 ? '…' : ''}" te está esperando. Una tarea chiquita quita el aburrimiento.`
      : outside;
    pending = 'bored';
    pets.home.express('thinking', 3000);
    showThought(q, [
      ['Sí, aburrido', bored, 'ok', null, 'feelings', () => { irk.v *= 0.4; irk.advised = true; }],
      ['Quería cariño', pick(['Ahh… era eso. Un toque suave y esperar a que responda vale más que cien seguidos. Ven, uno solo.', 'Entonces dímelo así: "quiero cariño". Me encanta darlo, pero sin tanto toque.']), 'warm', null, 'consent', () => { irk.v = 0; }],
      ['Ando estresado', 'Ah… entonces no es aburrimiento. Respira conmigo: cuatro para entrar, cuatro para salir. Y después, una cosita a la vez.', 'warm', null, 'validate', () => { irk.v = 0; }],
      ['Porque sí', pick(['Hmph. Bueno, yo me molesto porque sí también.', 'Ok. Entonces yo me voy a enojar porque sí.']), 'cold', null, null, () => { irk.v += 3; p.n = Math.min(4, p.n + 1); p.last = Date.now(); }]
    ]);
    holdUntil = Date.now() + 20000;
  }
  function startPause(now) {
    const p = pester();
    pending = null;
    const secs = Math.min(240, 60 * (1 + 0.6 * p.n));
    p.n = Math.min(4, p.n + 1); p.last = now; touchProfile();
    irk.v = 0; irk.asked = false; irk.advised = false; irk.limited = false; irk.stage = -1; irk.said.clear();
    pause.until = now + secs * 1000; pause.broken = 0; pause.id = now;
    bondChange(-1 - 0.5 * Math.min(3, p.n - 1), 'boundary');
    pets.home.express(p.n >= 3 ? 'grumpy' : 'sad', 4000);
    showThought(p.n === 1 && tg() === 0 ? 'Necesito una pausa. Vuelvo en un rato.' : PAUSE_LINES[Math.min(PAUSE_LINES.length - 1, p.n - 1)]); holdUntil = Date.now() + 9000;
    endPauseLater(pause.id);
  }
  // Al terminar la pausa intenta reparar: "¿estamos bien?" (si se la extendiste, espera a que termine).
  function endPauseLater(id) {
    setTimeout(() => {
      if (pause.id !== id) return;
      if (Date.now() < pause.until - 200) { endPauseLater(id); return; }
      if (pause.broken === 0) bondChange(3, 'respect');
      pending = 'repair'; holdUntil = Date.now() + 25000;
      if (state.screen !== 'home') return;
      const n = pester().n;
      pets.home.express('shy', 3000);
      showThought(pause.broken === 0 ? 'Gracias por respetar mi pausa. Eso me hace sentir seguro contigo. ¿Estamos bien?'
        : n >= 3 ? 'Ya se me pasó… casi. ¿Estamos bien? Y de verdad, sal un ratito.' : 'Ya estoy mejor. ¿Estamos bien?',
        [['Sí, perdón', 'Claro que sí. Te quiero, bolita grande.', 'warm', null, 'repair', () => { const p = pester(); if (p.n >= 3) p.n--; }],
         ['Sí', 'Qué bueno. Seguimos entonces.', 'ok', null, 'repair']]);
    }, Math.max(1000, pause.until - Date.now()));
  }

  let wakeT = 0;
  // Toques: despierto responde; dormido se despierta medio borracho de sueño, y eso pasa la cuenta mañana.
  function poke() {
    const c = circadian(), now = Date.now();
    if (c.sleeping && c.phase === 'sleep') {
      const n = registerWake();
      pets.home.set({ sleepy: false, drowsy: true });
      if (n >= 2) bondChange(n >= 4 ? -2 : -1);
      if (n >= 6) {
        pets.home.express('grumpy', 6000, true);
        think(pick(['Ya basta, por favor. Es la sexta vez. Estoy enojado y muy cansado, porque necesito dormir. Mañana voy a estar fatal. Déjame descansar.',
          'Me despertaste seis veces. Me siento enojado y agotado. Necesito que me dejes dormir hasta mañana.']));
        pending = null;
      } else if (n >= 4) { pets.home.express('sad', 5000, true); think(pick(WOKEN_LIMIT)); pending = null; }
      else if (n >= 2) { pets.home.express(pick(['dizzy', 'squint', 'drowsy']), 4500, true); think(pick(WOKEN_AGAIN)); }
      else { pets.home.express(pick(['dizzy', 'squint', 'surprised']), 4500, true); think(pick(WOKEN)); }
      renderHome(totals());
      // Vuelve a cerrar los ojos después de un rato (más largo mientras más veces lo despiertas).
      const back = 5000 + 2500 * Math.min(4, n - 1);
      clearTimeout(wakeT); wakeT = setTimeout(() => renderPets(totals()), back);
      musicWoken(back);
      return;
    }
    if (c.sleeping) { think('Zzz… estoy muy cansadito.', 'sad'); return; }
    // En su pausa: tocarlo igual resta confianza y, después del tercero, alarga la pausa.
    if (now < pause.until) {
      pause.broken++;
      if (pause.broken <= 3) bondChange(-1.5);
      if (pause.broken > 3) pause.until = Math.min(pause.until + 10000, now + 300000);
      const lines = PAUSE_POKE[Math.min(3, pause.broken - 1)];
      pets.home.express(pause.broken > 3 ? pick(['apathetic', 'grumpy']) : 'sad', 1500);
      showThought(draw('pp' + lines.length, lines)); holdUntil = Date.now() + 4000;
      return;
    }
    // Una pregunta abierta: tocarlo sin responder también comunica algo.
    if (pending === 'bored' || pending === 'limit') {
      pending = null; annoyance(1.5); irk.last = now;
      pets.home.express('grumpy', 2200);
      think(pick(['Te hice una pregunta… y me respondes con más toques.', 'Eso no era una respuesta, eh.', '¿Eso es un "una más"? Porque se sintió como un "una más".']));
      return;
    }
    // Otra pregunta suya: el primer toque es cariño; si sigues, la deja para después.
    if (pending) {
      if (!irk.qPoke) { irk.qPoke = 1; pets.home.feed(0.3); pets.home.express(pick(['happy', 'shy']), 1200); return; }
      pending = null;
    }
    irk.qPoke = 0;
    const fast = now - irk.last < 700; irk.last = now;
    const a = annoyance(fast ? 1.25 : 1), g = tg();
    holdUntil = 0;
    let stage = a < 0.3 ? 0 : a < 0.5 ? 1 : a < 0.68 ? 2 : a < 0.85 ? 3 : a < 1 ? 4 : 5;
    if (stage === 5 && !irk.limited) stage = 4; // siempre avisa antes de irse a su pausa
    const drained = isDrained();
    if (stage === 0) {
      if (!drained) pets.home.feed(0.4);
      pets.home.express(drained ? (Math.random() < 0.3 ? 'grumpy' : 'apathetic') : pick(g === 0 ? ['surprised', 'shy', 'happy'] : ['happy', 'wink', 'surprised', 'shy', 'love']), 1600);
      if (drained || Math.random() < 0.65) think(flavor(draw('cute' + g, CUTE[g]), CUTE_MOOD, CUTE_PHASE)); else think();
    } else if (stage === 1) {
      pets.home.express(drained ? 'apathetic' : pick(['dizzy', 'dizzy', 'squint']), 2200);
      think(flavor(draw('play' + g, PLAYFUL[g]), CUTE_MOOD));
    } else if (stage === 2) {
      pets.home.express(pick(['squint', 'thinking', drained ? 'apathetic' : 'shy']), 2600);
      think(flavor(draw('hold', HOLD), HOLD_MOOD));
    } else if (stage === 3) {
      pets.home.express(pick(['grumpy', 'squint', 'apathetic']), 2800);
      // Primero refunfuña; si sigue, pasa a las pullas (antes si ya hubo rondas hoy).
      const teaseP = 0.35 + 0.2 * pester().n;
      think(irk.advised && Math.random() < 0.5 ? draw('advised', ADVISED) : Math.random() < teaseP ? tease() : draw('grumble', GRUMBLE));
    } else if (stage === 4 && !irk.asked && g > 0 && !drained) {
      askBored();
    } else if (stage === 4 && !irk.limited) {
      irk.limited = true;
      pets.home.express(pester().n >= 1 ? 'grumpy' : 'shy', 3500);
      pending = 'limit';
      bond().lessons.boundary || (bond().lessons.boundary = Date.now(), touchProfile());
      showThought(pester().n >= 1 ? pick(LIMIT_AGAIN) : pick(LIMIT[g]), [
        ['Perdón, te doy espacio', 'Gracias por escucharme. Eso me hace sentir querido.', 'warm', null, 'boundary', () => { irk.v *= 0.3; irk.limited = false; }],
        ['Una más', pester().n >= 1 ? 'No. Ya te dije que no.' : 'Ok… pero de verdad necesito calma, ¿sí?', pester().n >= 1 ? 'cold' : 'ok', null, 'boundary', () => { irk.v += 2; }]
      ]);
      holdUntil = Date.now() + 15000;
    } else {
      startPause(now);
    }
    irk.stage = stage;
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

  // ---------- música del inicio ----------
  // Tres pistas, solo donde está Mochi: la mañana (desde que despierta hasta las 13:15), el resto del día,
  // y una canción de cuna mientras duerme. Los navegadores no dejan sonar nada antes del primer toque,
  // así que parte con la primera interacción. Se repiten sin corte (Web Audio, recortando el silencio final)
  // y se cruzan suave al cambiar. Si lo despiertas de noche, la cuna se frena en seco y queda en silencio;
  // cuando vuelve a cerrar los ojos, la cuna empieza de nuevo, despacito, a medida que retoma el sueño.
  // Para no llenar la memoria del celular, solo se decodifica la pista que suena; las otras quedan como MP3.
  const TRACKS = {
    morning: { url: 'assets/music/sunshine-arpeggios.mp3', vol: 0.32, name: 'Mañana' },
    day: { url: 'assets/music/warm-melodic-storytelling.mp3', vol: 0.32, name: 'Tarde' },
    night: { url: 'assets/music/music-box-lullaby.mp3', vol: 0.26, name: 'Canción de cuna' }
  };
  const MORNING_END = 13 * 60 + 15; // la mañana termina a las 13:15
  const SLEEP_BACK = 22; // segundos que tarda la cuna en volver mientras retoma el sueño
  const savedVol = parseFloat(lsGet(LS_MUSIC_VOL));
  const music = {
    on: lsGet(LS_MUSIC) !== 'off', vol: isFinite(savedVol) ? Math.max(0, Math.min(1, savedVol)) : 0.8,
    ctx: null, master: null, simple: false, started: false, unlocked: false, heard: false, quietUntil: 0, back: 0
  };
  // La pista que corresponde ahora, suene o no.
  function trackNow() {
    if (circadian().sleeping) return 'night';
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() < MORNING_END ? 'morning' : 'day';
  }
  function musicWanted() { return !music.on || state.screen !== 'home' || document.hidden ? null : trackNow(); }
  function loopEnd(buf) {
    const ch = buf.getChannelData(0); let end = ch.length - 1;
    while (end > 0 && Math.abs(ch[end]) < 0.01) end--;
    return Math.min(buf.duration, end / buf.sampleRate + 0.25);
  }
  // Baja el MP3 una vez y lo guarda comprimido; decodificar es aparte.
  function fetchTrack(k) {
    const t = TRACKS[k];
    return t.bytes || (t.bytes = fetch(t.url).then(r => { if (!r.ok) throw new Error('sin música'); return r.arrayBuffer(); }));
  }
  function loadTrack(k) {
    const t = TRACKS[k];
    if (t.buf) return Promise.resolve();
    return t.decoding || (t.decoding = fetchTrack(k)
      .then(b => new Promise((ok, ko) => music.ctx.decodeAudioData(b.slice(0), ok, ko)))
      .then(buf => { t.buf = buf; t.end = loopEnd(buf); })
      .finally(() => { t.decoding = null; }));
  }
  // Arranca una pista desde el principio (la cuna vuelve a empezar después de una despertada).
  function playTrack(k) {
    const t = TRACKS[k];
    if (!t.buf || t.node) return;
    if (!t.gain) { t.gain = music.ctx.createGain(); t.gain.gain.value = 0; t.gain.connect(music.master); }
    const s = music.ctx.createBufferSource();
    s.buffer = t.buf; s.loop = true; s.loopStart = 0; s.loopEnd = t.end;
    s.connect(t.gain); s.start();
    t.node = s;
  }
  function stopTrack(k, free) {
    const t = TRACKS[k];
    if (t.node) { try { t.node.stop(); } catch (e) { /* ya parada */ } t.node.disconnect(); t.node = null; }
    if (free) t.buf = null; // libera la memoria; el MP3 comprimido queda guardado
  }
  function ramp(g, v, secs) {
    const now = music.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(v, now + Math.max(0.05, secs));
  }
  function musicApply(fade) {
    renderMusicBtn();
    if (!music.started) return;
    const want = musicWanted(), now = Date.now();
    const quiet = now < music.quietUntil; // recién despertado: silencio
    if (music.simple) {
      Object.entries(TRACKS).forEach(([k, t]) => {
        const on = want === k && !(k === 'night' && quiet);
        if (!t.el) return;
        t.el.volume = on ? t.vol * music.vol : 0;
        if (on) t.el.play().catch(() => {}); else t.el.pause();
      });
      return;
    }
    if (want && music.ctx.state === 'suspended') music.ctx.resume().catch(() => {});
    Object.entries(TRACKS).forEach(([k, t]) => {
      const on = want === k && !(k === 'night' && quiet);
      if (on) {
        clearTimeout(t.stopT);
        if (!t.buf) { loadTrack(k).then(() => musicApply(fade)).catch(() => {}); return; }
        const fresh = !t.node;
        playTrack(k);
        // Volviendo a dormir: entra muy despacio desde cero, y nada la apura mientras tanto.
        const resleep = k === 'night' && now - music.back < SLEEP_BACK * 1000;
        if (resleep && !fresh) return;
        if (fresh) t.gain.gain.value = 0;
        ramp(t.gain, t.vol, resleep ? SLEEP_BACK : fresh ? 2.5 : (fade == null ? 1.5 : fade));
      } else if (t.gain && t.node) {
        const secs = fade == null ? 1.5 : fade;
        ramp(t.gain, 0, secs);
        // Cuando terminó de apagarse, se detiene; si ya no toca hoy, también se libera de la memoria.
        clearTimeout(t.stopT);
        t.stopT = setTimeout(() => {
          const w = musicWanted();
          if (w === k) return;
          stopTrack(k, trackNow() !== k); // si es la de ahora (solo saliste del inicio), se guarda para volver rápido
        }, secs * 1000 + 300);
      }
    });
    // Precarga (comprimida) la siguiente pista del día.
    const nextK = want === 'night' ? 'morning' : want === 'morning' ? 'day' : want === 'day' ? 'night' : null;
    if (nextK) fetchTrack(nextK).catch(() => {});
    clearTimeout(music.sleepT);
    if (!want) music.sleepT = setTimeout(() => { if (!musicWanted() && music.ctx.state === 'running') music.ctx.suspend().catch(() => {}); }, 2000);
  }
  // Lo despertaron de noche: la cuna se frena y vuelve sola cuando Mochi retoma el sueño.
  function musicWoken(ms) {
    music.quietUntil = Date.now() + ms;
    const t = TRACKS.night;
    if (!music.simple && t.gain && music.ctx) {
      ramp(t.gain, 0, 0.18);
      setTimeout(() => { if (Date.now() < music.quietUntil) stopTrack('night'); }, 250);
    } else if (t.el) { t.el.pause(); t.el.currentTime = 0; }
    clearTimeout(music.backT);
    music.backT = setTimeout(() => { music.back = Date.now(); musicApply(); }, ms + 50);
  }
  async function musicStart() {
    if (music.started || !music.on) { musicApply(); return; }
    music.started = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      music.ctx = new AC();
      music.master = music.ctx.createGain(); music.master.gain.value = music.vol; music.master.connect(music.ctx.destination);
      await loadTrack(musicWanted() || 'day');
    } catch (e) {
      // Sin Web Audio o sin poder leer el archivo (por ejemplo, abierto como archivo local): reproductor simple.
      if (music.ctx) { try { music.ctx.close(); } catch (x) { /* nada */ } }
      music.ctx = null; music.simple = true;
      Object.values(TRACKS).forEach(t => { t.el = new Audio(t.url); t.el.loop = true; t.el.volume = 0; });
    }
    music.heard = true;
    musicApply(2.5);
  }
  function musicSetOn(on) {
    music.on = on;
    lsSet(LS_MUSIC, on ? 'on' : 'off');
    if (on) musicStart(); else musicApply(0.6);
    const sw = $('#menu-music'); if (sw) sw.checked = on;
  }
  function musicToggle() {
    // Si todavía no sonaba (primer toque justo en el botón), el toque la enciende en vez de silenciarla.
    if (music.on && !music.heard) { musicStart(); return; }
    musicSetOn(!music.on);
  }
  function musicVolume(v) {
    music.vol = Math.max(0, Math.min(1, v));
    lsSet(LS_MUSIC_VOL, String(music.vol));
    if (music.master) { const t = music.ctx.currentTime; music.master.gain.cancelScheduledValues(t); music.master.gain.setTargetAtTime(music.vol, t, 0.05); }
    if (music.simple) musicApply(0);
    // Subir la barra con la música apagada la enciende.
    if (music.vol > 0 && !music.on) musicSetOn(true);
    renderMusicBtn();
  }
  function renderMusicBtn() {
    const b = $('#h-music'); if (!b) return;
    const silent = !music.on || music.vol === 0;
    b.classList.toggle('off', silent);
    b.setAttribute('aria-pressed', String(!silent));
    b.setAttribute('aria-expanded', String(!$('#h-vol').hidden));
    const pct = Math.round(music.vol * 100);
    const label = `Música: ${music.on ? pct + ' %' : 'silenciada'}. Toca para ajustar el volumen.`;
    b.title = label; b.setAttribute('aria-label', label);
    $('#vol-range').value = pct; $('#vol-val').textContent = music.on ? pct + ' %' : 'Silencio';
    $('#vol-range').style.setProperty('--p', pct + '%');
    $('#vol-mute').classList.toggle('off', !music.on);
    $('#vol-mute').setAttribute('aria-label', music.on ? 'Silenciar música' : 'Activar música');
    $('#vol-mute').title = music.on ? 'Silenciar' : 'Activar';
    const k = music.on ? trackNow() : null;
    $('#vol-track').textContent = k ? 'Sonando: ' + TRACKS[k].name : 'Música apagada';
    const mr = $('#menu-vol'); if (mr) { mr.value = pct; mr.style.setProperty('--p', pct + '%'); }
  }
  function openVol(open) {
    const p = $('#h-vol');
    p.hidden = !open;
    renderMusicBtn();
    if (open) setTimeout(() => $('#vol-range').focus({ preventScroll: true }), 30);
  }
  // Primer toque en cualquier parte: ahora sí puede sonar.
  function musicUnlock() {
    if (music.unlocked) return;
    music.unlocked = true;
    if (music.on) musicStart();
  }
  document.addEventListener('pointerdown', musicUnlock, { once: true, capture: true });
  document.addEventListener('keydown', musicUnlock, { once: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (music.unlocked) musicApply(0.4); });

  // ---------- jugar con Mochi ----------
  // Por ahora es la puerta de entrada: muestra con qué habilidades va a jugar. El juego llega después.
  function openPlay() {
    const d = $('#play'); if (!d) return;
    const a = attrs(totals());
    const top = GAME_STATS.slice().sort((x, y) => a._game[y.id].value - a._game[x.id].value).slice(0, 3);
    $('#play-skills').innerHTML = top.map(g => { const [l, v] = g.out(a._game[g.id].value); return `<li style="--ac:${g.color}"><div><b>${g.ab} · ${esc(g.name)}</b><small>${esc(l)}: ${v}</small></div><span>${a._game[g.id].value}</span></li>`; }).join('');
    if (pets.home) pets.home.express('sparkle', 2500);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function closePlay() { const d = $('#play'); if (d.close) d.close(); else d.removeAttribute('open'); }

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
  const SCREENS = ['home', 'misiones', 'mision', 'equipo', 'stats', 'taller', 'plaza', 'menu'];
  function go(screen, opts) {
    if (!SCREENS.includes(screen)) screen = 'home';
    if (screen === 'mision' && !(opts && opts.id ? state.projects[opts.id] : active())) screen = 'misiones';
    if (opts && opts.id) {
      state.activeId = opts.id; persistLocal();
      state.open = new Set(); const n = nextIn(active()); if (n) state.open.add(n.ph.n);
    }
    state.screen = screen;
    SCREENS.forEach(s => ($('#scr-' + s).hidden = s !== screen));
    if (music.unlocked) musicApply();
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
    if (state.screen === 'stats') renderStats(tot);
    if (state.screen === 'taller') renderWorkshop();
    if (state.screen === 'plaza') renderPlaza();
    if (state.screen === 'menu') renderMenu();
  }

  function renderPets(tot) {
    const lv = levelOf(tot.xp), stg = stageOf(lv.L);
    const heat = tot.last ? Math.max(0.15, 1 - (Date.now() - tot.last) / (3 * DAY)) : 0.45;
    const famTop = Object.entries(tot.fam).sort((a, b) => b[1] - a[1])[0];
    const cz = circadian(tot);
    const room = $('.room'); if (room) { room.dataset.sky = cz.sky; room.dataset.phase = cz.phase; }
    const fxNow = todayEffects();
    const bad = fxNow.filter(id => !EFFECTS[id].good).length;
    const mood = fxNow.includes('agotado') ? 'apathetic' : cz.v.hp <= 25 ? 'sad' : cz.alert >= 0.9 && cz.curious ? 'sparkle' : 'neutral';
    const opts = { stage: stg, heat, sleepy: cz.sleeping, drowsy: !cz.sleeping && cz.alert < 0.5, alert: cz.alert, mood, ojeras: bad, sweat: cz.worn, tint: famTop[1] ? FAMILY_INFO[famTop[0]].color : '#ffd166', ground: 0.85, equip: Object.assign({}, state.profile.equipped) };
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
    const pts = attrs(tot)._avail;
    const b3 = $('#badge-stats'); b3.hidden = !pts; b3.textContent = pts;
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
    const bd = bond(), tr = TIERS[tierOf(bd.emp)];
    bar('#v-emp', Math.round(bd.emp), `Empatía ${Math.round(bd.emp)}/100 · ${tr.name}: ${tr.text}`);
    const chip = (id, n, label) => { const el = $(id); el.querySelector('b').textContent = n; el.title = label; el.setAttribute('aria-label', label); };
    chip('#h-streak', streak, `Racha: ${streak} ${streak === 1 ? 'día' : 'días'}`);
    chip('#h-xp', tot.xp >= 10000 ? Math.round(tot.xp / 1000) + 'k' : tot.xp, `Experiencia total: ${tot.xp} XP`);
    chip('#h-daily', `${qDone}/${qs.length}`, qReady ? `${qReady} misión diaria lista para reclamar` : `Misiones diarias cobradas: ${qDone} de ${qs.length}`);
    $('#h-daily').classList.toggle('ready', qReady > 0);
    const combo = $('#h-combo');
    combo.hidden = c < 2;
    if (c >= 2) chip('#h-combo', '×' + (c >= 4 ? 2 : 1.5), 'Combo activo');
    const sd = sleepData(), fxList = todayEffects();
    const hr = new Date().getHours();
    const wakesTonight = hr >= 23 || hr < 7 ? sd.log[nightKey(Date.now())] || 0 : 0;
    $('#h-status').innerHTML = fxList.map(id => {
      const f = EFFECTS[id];
      const why = f.good ? '' : ` (lo despertaste ${sd.roll.wakes} ${sd.roll.wakes === 1 ? 'vez' : 'veces'} anoche)`;
      return `<span class="fx ${f.good ? 'good' : 'bad'}" role="img" title="${esc(f.name + ': ' + f.text + why)}" aria-label="${esc(f.name + ': ' + f.text + why)}"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true">${f.svg}</svg></span>`;
    }).join('') + (wakesTonight ? `<span class="fx bad" role="img" title="Lo despertaste ${wakesTonight} ${wakesTonight === 1 ? 'vez' : 'veces'} esta noche" aria-label="Despertado ${wakesTonight} veces esta noche"><b>${wakesTonight}</b></span>` : '');
    const pct = Math.floor(lv.into / lv.need * 100);
    $('#xp-fill').style.width = (lv.into / lv.need * 100).toFixed(1) + '%';
    $('#xp-pct').textContent = pct + '%';
    const xb = $('#xpbar');
    xb.setAttribute('aria-valuenow', pct);
    xb.title = `Nivel ${lv.L}: ${lv.into} de ${lv.need} XP para el nivel ${lv.L + 1}`;
    if (!$('#h-bubble').textContent) think();
  }

  function renderMissions(tot) {
    const qs = questState();
    $('#m-daily').innerHTML = qs.map(x => `
      <li class="daily ${x.claimed ? 'claimed' : x.ready ? 'ready' : ''}">
        <span class="d-ring" style="--k:${x.have / x.q.goal}"><span>${x.have}/${x.q.goal}</span></span>
        <span class="d-text"><b>${esc(x.q.text)}</b><small>+${questXp(x.q)} XP</small></span>
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
            ? `<span class="gate-ok">Superada el ${fmtDate(pp.doneAt)} · +${pp.xp} XP</span><button class="link" data-reopen="${ph.n}">Reabrir</button>`
            : `<button class="btn primary" data-complete="${ph.n}" ${all ? '' : 'disabled'}>Fase superada</button>
               <span class="muted">${all ? 'Confirma solo si se cumple el criterio «Listo cuando».' : `Faltan ${ph.tasks.length - d} tareas.`}</span>`}
        </div>
        ${ph.prompt ? `<div class="prompt">
          <div class="prompt-head"><span>Prompt para Claude</span>
            <span class="prompt-actions"><button class="btn small" data-copy="${ph.n}">Copiar prompt</button><button class="btn small ghost" data-copyctx="${ph.n}">Copiar con contexto</button></span></div>
          ${vars.filter(v => !p.vars[v]).length ? `<div class="prompt-vars">${vars.map(v => `<label class="var"><span>[${esc(v)}]</span><input id="pv-${ph.n}-${esc(v)}" data-var="${esc(v)}" value="${esc(p.vars[v] || '')}" placeholder="completa antes de copiar"></label>`).join('')}</div>` : ''}
          <pre>${promptHTML(p, ph.prompt)}</pre>
          ${p.progress.prompts[ph.n] ? '' : '<div class="prompt-hint">Copiarlo por primera vez da +3 XP.</div>'}
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
            p.progress.prompts[ph.n] = Date.now(); touch(p); giveFrom('claude');
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
        go('misiones'); say('Misión quitada. La experiencia que ganaste con ella se fue con ella.');
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

  // Stats: tabla de vitales y los nueve atributos, con lo entrenado, lo asignado y su efecto.
  function renderStats(tot) {
    const lv = levelOf(tot.xp), v = vitals(tot), a = attrs(tot), bd = bond(), pr = state.profile;
    const row = (k, val, max, color, note) => `<tr><th>${k}</th><td><span class="st-bar"><i style="width:${Math.min(100, val / max * 100).toFixed(0)}%;background:${color}"></i></span></td><td class="n">${val}${max === 100 ? '' : ''}</td><td class="st-note">${esc(note)}</td></tr>`;
    $('#st-vitals').innerHTML = `
      <div class="st-lv"><b>Nivel ${lv.L}</b><span>${esc(STAGES[stageOf(lv.L)].name)} · ${tot.xp} XP · faltan ${lv.need - lv.into} XP para el nivel ${lv.L + 1}</span></div>
      <table class="st-table"><tbody>
        ${row('HP', v.hp, 100, '#ff6b81', 'Vida: baja con los días sin avanzar')}
        ${row('MP', v.mp, 100, '#7fc4ff', 'Maná: aprender con Claude hoy')}
        ${row('STA', v.sta, 100, '#ffd166', 'Estamina: tareas de hoy')}
        ${row('EMP', Math.round(bd.emp), 100, '#ff7fb0', 'Empatía de Mochi contigo · ' + TIERS[tierOf(bd.emp)].name)}
      </tbody></table>`;
    const k = dayKey(Date.now()), any = Object.keys(pr.gamePts || {}).length;
    $('#st-points').innerHTML = `<span class="st-pts ${a._avail ? 'on' : ''}"><b>${a._avail}</b> ${a._avail === 1 ? 'punto disponible' : 'puntos disponibles'}</span>
      <span class="muted">Ganas 1 por cada nivel (${lv.L - 1} en total, ${a._spent} repartidos). Van a los stats de juego, para cuando juegues con Mochi.</span>
      ${any ? `<button class="btn small ghost" id="st-reset" ${pr.statReset === k ? 'disabled title="Ya reasignaste hoy"' : ''}>Reasignar</button>` : ''}`;
    const maxG = Math.max(15, ...GAME_STATS.map(g => a._game[g.id].value));
    $('#st-game').innerHTML = GAME_STATS.map(g => {
      const s = a._game[g.id], [olab, oval] = g.out(s.value), [, next] = g.out(s.value + 1);
      const parts = [`Base ${GAME_BASE}`, s.given ? `puntos +${s.given}` : null, s.aff ? `${ATTR[g.aff].name.toLowerCase()} +${s.aff}` : null].filter(Boolean).join(' · ');
      return `<li class="gstat" style="--ac:${g.color}">
        <span class="g-ab">${g.ab}</span>
        <div class="g-main"><div class="g-head"><b>${esc(g.name)}</b><span class="g-val">${s.value}</span></div>
          <div class="g-bar"><i style="width:${(s.value / maxG * 100).toFixed(1)}%"></i></div>
          <p class="g-what">${esc(g.what)}</p>
          <p class="g-meta"><span>${esc(parts)}</span><span>${esc(olab)}: <b>${oval}</b>${a._avail ? ` → ${next}` : ''}</span></p>
          ${g.aff ? `<p class="g-aff">Afinidad: +1 por cada 3 niveles de ${esc(ATTR[g.aff].name.toLowerCase())}</p>` : ''}
        </div>
        <button class="btn small ${a._avail ? 'primary' : 'ghost'}" data-stat="${g.id}" ${a._avail ? '' : 'disabled'} aria-label="Dar 1 punto a ${esc(g.name)}">+1</button>
      </li>`;
    }).join('');
    const card = x => {
      const s = a[x.id], b = s.value - 1, gs = GAME_STATS.find(g => g.aff === x.id);
      return `<li class="attr" style="--ac:${x.color}">
        <div class="a-head"><b>${esc(x.name)}</b><span class="a-val">${s.value}</span></div>
        <p class="a-what">${esc(x.what)}</p>
        <div class="a-bar" title="Entrenado: ${Math.floor(s.into)} de ${s.need} para el nivel ${s.trained + 1}"><i style="width:${(s.into / s.need * 100).toFixed(1)}%"></i></div>
        <div class="a-meta"><span>Nivel ${s.trained} · ${Math.floor(s.into)}/${s.need}</span>${gs ? `<span>Afín a ${gs.ab}</span>` : ''}</div>
        <p class="a-eff">${b ? esc(x.eff(b)) : 'Sin efecto todavía'}<small>Al subir: ${esc(x.eff(b + 1))}</small></p>
        <p class="a-how"><b>Sube con:</b> ${esc(x.how)}</p>
        <details><summary>Base científica</summary><p>${esc(x.basis)}</p></details>
      </li>`;
    };
    $('#st-cog').innerHTML = ATTRS.filter(x => x.g === 'cog').map(card).join('');
    $('#st-emo').innerHTML = ATTRS.filter(x => x.g === 'emo').map(card).join('');
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
    $('#e-perks').textContent = perks.length ? 'Bonos activos: ' + perks.join(' · ') : 'Sin bonos activos. Equipa algo para ganar XP extra.';
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
    const bd = bond(), ti = tierOf(bd.emp);
    let p7 = 0, n7 = 0;
    for (let i = 0; i < 7; i++) { const k = dayKey(Date.now() - i * DAY); p7 += bd.pos[k] || 0; n7 += bd.neg[k] || 0; }
    const ratio = n7 ? (p7 / n7).toFixed(1).replace('.', ',') + ' a 1' : p7 ? `${p7} a 0` : '—';
    const learned = Object.entries(bd.lessons).sort((a, b) => a[1] - b[1]);
    $('#e-bond').innerHTML = `
      <div class="bond-top"><b>${TIERS[ti].name}</b><span>${Math.round(bd.emp)}/100</span></div>
      <div class="bond-bar"><i style="width:${bd.emp}%"></i>${TIERS.slice(1).map(t => `<s style="left:${t.min}%"></s>`).join('')}</div>
      <p class="bond-desc">${esc(TIERS[ti].text)}${ti < TIERS.length - 1 ? ` Con ${TIERS[ti + 1].min} pasa a ${TIERS[ti + 1].name.toLowerCase()}.` : ''}</p>
      <div class="bond-ratio"><span>Buenas y malas interacciones (7 días)</span><b>${ratio}</b></div>
      <h4 class="bond-h">Lo que aprendimos juntos · ${learned.length} de ${Object.keys(LESSONS).length}</h4>
      ${learned.length ? `<ul class="lessons">${learned.map(([id]) => `<li><b>${esc(LESSONS[id].t)}</b><span>${esc(LESSONS[id].d)}</span></li>`).join('')}</ul>` : '<p class="bond-desc">Todavía nada. Conversa con Mochi y responde sus preguntas.</p>'}`;
    $('#e-facts').innerHTML = `
      <div><b>${tot.tasks}</b><span>tareas</span></div><div><b>${tot.phases}</b><span>fases</span></div>
      <div><b>${tot.missions}</b><span>misiones</span></div><div><b>${fmtH(tot.hours)}</b><span>horas</span></div>`;
  }

  function renderWorkshop() {
    const pr = workshop();
    const inPot = id => cauldron.filter(x => x === id).length;
    const have = Object.keys(MATS).filter(id => id === 'agua' || (pr.mats[id] || 0) > 0);
    $('#t-mats').innerHTML = have.map(id => {
      const m = MATS[id], left = id === 'agua' ? Infinity : (pr.mats[id] || 0) - inPot(id);
      return `<li><button class="jar ${m.made ? 'made-mat' : ''}" data-mat="${id}" ${left > 0 && cauldron.length < 3 ? '' : 'disabled'} title="${esc(m.name)}">
        <svg viewBox="0 0 40 40" aria-hidden="true">${m.svg}</svg><b>${id === 'agua' ? '∞' : left}</b><span>${esc(m.name)}</span></button></li>`;
    }).join('');
    $('#t-slots').innerHTML = [0, 1, 2].map(i => {
      const id = cauldron[i];
      return `<button class="slot-in ${id ? 'full' : ''}" data-unslot="${i}" ${id ? '' : 'disabled'} aria-label="${id ? 'Sacar ' + MATS[id].name : 'Espacio vacío'}">${id ? `<svg viewBox="0 0 40 40" aria-hidden="true">${MATS[id].svg}</svg>` : '+'}</button>`;
    }).join('');
    $('#t-proc').innerHTML = Object.entries(PROC).map(([k, v]) => `<button class="${k === process ? 'on' : ''}" data-proc="${k}" aria-pressed="${k === process}">${v}</button>`).join('');
    const col = cauldron.length ? cauldron.map(id => MATS[id].color) : ['#7a6a9a'];
    const pot = $('#t-pot');
    pot.style.setProperty('--brew', col[0]); pot.style.setProperty('--brew2', col[col.length - 1]);
    pot.dataset.proc = process;
    $('#t-mix').disabled = !cauldron.length;
    $('#t-mix').textContent = PROC[process];
    const k = mixKey(cauldron, process);
    $('#t-hint').textContent = !cauldron.length ? 'Elige de 1 a 3 materiales y cómo trabajarlos.' : pr.recipes[k] ? `Ya sabes qué sale: ${recipeOutName(RECIPES[k])}.` : '¿Qué saldrá? Prueba lo que sabes.';
    // Recetario: solo lo que TÚ descubriste. Lo demás no se muestra: se aprende probando o preguntando.
    const found = Object.keys(pr.recipes).filter(x => RECIPES[x]).sort((a, b) => pr.recipes[a] - pr.recipes[b]);
    $('#t-known').textContent = `${found.length} de ${Object.keys(RECIPES).length} descubiertas`;
    $('#t-book').innerHTML = found.length ? found.map(key => {
      const r = RECIPES[key], [ing, proc] = key.split('|');
      const ico = r.kind === 'jewel' ? `<svg viewBox="0 0 40 40" aria-hidden="true">${ITEM[r.id].svg}</svg>` : r.kind === 'mat' ? `<svg viewBox="0 0 40 40" aria-hidden="true">${MATS[r.out].svg}</svg>` : foodSvg(r);
      return `<li class="rec known"><span class="rec-ico">${ico}</span>
        <span class="rec-txt"><small>${{ mat: 'Material', food: 'Comida', exp: 'Experimento', jewel: 'Joya' }[r.kind]}</small><b>${esc(recipeOutName(r))}</b>
        <span>${ing.split('+').map(m => esc(MATS[m].name)).join(' + ')} · ${esc(PROC[proc].toLowerCase())}</span><em>${esc(r.fact)}</em></span>
        <button class="btn small ghost" data-share="${esc(key)}">Compartir</button></li>`;
    }).join('') : '<li class="muted">Todavía no descubres nada. Piensa en cosas que sepas hacer en la vida real.</li>';
    const bag = Object.entries(pr.bag).filter(([id, n]) => n > 0 && FOOD[id]);
    $('#t-bag').innerHTML = bag.length ? bag.map(([id, n]) => `<li class="potion">
        <span class="rec-ico">${foodSvg(FOOD[id])}</span>
        <span class="rec-txt"><b>${esc(FOOD[id].name)} ×${n}</b><span>${esc(FOOD[id].text)}</span></span>
        <button class="btn small primary" data-use="${id}">Dársela a Mochi</button></li>`).join('')
      : '<li class="muted">Vacía. Lo que cocines aparece aquí.</li>';
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
    if (migrateStatPoints()) setTimeout(() => say('Ahora tengo stats de juego. Te devolví los puntos que habías repartido: búscalos en Stats.', true), 3500);

    document.addEventListener('click', e => {
      const g = e.target.closest('[data-go]');
      if (g) { const pd = $('#play'); if (pd && pd.open) closePlay(); go(g.dataset.go); return; }
      const m = e.target.closest('[data-open-mission]');
      if (m) { go('mision', { id: m.dataset.openMission }); return; }
      const mt = e.target.closest('[data-mat]');
      if (mt) { if (cauldron.length < 3) cauldron.push(mt.dataset.mat); $('#t-result').innerHTML = ''; renderWorkshop(); return; }
      const us = e.target.closest('[data-unslot]');
      if (us) { cauldron.splice(Number(us.dataset.unslot), 1); renderWorkshop(); return; }
      if (e.target.closest('#t-mix')) { doMix(); return; }
      const pc = e.target.closest('[data-proc]');
      if (pc) { process = pc.dataset.proc; renderWorkshop(); return; }
      const sh = e.target.closest('[data-share]');
      if (sh) { plazaDraft = { kind: 'descubrimiento', mix: sh.dataset.share }; go('plaza'); return; }
      if (e.target.closest('#t-clear')) { cauldron.length = 0; $('#t-result').innerHTML = ''; renderWorkshop(); return; }
      const up = e.target.closest('[data-use]');
      if (up) { usePotion(up.dataset.use, up); return; }
      const c = e.target.closest('[data-claim]');
      if (c) { claimQuest(c.dataset.claim, c); return; }
      const st = e.target.closest('[data-stat]');
      if (st) { giveStat(st.dataset.stat); return; }
      if (e.target.closest('#st-reset')) { resetStats(); return; }
      if (e.target.closest('#h-music')) { if (music.on && !music.heard) musicStart(); openVol($('#h-vol').hidden); return; }
      if (e.target.closest('#vol-mute')) { musicToggle(); return; }
      if (e.target.closest('#h-vol')) return;
      if (!$('#h-vol').hidden) openVol(false); // tocar fuera cierra el panel de volumen
      if (e.target.closest('#h-play')) { openPlay(); return; }
      if (e.target.closest('[data-play-close]')) { closePlay(); return; }
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
    $('#scr-plaza').addEventListener('click', plazaClick);
    $('#p-kind').onchange = e => { $('#p-mixrow').hidden = e.target.value !== 'descubrimiento'; };
    document.body.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragging'); });
    document.body.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
    document.body.addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('dragging'); handleFiles(e.dataTransfer.files); });
    $('#pet').onclick = poke;
    $('#h-bubble').onclick = e => { const r = e.target.closest('[data-reply]'); if (r) answer(Number(r.dataset.reply)); };

    // Menú
    const nm = $('#menu-name');
    nm.oninput = () => { clearTimeout(nm._t); nm._t = setTimeout(() => { state.profile.name = nm.value.trim().slice(0, 24) || 'Mochi'; touchProfile(); }, 400); };
    $$('[name="theme"]').forEach(r => (r.onchange = () => { state.profile.theme = r.value; touchProfile(); applyTheme(); }));
    const mus = $('#menu-music'); mus.checked = music.on;
    mus.onchange = () => { if (mus.checked !== music.on) musicSetOn(mus.checked); };
    $('#vol-range').oninput = e => musicVolume(e.target.value / 100);
    $('#menu-vol').oninput = e => musicVolume(e.target.value / 100);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#h-vol').hidden) { openVol(false); $('#h-music').focus(); } });
    renderMusicBtn();
    // Mochi se duerme y despierta solo: la música lo acompaña.
    setInterval(() => { if (music.unlocked) musicApply(3); }, 60000);
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
