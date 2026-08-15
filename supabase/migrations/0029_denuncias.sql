-- Denuncias de usuarios. Las normas de comunidad prometen que se puede denunciar y que cada
-- caso se analiza; hasta acá eso no existía en ninguna parte del producto. La única
-- herramienta era insertar filas a mano en `bloqueos` desde el SQL Editor.
--
-- Alcance deliberado: esto registra y notifica, no modera. No suspende cuentas ni esconde
-- contenido solo. La decisión sigue siendo humana, porque una denuncia automática que
-- silencia gente es un vector de abuso en sí mismo — basta con que varios denuncien a la
-- misma persona para callarla.

create type motivo_denuncia as enum (
  'acoso',
  'discriminacion',
  'perfil_falso',
  'estafa',
  'contenido_inapropiado',
  'convocatoria_enganosa',
  'otro'
);

create type estado_denuncia as enum ('abierta', 'en_revision', 'resuelta', 'descartada');

create table denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null references perfiles (id) on delete cascade,

  -- Sobre qué es la denuncia. Los tres son opcionales por separado pero al menos uno tiene
  -- que estar: una denuncia sin objeto no se puede revisar.
  perfil_denunciado_id uuid references perfiles (id) on delete cascade,
  obra_id uuid references obras (id) on delete cascade,
  sala_id uuid references salas (id) on delete cascade,

  motivo motivo_denuncia not null,
  detalle text check (char_length(detalle) <= 1000),

  estado estado_denuncia not null default 'abierta',
  -- Notas de quien revisa. Nunca se le muestran a nadie desde la app.
  resolucion text,
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,

  constraint denuncia_con_objeto check (
    perfil_denunciado_id is not null or obra_id is not null or sala_id is not null
  ),
  constraint denuncia_no_a_si_mismo check (
    perfil_denunciado_id is null or perfil_denunciado_id <> denunciante_id
  )
);

create index idx_denuncias_estado on denuncias (estado, creado_en desc);
create index idx_denuncias_denunciado on denuncias (perfil_denunciado_id);

-- Evita el spam de la misma denuncia repetida sobre la misma persona, sin impedir denunciar
-- a la misma persona de nuevo si el caso anterior ya se cerró.
create unique index idx_denuncia_unica_abierta
  on denuncias (denunciante_id, perfil_denunciado_id, obra_id, sala_id)
  where estado in ('abierta', 'en_revision');

alter table denuncias enable row level security;

-- Denunciar es un acto propio: nadie puede cargar una denuncia a nombre de otro.
create policy "denuncias_insert_propia" on denuncias
  for insert with check (denunciante_id = auth.uid());

-- Cada quien ve solo lo que denunció. Deliberadamente **no** hay política que le permita al
-- denunciado ver las denuncias en su contra: saber quién lo denunció es exactamente lo que
-- habilita la represalia.
create policy "denuncias_select_propia" on denuncias
  for select using (denunciante_id = auth.uid());

-- Sin políticas de update ni delete: una vez enviada, la denuncia no la toca nadie desde la
-- app. La revisión se hace con la conexión de servicio, que saltea RLS.
