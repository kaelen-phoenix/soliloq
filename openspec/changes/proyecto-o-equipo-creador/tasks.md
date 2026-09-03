## 0. Decisiones de producto (bloqueantes)

- [ ] 0.1 Confirmar tope de integrantes de un Equipo (6 vs. otro).
- [ ] 0.2 Confirmar qué se hace con `0033` (`intereses_equipo` / `busca_equipo`): migrar o rehacer.
- [ ] 0.3 Confirmar tratamiento de obras existentes (todas → Proyecto; concepto de "activa").
- [ ] 0.4 Confirmar dónde vive "iniciativa activa" y la regla de exclusión mutua.
- [ ] 0.5 Confirmar contenedor de fotos de la publicación (nueva tabla vs. reuso) y el mínimo de 3.

## 1. Base de datos

- [ ] 1.1 Migración: tabla `equipos` (creador_id, titulo, cupo con check, activo, timestamps) + RLS.
- [ ] 1.2 Migración: `obras.activa` (o mecanismo equivalente) + constraint "una sola iniciativa activa por creador" (obra activa XOR equipo activo).
- [ ] 1.3 Migración: constraint/trigger `count(roles) <= 10` por obra.
- [ ] 1.4 Migración: `fotos_obra` / `fotos_equipo` (o el mecanismo elegido en 0.5).
- [ ] 1.5 Migración: `intereses_equipo.equipo_id` nullable + FK; backfill según decisión 0.2.
- [ ] 1.6 Actualizar `feed_para_talento` a la unión Proyecto (roles) + Equipo (cupo), con `tipo_publicacion`.
- [ ] 1.7 RPC de match para Equipo: aceptar interés hasta `cupo`, abrir sala con los aceptados.
- [ ] 1.8 Regenerar `src/lib/supabase/types.ts`.

## 2. Perfil de Creador — elección

- [ ] 2.1 Pantalla/sección «¿Qué querés crear?» (Proyecto | Equipo) en el alta y edición del perfil de Creador.
- [ ] 2.2 Bloquear la segunda opción si ya hay una iniciativa activa, con mensaje claro.
- [ ] 2.3 Estado vacío del tablero de Creador según qué eligió (o si no eligió).

## 3. Formulario de Proyecto

- [ ] 3.1 Reetiquetar "obra/convocatoria" como "Proyecto" en la UI (i18n es/en).
- [ ] 3.2 Descripción libre de la iniciativa.
- [ ] 3.3 Repetidor de roles hasta 10, cada uno con su campo; validación de tope.
- [ ] 3.4 Carga de fotos con mínimo 3; bloqueo de publicación si no llega.

## 4. Formulario de Equipo

- [ ] 4.1 Campo título (con ejemplos de placeholder).
- [ ] 4.2 Selector de cantidad de integrantes (1..tope).
- [ ] 4.3 Carga de fotos con mínimo 3.
- [ ] 4.4 Sin ningún campo de roles.

## 5. Feed del Talento

- [ ] 5.1 `TarjetaRol` → `TarjetaPublicacion` con soporte para Proyecto y Equipo.
- [ ] 5.2 Badge de tipo visible (issue #58): Proyecto rojo / Equipo naranja, en tarjeta y detalle.
- [ ] 5.3 Postulación a rol de Proyecto (como hoy) y "me interesa" a Equipo (contra cupo).
- [ ] 5.4 Ajustar los estados vacíos y el `deshacer` del feed (#56) al nuevo tipo.

## 6. Match / sala

- [ ] 6.1 Proyecto: verificar que el circuito actual sigue intacto.
- [ ] 6.2 Equipo: Creador ve los interesados, acepta hasta `cupo`, se abre la sala.
- [ ] 6.3 Notificaciones para el caso Equipo.

## 7. Cierre

- [ ] 7.1 Aplicar migraciones a prod (ver memoria: PAT `sbp_` + Management API) **antes** del merge.
- [ ] 7.2 Actualizar specs principales (`openspec sync`).
- [ ] 7.3 Verificación manual: alta de Proyecto, alta de Equipo, feed del talento con ambos, match de cada uno.
- [ ] 7.4 Cerrar #57; encadenar #58 si no quedó cubierto acá.
