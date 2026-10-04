## Decisiones

- **«Proyecto» es el paraguas visible; «Equipo» es un tipo.** En datos siguen siendo `obras` y `equipos`: unificar tablas tocaría feed, matches, convocatorias, salas y Discord sin beneficio para quien usa la app.
- **Elección explícita al crear**, no un selector persistente: la pregunta aparece solo cuando se va a crear algo. Cancelar vuelve a la pregunta.
- **Pantalla propia del Equipo** (`/equipos/[id]`): con la lista unificada, cada ítem lleva a su detalle; el Equipo ya no se gestiona en línea dentro del tablero. Reusa `GestionEquipo` tal cual.
- **Orden de la lista**: lo más reciente primero, Proyectos y Equipos mezclados.
