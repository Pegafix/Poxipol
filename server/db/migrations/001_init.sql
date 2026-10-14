-- Mochi API · esquema inicial (PostgreSQL 16)
-- Principios:
--  * Catálogo global (igual para todos) separado del progreso de cada usuario.
--  * El estado del compañero se guarda como ANCLAS + contadores diarios; los valores vivos
--    (HP, MP, STA, sueño, ánimo) se calculan al leer con la hora del servidor. Nada de ticks.
--  * Cada mutación sube una revisión por usuario (user_rev) y deja una fila en change_log:
--    así cualquier dispositivo se pone al día pidiendo "lo que cambió desde la revisión N".

create extension if not exists ltree;

-- ───────────────────────── Identidad y dispositivos ─────────────────────────
create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  password_hash  text not null,
  display_name   text not null check (char_length(display_name) between 1 and 40),
  timezone       text not null default 'UTC',          -- IANA; el servidor decide la hora local con esto
  tz_changed_at  timestamptz,                          -- cambiar de zona horaria tiene enfriamiento (anti-trampas)
  created_at     timestamptz not null default now()
);
create unique index users_email_uq on users (lower(email));

create table devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  platform      text not null check (platform in ('desktop', 'mobile', 'web')),
  label         text not null default '',
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index devices_user_idx on devices (user_id);

-- Tokens de refresco rotativos (se guarda solo el hash). Reusar uno ya rotado revoca la familia del dispositivo.
create table refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references devices (id) on delete cascade,
  user_id      uuid not null references users (id) on delete cascade,
  token_hash   bytea not null unique,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index refresh_tokens_device_idx on refresh_tokens (device_id);

-- ───────────────────────── Sincronización ─────────────────────────
create table user_rev (
  user_id  uuid primary key references users (id) on delete cascade,
  rev      bigint not null default 0
);

-- Registro de cambios para sincronización incremental. Se poda por antigüedad.
create table change_log (
  user_id    uuid not null references users (id) on delete cascade,
  rev        bigint not null,
  entity     text not null,           -- 'pet' | 'task' | 'phase' | 'inventory' | 'skill' | 'discovery' | 'roadmap' | 'equipment'
  entity_id  text not null,
  op         text not null check (op in ('upsert', 'delete')),
  at         timestamptz not null default now(),
  primary key (user_id, rev)
);

-- Idempotencia: el mismo comando reintentado (red móvil inestable) devuelve la misma respuesta.
create table idempotency_keys (
  user_id       uuid not null references users (id) on delete cascade,
  key           text not null check (char_length(key) between 8 and 80),
  request_hash  text not null,
  status_code   smallint not null,
  response      jsonb not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, key)
);
create index idempotency_created_idx on idempotency_keys (created_at);

-- ───────────────────────── Estado del compañero ─────────────────────────
-- Una fila por usuario. "version" es para concurrencia optimista en ediciones directas (nombre, etc.).
create table pet_state (
  user_id           uuid primary key references users (id) on delete cascade,
  name              text not null default 'Mochi' check (char_length(name) between 1 and 24),
  version           integer not null default 1,
  xp_total          bigint not null default 0 check (xp_total >= 0),
  skill_points      integer not null default 0 check (skill_points >= 0),
  empathy           real not null default 35 check (empathy between 0 and 100),
  last_activity_at  timestamptz,
  streak_days       integer not null default 0,
  streak_day        date,                              -- último día local con avance (para la racha)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Contadores por día local del usuario: alimentan MP/STA, los despertares nocturnos y los efectos del día.
-- Fila diminuta; reemplaza escanear historiales completos en cada lectura.
create table pet_daily (
  user_id          uuid not null references users (id) on delete cascade,
  day              date not null,
  tasks_done       smallint not null default 0,
  learn_actions    smallint not null default 0,      -- tareas de Claude + prompts usados (MP)
  wakes            smallint not null default 0,      -- despertares de la noche que TERMINA este día
  effects          text[],                           -- efectos sorteados al despertar (null = aún no se sortean)
  cured            text[] not null default '{}',
  boost_hp         smallint not null default 0,
  boost_mp         smallint not null default 0,
  boost_sta        smallint not null default 0,
  primary key (user_id, day)
);

-- ───────────────────────── Catálogo global de habilidades ─────────────────────────
-- Árbol con dos representaciones que se mantienen juntas:
--   parent_id  → integridad y edición simple
--   path ltree → consultas de rama sin recursión:  path <@ 'ciencias.quimica'  (índice GiST)
create table skill_nodes (
  id          bigint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9_]{1,40}$'),
  parent_id   bigint references skill_nodes (id) on delete restrict,
  path        ltree not null unique,
  depth       smallint generated always as (nlevel(path)) stored,
  kind        text not null check (kind in ('branch', 'skill')),
  title       text not null,
  description text not null default '',
  cost        smallint not null default 1 check (cost >= 0),   -- puntos de habilidad para desbloquear
  sort        integer not null default 0
);
create index skill_nodes_path_gist on skill_nodes using gist (path);
create index skill_nodes_parent_idx on skill_nodes (parent_id);

-- Prerrequisitos transversales (un DAG encima del árbol): "Metalurgia" puede pedir "Química básica" de otra rama.
create table skill_prereqs (
  skill_id     bigint not null references skill_nodes (id) on delete cascade,
  requires_id  bigint not null references skill_nodes (id) on delete cascade,
  primary key (skill_id, requires_id),
  check (skill_id <> requires_id)
);
create index skill_prereqs_requires_idx on skill_prereqs (requires_id);

-- ───────────────────────── Progreso del usuario ─────────────────────────
create table user_skills (
  user_id      uuid not null references users (id) on delete cascade,
  skill_id     bigint not null references skill_nodes (id) on delete cascade,
  unlocked_at  timestamptz not null default now(),
  primary key (user_id, skill_id)
);

-- Hojas de ruta importadas desde PDF (contenido del usuario, no catálogo).
create table pdf_imports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  file_sha256  text not null,
  file_bytes   bytea,                                   -- en producción: objeto en S3/R2 y aquí solo la clave
  status       text not null default 'queued' check (status in ('queued', 'parsing', 'done', 'failed')),
  attempts     smallint not null default 0,
  error        text,
  roadmap_id   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, file_sha256)
);
create index pdf_imports_queue_idx on pdf_imports (created_at) where status = 'queued';

create table roadmaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  content_key  text not null,                           -- hash del parser: misma guía = misma misión
  title        text not null,
  subtitle     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, content_key)
);

create table roadmap_phases (
  id          uuid primary key default gen_random_uuid(),
  roadmap_id  uuid not null references roadmaps (id) on delete cascade,
  n           smallint not null,
  title       text not null,
  meta        text not null default '',
  hours_est   real not null default 0,
  weeks       text not null default '',
  prompt      text not null default '',
  fields      jsonb not null default '[]',
  unique (roadmap_id, n)
);

create table roadmap_tasks (
  id        uuid primary key default gen_random_uuid(),
  phase_id  uuid not null references roadmap_phases (id) on delete cascade,
  task_key  text not null,                              -- id estable derivado del texto: reimportar no pierde progreso
  text      text not null,
  tag       text not null,
  family    text not null check (family in ('build', 'claude', 'create', 'test')),
  position  smallint not null,
  unique (phase_id, task_key)
);

create table user_task_progress (
  user_id     uuid not null references users (id) on delete cascade,
  task_id     uuid not null references roadmap_tasks (id) on delete cascade,
  done_at     timestamptz not null default now(),
  xp_awarded  integer not null,
  primary key (user_id, task_id)
);
create index user_task_progress_recent_idx on user_task_progress (user_id, done_at desc);

-- La recompensa de material se entrega una sola vez por tarea, aunque se desmarque y se vuelva a marcar.
create table task_reward_ledger (
  user_id  uuid not null references users (id) on delete cascade,
  task_id  uuid not null references roadmap_tasks (id) on delete cascade,
  primary key (user_id, task_id)
);

create table user_phase_progress (
  user_id        uuid not null references users (id) on delete cascade,
  phase_id       uuid not null references roadmap_phases (id) on delete cascade,
  started_at     timestamptz,
  done_at        timestamptz,
  hours_logged   real not null default 0,
  xp_awarded     integer not null default 0,
  primary key (user_id, phase_id)
);

-- ───────────────────────── Inventario y cosméticos ─────────────────────────
create table items (
  id     text primary key check (id ~ '^[a-z0-9_]{1,40}$'),
  kind   text not null check (kind in ('material', 'food', 'jewel', 'cosmetic')),
  name   text not null,
  slot   text check (slot in ('head', 'face', 'neck', 'joya', 'base', 'aura')),
  infinite boolean not null default false,                -- el agua nunca se acaba
  effect jsonb not null default '{}'                      -- comidas: {cure:[...], boost:{hp,mp,sta}} · joyas: {perk}
);

create table user_inventory (
  user_id  uuid not null references users (id) on delete cascade,
  item_id  text not null references items (id),
  qty      integer not null check (qty >= 0),
  primary key (user_id, item_id)
);

create table user_equipment (
  user_id  uuid not null references users (id) on delete cascade,
  slot     text not null,
  item_id  text not null references items (id),
  primary key (user_id, slot)
);

-- ───────────────────────── Crafteo ─────────────────────────
-- "key" = ingredientes ordenados + proceso (p. ej. 'cobre+estano|fundir'): buscar una receta es una lectura por índice único.
create table recipes (
  id           bigint generated always as identity primary key,
  key          text not null unique,
  process      text not null check (process in ('frio', 'calentar', 'hornear', 'fundir', 'forjar')),
  kind         text not null check (kind in ('mat', 'food', 'exp', 'jewel')),
  output_item  text references items (id),                -- null para experimentos (se ven y se acaban)
  output_name  text not null,
  fact         text not null                              -- dato real que se muestra AL DESCUBRIR, nunca antes
);

create table recipe_ingredients (
  recipe_id  bigint not null references recipes (id) on delete cascade,
  item_id    text not null references items (id),
  qty        smallint not null default 1 check (qty > 0),
  primary key (recipe_id, item_id)
);

create table user_discoveries (
  user_id        uuid not null references users (id) on delete cascade,
  recipe_id      bigint not null references recipes (id) on delete cascade,
  discovered_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- Registro de crafteo: solo se agrega. Particionado por mes para que crezca sin degradar.
create table craft_log (
  id          bigint generated always as identity,
  user_id     uuid not null,
  recipe_id   bigint,
  input_key   text not null,
  success     boolean not null,
  created_at  timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create index craft_log_user_idx on craft_log (user_id, created_at desc);
-- Partición por defecto; un job mensual crea las particiones con nombre (craft_log_2026_10, …).
create table craft_log_default partition of craft_log default;
