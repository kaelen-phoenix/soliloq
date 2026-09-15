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

- [x] 3.1 Se borran las rutas `/elegir-rol` y `/perfil/nuevo` enteras (no sólo la opción "Creador"): con un solo perfil personal no hay nada que elegir al empezar, y "el segundo perfil" ya no es una alta — es crear un Proyecto/Equipo. `completar-perfil` ya no redirige a `/elegir-rol` ni depende de `perfiles.rol`.
- [x] 3.2 `completar-perfil` muestra sólo `FormularioTalento`. Descubierto durante la implementación (no estaba en el design original): crear una obra/equipo exigía por FK una fila previa en `perfiles_creador`, que antes sólo se creaba en la alta que se está retirando. Se agregó 0075: las columnas de identidad de `perfiles_creador` pasan a nullable (adelantando lo que 5.2 iba a hacer para esas mismas columnas) y un trigger en `obras`/`equipos` crea la fila (sólo `id`) en el mismo insert que crea la primera iniciativa. `disciplinas`/`otro_detalle` quedan pendientes de reubicar en el Grupo 4 (`formulario-creador.tsx` todavía los edita ahí).
- [x] 3.3 `destinoSegunEstado` sólo exige `tienePerfilTalento`. `resolverEstadoCuenta`: el modo `creador` ya no exige que exista la fila (se activa sola, 0075) — sólo el modo `talento` sigue degradando al perfil que exista. `ConmutadorModo` se simplifica: con una sola identidad y el modo Creador siempre alcanzable, no hace falta la rama "falta perfil, no se puede conmutar" — siempre se puede ir y volver.
- [ ] 3.4 Verificar manualmente (o con Playwright si `e2e/flujos` ya tiene login programático): alta nueva → onboarding sólo pide Talento → crear un Proyecto activa la función de Creador sin pedir nada de identidad.

## 4. Componentes de perfil de Creador

- [x] 4.1 `formulario-creador.tsx` reescrito: sólo `disciplinas`/`otro_detalle`, sin `esAlta` (la fila ya existe siempre por el trigger de 0075, así que sólo actualiza). Se edita desde `/perfil` (ver 4.4), no como alta de un perfil.
- [x] 4.2 `perfil-creador-detalle.tsx` reescrito: sólo la sección "Perfil artístico" (disciplinas/otro_detalle), sin nombre/foto/ubicación/bio propios. `vidriera-publica.tsx`: se retira la rama `tipo`/`esTalento` — siempre muestra la identidad de Talento (nombre, edad, ubicación, género, videoreel, trayectoria, habilidades) y suma "Perfil artístico" si además hay disciplinas cargadas. Requirió reescribir la RPC `perfil_publico` (0076, drop+create: cambia de dos ramas por `modo_activo` a una sola desde `perfiles_talento` con `left join perfiles_creador` para disciplinas) — se pierden `tipo` y `biografia` (el campo de trayectoria propio de Creador, #161; mismo criterio ya aceptado para el nombre de compañía). Probado en rollback y aplicado a prod.
- [x] 4.3 `opengraph-image.tsx`: la foto y el nombre ya salen siempre de `perfiles_talento` (vía `perfil_publico`); "oficios" prioriza `habilidades` y cae a `disciplinas` si no hay ninguna cargada.
- [x] 4.4 `ConmutadorModo` reescrito sin la rama "no se puede conmutar" (ver 3.3). Se retira `placa-perfil-creador.tsx` y la ruta `/creadores/[id]` — sin usos, todo pasa por `PlacaPerfilTalento`/`/talentos/[id]`. `/perfil` (la vista propia) ya no bifurca por `modoActivo`: siempre muestra el Perfil de Talento, y suma la sección de perfil artístico (edición incluida) si la función de Creador está activa.

**Descubierto durante la implementación (fuera de la lista original):** el enlace público de booking (`perfil_publico`, issue #37/#38) también bifurcaba por identidad completa según `modo_activo` — no estaba en el alcance previsto del Grupo 4, pero es la misma clase de problema y quedó resuelto junto con 4.2.

## 5. Base de datos — drop (destructivo, al final)

- [ ] 5.1 Confirmar con `grep -rn "perfiles_creador" src/` que sólo quedan referencias a `disciplinas`/`otro_detalle` (nada de `nombre`/`imagen_url`/`descripcion`/`ubicacion_*` de esa tabla).
- [ ] 5.2 Migración B: `alter table perfiles_creador drop column nombre, drop column imagen_url, drop column descripcion, drop column ubicacion_texto, drop column ubicacion_place_id, drop column ubicacion_lat, drop column ubicacion_lng, drop column ubicacion_pais` (mantener el resto de constraints/índices que no dependan de esas columnas). Probar en `begin/rollback` contra prod primero.
- [ ] 5.3 Aplicar Migración B a prod y correr `supabase/tests/run.sh` completo para confirmar que nada quedó roto.

## 6. Verificación final

- [ ] 6.1 `tsc --noEmit`, `eslint`, `npm run build` en verde.
- [ ] 6.2 `supabase/tests/run.sh` en verde con la Migración B ya aplicada.
- [ ] 6.3 Verificar en vivo (issue relacionado #122): abrir el perfil del Creador desde una tarjeta de Proyecto/Equipo real y confirmar que muestra el Perfil de Talento del dueño, no un perfil separado.
