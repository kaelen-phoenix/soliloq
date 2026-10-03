# Tests de base

Tests SQL que se corren **contra la base** (hoy, prod) dentro de `begin` / `rollback`:
no dejan rastro. Si el `select` final devuelve el "OK" y el HTTP es 201, pasaron todas
las aserciones (`assert` de plpgsql). Un fallo aborta con el mensaje del `assert`.

## Correr

```
supabase/tests/run.sh                       # todos los *.sql
supabase/tests/run.sh match_convocatoria.sql
```

Token: `$SUPABASE_ACCESS_TOKEN` si está seteado, si no `~/.soliloq-deploy/supabase-token.txt`.

## En CI

El job `db-tests` de `.github/workflows/ci.yml` los corre cuando un PR toca `supabase/`.
Necesita el **secret `SUPABASE_ACCESS_TOKEN`** (un PAT de cuenta de Supabase,
`supabase.com/dashboard/account/tokens`). Sin el secret, el job termina OK sin correr nada.

## Qué cubre

- **`match_convocatoria.sql`** — el circuito de #105–#107 (migraciones 0054–0057):
  interés mutuo → match (vence 7 días) → convocar → aceptar → sala → cierre por cupo →
  dar de baja libera cupo. Más: RLS de `intereses_match` (solo lo propio), rate-limit de
  20 «Me interesa» / 24 h, y la guarda de dueño en `desvincularme_de_sala`.
- **`rls_y_borrados.sql`** — `obras_delete_propia` (0049), RLS de `chats_destacados` (0053)
  y `push_suscripciones` (0050, incl. que no se pueda apropiar un `endpoint` ajeno),
  `edad_visible` (0052) en `perfil_publico` y `buscar_talento` (prioriza, no excluye), y
  la cascada de `delete from auth.users` (lo que hace `auth.admin.deleteUser`).
- **`normas_comunidad.sql`** — aceptación de las Normas de la Comunidad (0079, #180): una
  cuenta nueva nace con `normas_aceptadas_en` en null, el propio usuario puede marcarla
  (mismo `update` que usa la server action `aceptarNormas()`), y un tercero no puede tocar
  la aceptación ajena (RLS de `perfiles_update_propio`).
- **`salas_no_leidos.sql`** — mensajes sin leer en Salas (0082, #216): `salas_no_leidas`
  cuenta solo lo de otros posterior a `leido_hasta` (o a `incorporado_en` si nunca abrió la
  sala), `marcar_sala_leida` toca solo la marca propia y no suma a un ajeno a la sala, y un
  bloqueo saca los mensajes del conteo (la función es SECURITY INVOKER a propósito).
- **`borrar_iniciativa.sql`** — eliminar un Proyecto o un Equipo (#215, 0083): mientras
  existe, `buscar_talento` no muestra al Talento convocado; al borrarlo vuelve a aparecer, y
  la sala (con sus mensajes) se va con la iniciativa — también la de un Equipo, que antes
  quedaba huérfana. Un Creador no puede borrar el Equipo de otro, y borrar una iniciativa no
  toca las demás ni el perfil del Talento.
- **`contactar_equipo.sql`** — «Contactar» entre personas y la sala 1:1 (#101, #241, 0085):
  `nombre_de_perfil`, `feed_equipo`, `perfil_para_responder` y la sala que abre el trigger
  `al_marcar_interes` cuando el interés es mutuo.
- **`funciones_validas.sql`** — re-crea cada función `language sql` de `public` (en la
  transacción que se descarta) y falla si alguna no compila contra las tablas de hoy. Una
  función SQL no se revalida cuando se borra una columna que usa: así quedaron rotas tres
  con 0077 (#241) sin que nadie se enterara.
- **`limite_contacto.sql`** — tope del formulario de contacto de «Apoyar» (#252, 0087):
  como anon, 3 mensajes por email por hora (sin importar mayúsculas), el 4.º se rechaza con
  `demasiados_mensajes`, otro email sigue pasando, 60 en la hora cortan a todos, y lo de
  hace más de una hora no cuenta.
- **`columnas_protegidas.sql`** — nadie se hace admin ni se aprueba solo (#257, 0088): como
  `authenticated`, `update` de `es_admin`, `aprobado_en`, `suspendido_en` o `creado_en` sobre la
  fila propia falla con `columna_protegida`; el resto de lo propio se sigue editando, y
  `admin_aprobar_usuario` / `admin_suspender_usuario` siguen andando.
- **`datos_privados_talento.sql`** — fecha de nacimiento y ubicación exacta privadas (#255, 0089):
  otra cuenta no puede leer `fecha_nacimiento`, `ubicacion_texto`, `ubicacion_place_id` ni las
  coordenadas (ni con `select *`); `edad_publica` da la edad solo si es visible;
  `buscar_talento` sigue filtrando por texto, edad y radio y respeta «Aparecer en el buscador»;
  `mi_perfil_talento()` trae la fila propia entera; `feed_para_talento` solo para uno mismo.
- **`ocultar_perfil.sql`** — «Ocultar mi perfil a personas nuevas» (#265, 0090): para alguien
  nuevo, quien se ocultó no sale en «Armar equipo», el buscador ni su enlace; no se la puede
  contactar ni marcarle interés como talento (sí interesarse en su Proyecto); quien comparte
  sala la sigue viendo; si vuelve a mostrarse se ve; y si ella escribe primero, se le responde.
- **`avisos_acceso.sql`** — avisos de acceso en la campanita (#247, #248, 0092): cada admin activo
  (no los suspendidos) recibe `solicitud_acceso` por quien se registra sin invitación; quien
  llega invitado no genera avisos; aprobar o invitar a alguien pendiente le deja
  `acceso_habilitado` (una sola vez) y marca leída su solicitud; el push nace sin marcar.
- **`perfil_publico_sin_redes.sql`** — redes del enlace público (0095, 0097): sin sesión o con la
  cuenta incompleta, `perfil_publico` las devuelve vacías (y sin sesión la columna no se lee); con
  cuenta completa, sí. Nadie puede contactar ni insertar un contacto (sin chat de dos personas).

- **`convocar_en_un_paso.sql`** — convocar sin «aceptar el match» (#287, 0098): `convocar` acepta el
  match solo y deja la convocatoria pendiente con su aviso; un match vencido o descartado no se convoca.

## Pendiente

Falta un runner en CI (hoy es manual con el PAT) y E2E de navegador para los flujos de UI.
