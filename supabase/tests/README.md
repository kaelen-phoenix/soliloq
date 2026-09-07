# Tests de base

Tests SQL que se corren **contra la base** (hoy, prod) dentro de `begin` / `rollback`:
no dejan rastro. Si el `select` final devuelve el "OK" y el HTTP es 201, pasaron todas
las aserciones (`assert` de plpgsql). Un fallo aborta con el mensaje del `assert`.

## Correr

Con el PAT de Supabase (`~/.soliloq-deploy/supabase-token.txt`), ver `run.sh`:

```
supabase/tests/run.sh match_convocatoria.sql
```

O a mano: `POST /v1/projects/<ref>/database/query` con `{"query": "<contenido del .sql>"}`.

## Qué cubre

- **`match_convocatoria.sql`** — el circuito de #105–#107 (migraciones 0054–0057):
  interés mutuo → match (vence 7 días) → convocar → aceptar → sala → cierre por cupo →
  dar de baja libera cupo. Más: RLS de `intereses_match` (solo lo propio), rate-limit de
  20 «Me interesa» / 24 h, y la guarda de dueño en `desvincularme_de_sala`.
- **`rls_y_borrados.sql`** — `obras_delete_propia` (0049), RLS de `chats_destacados` (0053)
  y `push_suscripciones` (0050, incl. que no se pueda apropiar un `endpoint` ajeno),
  `edad_visible` (0052) en `perfil_publico` y `buscar_talento` (prioriza, no excluye), y
  la cascada de `delete from auth.users` (lo que hace `auth.admin.deleteUser`).

## Pendiente

Falta un runner en CI (hoy es manual con el PAT) y E2E de navegador para los flujos de UI.
