## 1. Base de datos — backfill (aditivo)

- [x] 1.1 Migración A (`0071_backfill_talento_desde_creador.sql`): `fecha_nacimiento` pasa a nullable; inserta el Talento que falta (`nombre`/ubicación/`genero='sin_especificar'`) y migra la foto de perfil a `fotos_talento`. Probado en `begin/rollback` contra prod.
- [x] 1.2 Aplicada a prod (Management API + registrada en `supabase_migrations.schema_migrations`) y confirmado a mano que `2a4dbf6d-…` ("Natalia") tiene ahora un Perfil de Talento visible con los datos migrados.

## 2. Lectura de identidad — mover de `perfiles_creador` a `perfiles_talento`

- [x] 2.1 `feed_talento`/`feed_equipos_para_talento` (0072): joinean `perfiles_talento`; la foto pasa a `creador_foto_path` (ruta de Storage, resuelta a URL en la app, igual que las demás fotos). Requirió `drop`+`create` (renombrar columna de vista/función no lo permite `create or replace`). Agregó 0073: política RLS nueva en `perfiles_talento` para que cualquiera pueda ver el perfil de quien es dueño de un Proyecto publicado o Equipo activo (el mismo alcance que tenía `perfil_creador_select_publico`, no abierto a cualquier Talento). Probado en rollback y aplicado a prod.
- [x] 2.2 `tarjeta-rol.tsx`/`tarjeta-equipo.tsx`: usan `PlacaPerfilTalento` en vez de `PlacaPerfilCreador`. `panel-admin.tsx` enlaza a `/talentos/[id]` en vez de `/creadores/[id]`. (`creadores/[id]/page.tsx` y `placa-perfil-creador.tsx` quedan pendientes de borrar junto con el resto de Grupo 4, ya no tienen usos.)
- [x] 2.3 `salas/[id]/page.tsx`: se elimina la consulta separada a `perfiles_creador` — el Creador ya es miembro de su propia sala, así que la misma consulta a `perfiles_talento` ya lo trae; "Director/a" se decide comparando `obra.creador_id`.
- [x] 2.4 `notificaciones/page.tsx`/`lista-notificaciones.tsx`: la foto del proyecto se resuelve aparte (no hay FK de `obras` a `perfiles_talento` para pedirla embebida) y se manda ya resuelta como `proyecto_foto_url`.
- [x] 2.5 `acciones-push.ts`: el remitente sale sólo de `perfiles_talento` (se saca el `?? creador?.nombre`, ya no hace falta).
- [x] 2.6 `cuenta-servidor.ts`: revisado — sólo cuenta existencia de fila (`count`) para el gate de onboarding, no expone nombre/foto. Sin cambios necesarios acá (sí los necesita el Grupo 3, que reutiliza esta función).
- [x] 2.7 admin (0074): `admin_usuarios` deja de concatenar "Talento / Creador" (con una sola identidad posible ya no hace falta distinguir); `admin_publicaciones`, `admin_denuncias`, `admin_bloqueos` resuelven nombre desde `perfiles_talento`, sacando el `coalesce(t.nombre, c.nombre)` (mismo patrón que #140). Probado en rollback y aplicado a prod.
- [x] 2.8 Grep final: no queda ningún `coalesce(t.nombre, c.nombre)`. Quedan referencias a `perfiles_creador` sólo en lo que falta del Grupo 4 (`perfil/page.tsx`, `formulario-creador.tsx`, `creadores/[id]/page.tsx`, `placa-perfil-creador.tsx`) y en `cuenta-servidor.ts`/`types.ts` (legítimo, ver 2.6).

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
