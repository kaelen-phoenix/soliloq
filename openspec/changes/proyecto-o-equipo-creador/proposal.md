## Why

Hoy el perfil de Creador tiene **un solo camino**: crear una obra con roles y esperar postulaciones (`convocatorias`, `obras`, `roles`). El circuito de "armar equipo" (`0033_armar_equipo.sql`, `intereses_equipo`, `busca_equipo` en `perfiles`) es una función paralela, medio escondida, que no se elige desde el perfil de Creador y que el talento casi no ve.

Producto (issue #57) pide que el Creador declare explícitamente **qué necesita**, con dos formas mutuamente excluyentes:

- **Armar proyecto** — tengo una obra/idea/producción y busco perfiles concretos (hasta 10 roles).
- **Armar equipo** — no parto de un proyecto, quiero juntar gente alrededor de una idea (sin roles; defino cuántos integrantes).

Sin esta distinción, proyectos y búsquedas de equipo se mezclan, el Creador no sabe qué cargar y el Talento no sabe a qué se está postulando.

## What Changes

- El perfil de Creador incorpora una elección **«¿Qué querés crear?» → Proyecto | Equipo**, **una sola** activa por vez (no puede tener un Proyecto y un Equipo activos simultáneamente).
- **Proyecto**: texto libre que describe la iniciativa + **hasta 10 roles**, cada uno con su campo. Mínimo **3 fotos**. Es una evolución de la obra/convocatoria actual (hoy los roles ya existen); el cambio es el tope de 10, el mínimo de fotos y que "proyecto" sea el término visible.
- **Equipo**: un **título** que explica el motivo ("Escribamos juntos"), mínimo **3 fotos**, y **cantidad de integrantes** (tope a confirmar con producto: la spec dice 6 en casi todos lados y 10 en una línea suelta). Sin roles.
- El **feed del Talento** pasa a mostrar **ambos** tipos y permite postularse a los dos. Cada publicación se identifica visualmente como Proyecto o Equipo (issue #58, se implementa junto o inmediatamente después).
- El circuito de contacto/interés se unifica: la postulación a un Proyecto (por rol) y el interés en un Equipo (por cupo) convergen en el mismo modelo de "match → sala".
- **BREAKING** (datos): `busca_equipo` / `intereses_equipo` de `0033` se replantean como el modo "Equipo" de este flujo, no como una función aparte. Hay que decidir migración vs. deprecación.

## Capabilities

### New Capabilities

- `proyecto-o-equipo`: la elección excluyente dentro del perfil de Creador entre "Armar proyecto" y "Armar equipo", con las reglas de cada formulario (roles y fotos para Proyecto; título, cupo y fotos para Equipo) y la restricción de una sola iniciativa activa.

### Modified Capabilities

- `perfil-creador`: el perfil de Creador deja de ser solo datos + obras; ahora declara qué tipo de iniciativa lleva adelante y ese estado condiciona qué puede publicar.
- `convocatorias`: la "obra con roles" se re-encuadra como "Proyecto"; se fija el tope de 10 roles y el mínimo de 3 fotos; se define cómo conviven las obras ya creadas.
- `feed-postulacion`: el feed del Talento incluye Proyectos y Equipos, con postulación a ambos y distinción visual del tipo.
- `seleccion-match`: el match y la apertura de sala tienen que cubrir el caso "Equipo" (interés por cupo, sin rol) además de "Proyecto" (postulación a rol).

## Impact

**Producto — decisiones abiertas antes de implementar:**
1. **Tope de integrantes del Equipo**: 6 (dominante en la spec) vs. 1–10 (una línea). Bloqueante.
2. **`0033_armar_equipo`**: ¿se migran `intereses_equipo` / `busca_equipo` al modelo nuevo, o se deprecan y se rehace? Afecta si hay pérdida de datos.
3. **Obras existentes**: ¿toda obra pasa a ser "Proyecto" automáticamente? ¿Qué obra queda "activa" si un creador tiene varias?
4. **"Una sola iniciativa activa"**: ¿qué pasa con los proyectos/obras históricos de un creador — se archivan, o "activa" es un flag por publicación?

**Código**: alta y edición del perfil de Creador (`src/components/perfil/*`, `src/app/(app)/perfil`, `elegir-rol`), alta de obra/proyecto (`src/app/(app)/obras/nueva`, `src/components/convocatorias/*`), el feed del talento y su RPC (`feed_para_talento`, `src/components/feed/*`), el circuito de armar equipo (`src/components/equipo/*`, `src/app/(app)/equipo`), la tarjeta del feed (`tarjeta-rol.tsx`), y `seleccion-match`.

**Base de datos**: nuevo estado tipo-de-iniciativa en el perfil de Creador (o tabla de "iniciativa activa"); tabla/columnas para el Equipo (título, cupo); tope de 10 roles a nivel constraint; revisión de `0033`. Migraciones probablemente **no** todas aditivas — de ahí la decisión (2).

**Se relaciona con**: #58 (distinción visual Proyecto/Equipo), #59 (los colores rojo/naranja de esa distinción salen de la marca nueva).
