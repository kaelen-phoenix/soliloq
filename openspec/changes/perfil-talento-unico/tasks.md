## 1. Base de datos — backfill (aditivo)

- [ ] 1.1 Migración A: `insert into perfiles_talento (...) select ... from perfiles_creador c where not exists (select 1 from perfiles_talento t where t.id = c.id)`, mapeando `nombre`/`imagen_url`/`ubicacion_*` y dejando en default los campos propios de Talento sin equivalente (`fecha_nacimiento`, `genero`, `habilidades`, `experiencia`). Probar en `begin/rollback` contra prod y verificar que devuelve exactamente 1 fila nueva (la cuenta Creador-sin-Talento real).
- [ ] 1.2 Aplicar Migración A a prod (Management API + registrar en `supabase_migrations.schema_migrations`, mismo procedimiento que 0061/0070) y confirmar a mano que la cuenta `2a4dbf6d-…` ("Natalia") tiene ahora un Perfil de Talento visible con los datos migrados.

## 2. Lectura de identidad — mover de `perfiles_creador` a `perfiles_talento`

- [ ] 2.1 `feed_talento` (vista): cambiar el join de `perfiles_creador` a `perfiles_talento` para `creador_nombre`/`creador_imagen_url`. Verificar con `supabase/tests/match_convocatoria.sql` en rollback antes de aplicar.
- [ ] 2.2 `src/app/(app)/creadores/[id]/page.tsx` y `placa-perfil-creador.tsx`: dejar de resolver contra `perfiles_creador`; abrir `placa-perfil-talento` con el mismo `id` del dueño. Actualizar todos los puntos que hoy abren la placa de Creador (tarjetas de feed, Matches, Convocados) para que abran la de Talento.
- [ ] 2.3 `src/app/(app)/salas/[id]/page.tsx`: el nombre/foto del integrante Creador en la sala sale de `perfiles_talento`, no de `perfiles_creador`.
- [ ] 2.4 `src/app/(app)/notificaciones/page.tsx` y `lista-notificaciones.tsx`: cualquier nombre/foto de Creador mostrado en una notificación sale de `perfiles_talento`.
- [ ] 2.5 `src/app/acciones-push.ts`: el nombre usado en el cuerpo de una notificación push sale de `perfiles_talento`.
- [ ] 2.6 `src/lib/cuenta-servidor.ts`: revisar si arma o expone datos de identidad de `perfiles_creador` (nombre/foto) y, si es así, resolverlos desde `perfiles_talento`.
- [ ] 2.7 Buscador de talento / admin (`0040_admin.sql`, `0062_admin_mas_completo.sql` y su UI): el nombre mostrado para una cuenta con función de Creador sale de `perfiles_talento`.
- [ ] 2.8 Grep final de `coalesce(t.nombre, c.nombre)` (y variantes con `imagen_url`/`ubicacion`) en `src/` y `supabase/migrations/`: no debería quedar ninguno — la identidad ya no es ambigua.

## 3. Onboarding

- [ ] 3.1 `elegir-rol`: retirar la opción de elegir "sólo Creador" como alta inicial; el primer ingreso va directo al alta del Perfil de Talento (ver spec `auth-onboarding` — REMOVED "Elección de rol en el onboarding").
- [ ] 3.2 `completar-perfil` / `perfil/nuevo`: retirar el flujo de alta de un "perfil de Creador" con sus propios campos de identidad (nombre, foto, ubicación, descripción). Lo único que queda de `perfiles_creador` (`disciplinas`/`otro_detalle`) se edita desde donde tenga sentido (configuración de la cuenta o al crear el primer Proyecto/Equipo), no como alta de un perfil.
- [ ] 3.3 `middleware`/`leerEstadoCuenta` (gate de onboarding, ver memoria `middleware-no-corre`): el onboarding se considera completo con el Perfil de Talento creado, sin depender de si existe fila en `perfiles_creador`.
- [ ] 3.4 Verificar manualmente (o con Playwright si `e2e/flujos` ya tiene login programático): alta nueva → onboarding sólo pide Talento → crear un Proyecto activa la función de Creador sin pedir nada de identidad.

## 4. Componentes de perfil de Creador

- [ ] 4.1 `formulario-creador.tsx`: retirar los campos de identidad (`nombre`, `imagen_url`, `descripcion`, `ubicacion_*`); conservar sólo `disciplinas`/`otro_detalle`, reubicados donde corresponda tras 3.2.
- [ ] 4.2 `perfil-creador-detalle.tsx` y `vidriera-publica.tsx`: nombre/foto/ubicación/bio se leen de `perfiles_talento`; `disciplinas`/`otro_detalle` se muestran como atributo adicional de esa misma identidad, no como una tarjeta aparte.
- [ ] 4.3 `src/app/p/[token]/opengraph-image.tsx`: la imagen del enlace público usa la identidad de `perfiles_talento`.
- [ ] 4.4 `ConmutadorModo`: revisar copy/labels para que se lean como "espacio de trabajo" y no como "quién sos" (el encabezado con nombre/foto ya no cambia al conmutar — confirmar que no hace falta tocar el componente, sólo el texto si asume lo contrario).

## 5. Base de datos — drop (destructivo, al final)

- [ ] 5.1 Confirmar con `grep -rn "perfiles_creador" src/` que sólo quedan referencias a `disciplinas`/`otro_detalle` (nada de `nombre`/`imagen_url`/`descripcion`/`ubicacion_*` de esa tabla).
- [ ] 5.2 Migración B: `alter table perfiles_creador drop column nombre, drop column imagen_url, drop column descripcion, drop column ubicacion_texto, drop column ubicacion_place_id, drop column ubicacion_lat, drop column ubicacion_lng, drop column ubicacion_pais` (mantener el resto de constraints/índices que no dependan de esas columnas). Probar en `begin/rollback` contra prod primero.
- [ ] 5.3 Aplicar Migración B a prod y correr `supabase/tests/run.sh` completo para confirmar que nada quedó roto.

## 6. Verificación final

- [ ] 6.1 `tsc --noEmit`, `eslint`, `npm run build` en verde.
- [ ] 6.2 `supabase/tests/run.sh` en verde con la Migración B ya aplicada.
- [ ] 6.3 Verificar en vivo (issue relacionado #122): abrir el perfil del Creador desde una tarjeta de Proyecto/Equipo real y confirmar que muestra el Perfil de Talento del dueño, no un perfil separado.
