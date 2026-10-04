## Why

En Proyectos, «Armar proyecto» y «Armar equipo» aparecen como dos pestañas al mismo nivel. Para quien entra por primera vez son dos conceptos que no se distinguen bien, y el usuario lo marcó como confuso (issue #341). Desde 0101 (#330) además se pueden tener varios de cada uno, así que separarlos en pestañas ya no tiene razón de ser.

## What Changes

- Un solo punto de entrada: **«Crear proyecto»**. Lo primero que pregunta es **«¿Qué querés armar?»**:
  - **Un proyecto con roles** (obra, corto, película… con los roles que se buscan) → el formulario de Proyecto de siempre.
  - **Armar equipo** (juntar gente para crear juntos, sin roles) → el formulario de Equipo de siempre.
- **Mis proyectos** es una sola lista con Proyectos y Equipos, cada uno con su etiqueta («Proyecto» / «Equipo») y su estado, como ya se ven en Explorar y en Chats.
- Cada Equipo tiene su propia pantalla (`/equipos/[id]`), como el Proyecto (`/obras/[id]`): ahí se edita, se buscan talentos, se cierra o se elimina.
- **Sin cambios de datos**: obras y equipos siguen siendo tablas distintas; un Equipo sigue sin roles. Matches, convocatorias, chats y Discord no cambian.

## Capabilities

### Modified Capabilities

- `proyecto-o-equipo`: la elección entre Proyecto y Equipo deja de ser un selector de pestañas y pasa a ser el primer paso de «Crear proyecto»; la lista de lo creado es una sola.

## Impact

- UI: `tablero-creador`, `paneles-iniciativa` (sale), `formulario-obra` y `gestion-equipo` (arrancan abiertos y vuelven a la elección al cancelar), nueva ruta `/equipos/[id]`.
- E2E: los flujos que entraban por la pestaña «Armar equipo» o gestionaban el Equipo desde el tablero.
