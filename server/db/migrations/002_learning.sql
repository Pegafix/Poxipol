-- Progresión por práctica (estilo Final Fantasy II) y estado emocional del aprendiz.
-- Las habilidades y atributos suben SOLO al usarse. El nivel general (pet_state.xp_total) queda como
-- medida de constancia del compañero, pero ya no compra habilidades: skill_points deja de usarse.

-- Cuánto entrena cada habilidad a cada atributo (pesos que suman ~1).
alter table skill_nodes add column attr_weights jsonb not null default '{}';

-- Una barra de dominio por habilidad practicada. Columnas iguales para atributos (ver user_attributes).
create table user_skill_progress (
  user_id             uuid not null references users (id) on delete cascade,
  skill_id            bigint not null references skill_nodes (id) on delete cascade,
  level               smallint not null default 1 check (level between 1 and 16),
  progress            real not null default 0 check (progress >= 0),
  consolidated_level  smallint not null default 1,                -- el olvido nunca baja de aquí
  stability_days      real not null default 2,                    -- S de la curva del olvido
  last_practiced_at   timestamptz,
  gained_day          date,                                       -- para consolidar al dormir
  gained_today        real not null default 0,
  reps_today          smallint not null default 0,
  reps                integer not null default 0,
  practice_days       integer not null default 0,                 -- días distintos en que practicó
  primary key (user_id, skill_id)
);

create table user_attributes (
  user_id             uuid not null references users (id) on delete cascade,
  attr                text not null check (attr ~ '^[a-z_]{1,40}$'),
  level               smallint not null default 1 check (level between 1 and 99),
  progress            real not null default 0 check (progress >= 0),
  consolidated_level  smallint not null default 1,
  stability_days      real not null default 2,
  last_practiced_at   timestamptz,
  gained_day          date,
  gained_today        real not null default 0,
  reps_today          smallint not null default 0,
  reps                integer not null default 0,
  practice_days       integer not null default 0,
  primary key (user_id, attr)
);

-- Estado emocional como anclas: se calcula según el tiempo al leer (sin ticks).
create table learner_emotion (
  user_id        uuid primary key references users (id) on delete cascade,
  frustration    real not null default 0 check (frustration between 0 and 100),
  stamina        real not null default 100 check (stamina between 0 and 100),
  burnout_since  timestamptz,
  abandons       timestamptz[] not null default '{}',
  last_fail_at   timestamptz,
  rests_day      date,
  rests_today    smallint not null default 0,
  updated_at     timestamptz not null default now()
);

-- Cada intento queda registrado (solo se agrega). Particionado por mes como craft_log.
create table practice_log (
  id                    bigint generated always as identity,
  user_id               uuid not null,
  skill_id              bigint not null,
  outcome               text not null check (outcome in ('success', 'fail', 'abandon')),
  difficulty            smallint not null check (difficulty between 1 and 10),
  duration_min          smallint not null check (duration_min between 1 and 240),
  predicted_difficulty  smallint check (predicted_difficulty between 1 and 10),
  reflection            text check (char_length(reflection) <= 500),
  points                real not null,
  efficiency            real not null,
  source                text not null default 'manual' check (source in ('manual', 'task', 'craft')),
  created_at            timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create table practice_log_default partition of practice_log default;
create index practice_log_user_idx on practice_log (user_id, created_at desc);
