## MODIFIED Requirements

### Requirement: Elección de tipo de iniciativa

Crear algo en Yalope DEBE empezar por un único **«Crear proyecto»**, cuya primera pregunta es **«¿Qué querés armar?»** con dos opciones: **un proyecto con roles** o **armar equipo**. Una persona puede tener varios Proyectos y Equipos a la vez (0101).

#### Scenario: Elige un proyecto con roles

- **WHEN** alguien toca «Crear proyecto» y elige «Un proyecto con roles»
- **THEN** ve el formulario de Proyecto (título, descripción, locación, roles)

#### Scenario: Elige armar equipo

- **WHEN** alguien toca «Crear proyecto» y elige «Armar equipo»
- **THEN** ve el formulario de Equipo (título y descripción), sin roles

#### Scenario: Cancela

- **WHEN** cancela cualquiera de los dos formularios
- **THEN** vuelve a la pregunta «¿Qué querés armar?»

### Requirement: Lista de lo creado

«Mis proyectos» DEBE mostrar en una sola lista los Proyectos y los Equipos de la persona, cada uno con su etiqueta («Proyecto» / «Equipo») y su estado, y llevar a su pantalla.

#### Scenario: Tiene de los dos

- **WHEN** una persona tiene un Proyecto y un Equipo
- **THEN** los dos aparecen en la misma lista, el Proyecto lleva a `/obras/[id]` y el Equipo a `/equipos/[id]`
