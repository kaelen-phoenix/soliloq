## Context

El prototipo está desplegado y funcionando en `https://soliloq-one.vercel.app` con el modelo de un rol por cuenta. Ese modelo ya se rompió en la primera prueba de uso real, y no por un caso de borde: en teatro independiente la misma persona actúa y dirige.

La restricción clave es que **ya hay datos en producción** — cuentas creadas, un perfil de talento completo. Cualquier cambio de esquema tiene que ser aditivo y dejar esas cuentas funcionando sin intervención manual.

## Goals / Non-Goals

**Goals:**
- Una cuenta puede tener perfil de Talento, de Creador, o los dos.
- La app abre en el último modo que la persona usó.
- Conmutar de modo es una acción de un toque, visible, sin cerrar sesión.
- El segundo perfil se crea cuando hace falta, no en el onboarding.
- Nadie se postula a su propia obra.
- Migración sin backfill destructivo ni pérdida de datos.

**Non-Goals:**
- Un tercer tipo de perfil, o perfiles múltiples del mismo tipo (una persona con dos compañías).
- Compartir datos entre perfiles (que el nombre del talento autocomplete el del creador). Son fichas independientes a propósito: el nombre artístico y el de la compañía no tienen por qué coincidir.
- Ver la app en ambos modos a la vez (vista combinada, bandeja unificada). El modo activo es excluyente.
- Migrar cuentas duplicadas preexistentes (alguien que ya se hizo dos cuentas con dos emails) a una sola.

## Decisions

### `perfiles.rol` se conserva, pero cambia de significado

En lugar de borrar la columna —lo que rompería las cuentas existentes— pasa a registrar **con qué rol arrancó** la persona. Deja de ser la fuente de verdad sobre qué puede hacer.

La verdad pasa a ser **la existencia de las filas** `perfiles_talento` y `perfiles_creador`. Es un dato que ya está en la base, no requiere backfill y no puede desincronizarse: si existe la ficha, el perfil existe.

*Alternativa descartada:* dos booleanos `es_talento` / `es_creador` en `perfiles`. Sería estado duplicado que hay que mantener en sincronía con las tablas de perfil, y toda desincronización es un bug silencioso.

### Modo activo como columna nueva, con default derivable

Se agrega `perfiles.modo_activo` (`talento` | `creador`, nullable). La migración la inicializa con el valor de `rol`, así las cuentas existentes abren donde ya estaban.

Si el modo activo apunta a un perfil que no existe (estado imposible por la UI, pero alcanzable si alguien manipula la base), el sistema lo corrige al perfil que sí existe en lugar de fallar. Es una decisión deliberada: preferimos degradar antes que dejar a alguien fuera de su cuenta.

### El onboarding se evalúa por perfiles existentes, no por rol

El middleware es el punto más delicado de este cambio: es donde nacen los bucles de redirección. La lógica queda expresada como una sola pregunta ordenada:

1. ¿Sin sesión? → `/ingresar`
2. ¿Sin `rol` elegido? → `/elegir-rol`
3. ¿Sin ningún perfil creado? → `/completar-perfil` (o `/elegir-rol`, que sigue permitido para corregir)
4. Con al menos un perfil → acceso normal, en el modo activo

El paso 3 reemplaza al viejo `onboarding_completo`. La columna se conserva por compatibilidad pero deja de gobernar el flujo: se deriva de "existe al menos un perfil".

### La exclusión de obras propias vive en la función SQL del feed

`feed_para_talento` suma un `and f.creador_id <> p_talento_id`. Como el id del perfil de talento y el del creador son **el mismo uuid** (ambos referencian `perfiles.id`), la comparación es directa y no necesita joins extra.

El bloqueo de la postulación se refuerza en el trigger `validar_alta_postulacion`, no solo en el feed: el feed es la UI, el trigger es la garantía.

### El conmutador vive en el encabezado, no enterrado en el perfil

Si conmutar de modo es difícil de encontrar, la persona va a creer que la app perdió sus obras. Va en el encabezado, junto a la campanita, mostrando siempre en qué modo está.

## Risks / Trade-offs

**Bucles de redirección en el middleware** → El riesgo real de este cambio. Se mitiga con una única función de decisión, ordenada y sin ramas cruzadas, y una tarea de verificación explícita que recorre los cuatro estados posibles de cuenta.

**Confusión de modo**: alguien en modo `creador` no ve sus postulaciones y cree que se perdieron → El encabezado indica el modo activo de forma permanente, y los estados vacíos mencionan el otro modo cuando corresponde.

**El id compartido entre `perfiles_talento` y `perfiles_creador`** hace que una persona sea "su propio creador" en las queries → Es justamente lo que permite la comparación directa para excluir obras propias, pero exige revisar las políticas RLS de visibilidad de perfil: un creador ve el perfil del talento que se postuló a su obra, y ahora ese talento podría ser él mismo. No genera filtración (ve sus propios datos), pero conviene confirmarlo.

**Cuentas ya existentes** → La migración inicializa `modo_activo` desde `rol`, así que abren exactamente donde estaban. Sin acción manual.

## Migration Plan

1. Migración aditiva: agregar `modo_activo` inicializada con el valor de `rol`.
2. Migración de la función `feed_para_talento` y del trigger `validar_alta_postulacion` para excluir obras propias.
3. Desplegar el código: middleware, layout, conmutador y alta del segundo perfil.
4. Verificar los cuatro estados de cuenta en producción (sin perfiles, solo talento, solo creador, ambos).

*Rollback:* el código revierte con un redeploy del commit anterior. Las migraciones son aditivas: la columna nueva puede quedar sin uso sin romper la versión vieja, así que no hace falta revertir el esquema.

## Open Questions

- **Notificaciones entre modos**: si alguien recibe un match como talento mientras opera en modo creador, ¿el badge lo muestra igual? Se asume que **sí** —las notificaciones son de la cuenta, no del modo— y que al abrirlas se conmuta al modo que corresponda. Queda por confirmar si conviene distinguirlas visualmente por modo.
