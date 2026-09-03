## Contexto

El repo ya tiene **dos circuitos** que esta feature unifica bajo una sola elección:

- **Obras + roles + postulaciones** (`0001`…, `convocatorias`, `feed_para_talento`, `seleccion-match`, `sala-proyecto`). Es el camino "principal". Los roles ya existen y ya tienen tipo (`actuacion` / `tecnica`).
- **Armar equipo** (`0033_armar_equipo.sql`): `busca_equipo` (bool en `perfiles`), `intereses_equipo` (de_perfil / a_perfil / interesa), `feed_equipo`, `perfil_para_responder`. Nació como función paralela, sin "cupo" ni "título".

## Decisiones — RESUELTAS (2026-09-03, criterio de negocio)

El dueño delegó estas decisiones ("pensando en lo mejor para el negocio, tomá tus decisiones").

| # | Decisión | Resolución | Por qué |
|---|---|---|---|
| 1 | Tope de integrantes de un Equipo | **6**. La línea "1–10" de la spec se descarta. | Es el número dominante en la spec (título, contexto, impacto, criterios). Un equipo de armado inicial no necesita más; 6 mantiene la sala manejable. |
| 2 | `0033` (`intereses_equipo` / `busca_equipo`) | **Reusar `intereses_equipo`** para el match de Equipo (se le suma `equipo_id` nullable). **Nueva tabla `equipos`** (id, creador_id, titulo, cupo, activo). `busca_equipo` (bool en `perfiles`) queda deprecado: en la migración, cada `busca_equipo=true` genera un `equipos` con `cupo=6` y `titulo` placeholder editable ("Armá equipo conmigo"). | No se pierde ni un dato en prod. Reusar `intereses_equipo` evita duplicar el circuito de match/sala que ya está probado. |
| 3 | Obras existentes → Proyectos | Toda `obra` es un Proyecto. Se agrega `obras.activa boolean default true`. Un creador puede tener varias obras históricas; **una sola activa**. Al migrar, si un creador tiene >1 obra, queda activa la más reciente y el resto `activa=false`. | Cambio aditivo, sin backfill destructivo. "Activa" por publicación (no por perfil) permite archivar sin borrar. |
| 4 | ¿Dónde vive "iniciativa activa"? | **No** en `perfiles`. Un Creador tiene 0..1 obra activa **XOR** 0..1 equipo activo. La exclusión mutua se enforce **en la aplicación** en la fase 1 y con **constraint de base** (trigger) en la fase 2, junto con el feed. | Meter el trigger de una en prod, a ciegas, puede bloquear el alta de obra si la lógica falla. Se valida primero en la app corriendo. |
| 5 | Tope de 10 roles | Constraint de base `count(roles) por obra <= 10` **solo si** ninguna obra existente ya lo supera (a verificar antes de aplicar). Si alguna lo supera, se enforce solo en el form en fase 1. | — |

## Modelo de datos (propuesta, sujeta a decisiones)

```
equipos
  id            uuid pk
  creador_id    uuid fk perfiles(id)
  titulo        text  (1..80)
  cupo          int   check (cupo between 1 and 6)
  activo        boolean default true
  creado_en     timestamptz

obras  (existente)
  + activa      boolean default true          -- una sola activa por creador
  + min_fotos enforced en la publicación (3)  -- validación, no columna

roles  (existente)
  -- constraint nuevo: count(roles) por obra <= 10

intereses_equipo  (existente, 0033)
  + equipo_id   uuid fk equipos(id)  nullable  -- interés contra un equipo (sin rol)
```

- **"Una sola iniciativa activa"**: constraint que impide `activa=true` en `obras` si el creador tiene un `equipos.activo=true`, y viceversa. Se puede hacer con triggers o con índices únicos parciales sobre una vista materializada de "iniciativa activa por creador".
- **Fotos**: hoy `fotos_talento` es del Talento. Para Proyecto/Equipo hace falta un contenedor de fotos del Creador o de la publicación (`fotos_obra` / `fotos_equipo`, o `imagen_url` múltiple). Definir en tasks.

## Feed del Talento

`feed_para_talento` hoy devuelve roles de obras. Pasa a devolver una unión:

- filas de **rol de Proyecto** (como hoy) — `tipo_publicacion = 'proyecto'`
- filas de **Equipo** — una fila por equipo activo, sin rol — `tipo_publicacion = 'equipo'`

La `TarjetaRol` del feed se generaliza a `TarjetaPublicacion` con el badge de tipo (issue #58): **Proyecto → rojo `#e62d03`**, **Equipo → naranja `#FB6543`/`#FE8064`** (colores de la marca nueva, #59 — si #59 no está aún, usar `telon`/`candileja` como puente y migrar).

## Match y sala

- **Proyecto**: sin cambios — postulación a rol → selección → sala (`seleccion-match`, `sala-proyecto`).
- **Equipo**: interés del Talento → el Creador acepta hasta llenar el `cupo` → sala con los aceptados. Reusa `intereses_equipo` + la apertura de sala de `0033`/`0034`, sumando el corte por `cupo`.

## Riesgos

- Es el cambio de modelo más grande desde `perfil-dual`. Alto riesgo de romper el feed y el onboarding del creador.
- `0033` está en producción con datos reales (`intereses_equipo`): la migración (decisión 2) no puede perderlos.
- El feed unión (roles + equipos en la misma lista, con orden/paginado) es el punto de performance a vigilar.
- Si #58 y #59 no acompañan, el feed muestra dos tipos sin distinción visual = peor que hoy.
