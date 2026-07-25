## Why

El prototipo asume que cada persona es *o* Talento *o* Creador, con el rol fijado para siempre en el onboarding. La realidad del teatro independiente es la contraria: la misma persona actúa en la obra de otro y dirige la propia, muchas veces en la misma temporada. Forzarla a mantener dos cuentas con dos emails es fricción pura y rompe la premisa de validación — si un director no puede postularse como actor, no vamos a ver si la mecánica de match funciona para el caso más común del nicho.

La primera prueba de uso ya chocó con esto: la única salida ante un rol mal elegido fue editar la base a mano.

## What Changes

- **BREAKING**: `perfiles.rol` deja de ser el rol único de la cuenta. Una persona puede tener perfil de Talento, de Creador, o los dos.
- Se agrega **modo activo** persistido por cuenta: al ingresar, la app abre en el último modo que la persona usó.
- **Conmutador de perfil** en la interfaz para alternar entre Talento y Creador sin cerrar sesión.
- El onboarding sigue pidiendo **un solo** perfil; el segundo se crea después, on demand, desde el menú de perfil.
- La navegación, la pantalla principal y las notificaciones pasan a depender del **modo activo**, no del rol de la cuenta.
- **Se bloquea la auto-postulación**: el feed excluye los roles de obras propias y el servidor rechaza la postulación de una persona a su propia obra.
- El middleware deja de derivar el onboarding del rol único y pasa a evaluar qué perfiles existen.

## Capabilities

### New Capabilities

- `perfil-dual`: coexistencia de perfil de Talento y de Creador en una misma cuenta, alta del segundo perfil on demand, modo activo persistido y conmutación entre modos.

### Modified Capabilities

- `auth-onboarding`: el rol deja de ser único e inmutable; el onboarding crea el primer perfil y el estado de completitud pasa a evaluarse contra los perfiles existentes y el modo activo.
- `feed-postulacion`: el feed excluye roles de obras propias y la postulación a una obra propia se rechaza.

## Impact

**Código afectado**: middleware de sesión y onboarding, layout de la aplicación y barra de navegación, pantalla de elección de rol, alta y edición de perfiles, página principal (feed vs. tablero) y la vista/función SQL del feed.

**Base de datos**: nueva columna de modo activo en `perfiles`, `perfiles.rol` pasa a registrar solo el rol inicial elegido, y la función `feed_para_talento` suma la exclusión de obras propias. Migraciones aditivas: no hay pérdida de datos ni necesidad de backfill destructivo — las cuentas existentes conservan su perfil y arrancan con ese modo activo.

**Riesgos**:
- La lógica de redirección del onboarding se vuelve más ramificada (dos perfiles posibles × modo activo); es el punto más propenso a bucles de redirección y necesita verificación explícita.
- Una persona con los dos perfiles ve la aplicación de forma distinta según el modo; si el conmutador no es evidente, va a parecer que la app "perdió" sus obras o sus postulaciones.
