-- 0100 — Tope de usos de IA (#313).
--
-- «✨ Mejorar redacción» llama a un modelo pago por uso (Claude Haiku por Vercel AI Gateway).
-- Cada llamada se anota acá antes de hacerla; pasado el tope se rechaza. Dos topes:
--   - por persona: 10 por día (para pulir un texto alcanza y sobra);
--   - global: 500 por día (un techo de gasto aunque muchas cuentas se pongan a usarlo).
-- La tabla no tiene policies: la única puerta es `consumir_uso_ia()`.

create table if not exists usos_ia (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references perfiles (id) on delete cascade,
  creado_en timestamptz not null default now()
);

create index if not exists idx_usos_ia_perfil_creado on usos_ia (perfil_id, creado_en desc);
create index if not exists idx_usos_ia_creado on usos_ia (creado_en desc);

alter table usos_ia enable row level security;
revoke all on usos_ia from anon, authenticated;

create or replace function public.consumir_uso_ia()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;

  -- Serializa: sin esto, pedidos en paralelo contarían lo mismo antes de insertar.
  perform pg_advisory_xact_lock(hashtext('consumir_uso_ia'));

  if (select count(*) from usos_ia
      where perfil_id = auth.uid() and creado_en > now() - interval '1 day') >= 10 then
    raise exception 'limite_ia_persona';
  end if;
  if (select count(*) from usos_ia where creado_en > now() - interval '1 day') >= 500 then
    raise exception 'limite_ia_global';
  end if;

  insert into usos_ia (perfil_id) values (auth.uid());
end;
$$;

revoke all on function public.consumir_uso_ia() from public, anon;
grant execute on function public.consumir_uso_ia() to authenticated;
