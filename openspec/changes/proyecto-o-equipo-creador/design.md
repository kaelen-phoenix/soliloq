## Contexto

El repo ya tiene **dos circuitos** que esta feature unifica bajo una sola elección:

- **Obras + roles + postulaciones** (`0001`…, `convocatorias`, `feed_para_talento`, `seleccion-match`, `sala-proyecto`). Es el camino "principal". Los roles ya existen y ya tienen tipo (`actuacion` / `tecnica`).
- **Armar equipo** (`0033_armar_equipo.sql`): `busca_equipo` (bool en `perfiles`), `intereses_equipo` (de_perfil / a_perfil / interesa), `feed_equipo`, `perfil_para_responder`. Nació como función paralela, sin "cupo" ni "título".

## Decisiones abiertas (bloquean implementación)

| # | Decisión | Default propuesto |
|---|---|---|
| 1 | Tope de integrantes de un Equipo | **6** (dominante en la spec; la línea "1–10" se descarta salvo aviso) |
| 2 | `0033` (`intereses_equipo` / `busca_equipo`) | Reusar la tabla `intereses_equipo` para el match de Equipo; agregar `equipos` (id, creador_id, titulo, cupo, activo). Deprecar `busca_equipo` como bool suelto. Migración aditiva + backfill de los `busca_equipo=true` actuales a un `equipos` con título placeholder |
| 3 | Obras existentes → Proyectos | Toda `obra` existente se considera un Proyecto. "Activo" pasa a ser un flag por obra/equipo; un creador puede tener varias obras históricas pero **una sola activa** |
| 4 | ¿Dónde vive "tipo de iniciativa activa"? | No una columna en `perfiles`: un Creador tiene 0..1 `obra` activa **o** 0..1 `equipo` activo. Una vista/función deriva "qué tiene activo". Constraint: no puede haber ambas activas |

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
