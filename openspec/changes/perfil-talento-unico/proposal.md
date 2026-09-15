## Why

`perfil-dual-talento-creador` resolvió la fricción de tener que elegir un rol único para siempre, pero dejó dos perfiles *personales* paralelos (`perfiles_talento` y `perfiles_creador`, cada uno con su propio nombre, foto, ubicación y descripción). En la práctica casi toda cuenta termina con los dos ([[cuentas-doble-rol]]), y cada superficie que muestra "quién es esta persona" tiene que decidir cuál de los dos mostrar — hoy se resuelve a mano con `coalesce(t.nombre, c.nombre)` en varios lugares, lo que ya generó al menos un bug conocido (#140) y va a seguir generando inconsistencias cada vez que se agregue una superficie nueva que muestre una identidad.

El issue #175 lo nombra bien: el Perfil de Talento es la carta de presentación *de la persona*; ser Creador no es una segunda identidad, es una función (crear y gestionar Proyectos o Equipos, buscar Talentos, convocar). Esta propuesta saca esa distinción del código disperso y la deja en el modelo: una sola identidad personal, un rol operativo aparte.

## What Changes

- **BREAKING**: `perfiles_creador` deja de tener campos de identidad personal (`nombre`, `imagen_url`, `descripcion`, `locacion`/ubicación). Pasa a ser una fila de "capacidad de Creador" activada por cuenta, sin datos propios de presentación — la identidad de quien la usa sale siempre de `perfiles_talento`.
- **BREAKING**: toda superficie que hoy muestra "el Creador de este Proyecto/Equipo" (placa de perfil desde una tarjeta, `feed_talento`, notificaciones, salas) pasa a mostrar el Perfil de Talento del dueño, no un perfil de Creador separado.
- El onboarding (`elegir-rol`, `completar-perfil`) deja de ofrecer "sólo Creador" como alta inicial: **todo perfil se crea como Talento primero**; convertirse en Creador (crear un Proyecto o Equipo) deja de pedir un formulario de identidad — sólo pide lo operativo (título, roles/cupo, etc., que ya existe).
- **Backfill de datos**: las cuentas que hoy sólo tienen `perfiles_creador` (sin `perfiles_talento`) reciben un Perfil de Talento generado a partir de los datos que ya cargaron como Creador (nombre, foto, ubicación), para no perder su obra/equipo publicado ni forzarles un dato que ya dieron.
- El conmutador de modo (Talento ↔ Creador) deja de leerse como "cambiar de identidad" y pasa a leerse como "cambiar de experiencia/espacio de trabajo" — la cabecera con nombre y foto no cambia al conmutar, sólo cambia qué se puede hacer.
- Se elimina el componente y el flujo que arman/editan un "perfil de Creador" como si fuera una persona (`placa-perfil-creador`, el formulario de identidad de Creador); lo que quede operativo de Creador (tipo de creador, si se conserva) se mueve a configuración de la cuenta, no a un perfil.

## Capabilities

### Modified Capabilities

- `perfil-dual`: dos perfiles personales paralelos pasa a ser un perfil personal único (Talento) más un rol operativo (Creador) sin identidad propia; el conmutador de modo cambia de significado (experiencia, no identidad).
- `auth-onboarding`: el alta inicial deja de poder crear una cuenta "sólo Creador" con su propio formulario de identidad — toda cuenta nueva arranca por el Perfil de Talento.

## Impact

**Código afectado**: `elegir-rol`, `completar-perfil` (y su contraparte de alta del segundo perfil), el conmutador de modo, `placa-perfil-creador` (se retira o se reemplaza por `placa-perfil-talento`), toda superficie que hoy arma una identidad desde `perfiles_creador` (tarjetas de feed, matches, salas, notificaciones, `metricas`/paneles del tablero si muestran nombre/foto del dueño), y cualquier lugar con el patrón `coalesce(t.nombre, c.nombre)`.

**Base de datos**: migración que (1) genera `perfiles_talento` para las cuentas Creador-sin-Talento existentes a partir de sus datos de `perfiles_creador`, (2) elimina las columnas de identidad de `perfiles_creador` (`nombre`, `imagen_url`, `descripcion`, ubicación), (3) actualiza `feed_talento` y cualquier vista/función que hoy joinee `perfiles_creador` para la identidad, para que la resuelvan desde `perfiles_talento`. Es una migración con pérdida de columnas (no de personas): hace falta decidir, antes de aplicarla, si algún dato de `perfiles_creador` que no tenga equivalente en `perfiles_talento` (p. ej. `tipo` de creador) se conserva en otro lado o se descarta.

**Riesgos**:
- Al momento de esta propuesta hay 7 cuentas en producción, 1 de ellas Creador-sin-Talento con una obra publicada — el backfill tiene que probarse contra esa cuenta real antes de aplicarse.
- Cambiar qué perfil resuelve la identidad en `feed_talento` y afines toca vistas que están en producción activa (el circuito de match); cualquier regresión ahí es visible para usuarios reales de inmediato.
- Es una propuesta de arquitectura de identidad, no una implementación menor: antes de tocar código hace falta que el product owner confirme el criterio de backfill y qué pasa con `perfiles_creador.tipo` (ver design.md).
