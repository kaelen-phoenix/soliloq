## Purpose

Dentro del perfil de Creador, la elección excluyente entre "Armar proyecto" (una iniciativa con roles a cubrir) y "Armar equipo" (juntar gente alrededor de una idea, por cupo), y las reglas de publicación de cada una.

## ADDED Requirements

### Requirement: Elección de tipo de iniciativa

El perfil de Creador DEBE ofrecer una elección «¿Qué querés crear?» entre **Proyecto** y **Equipo**, y el Creador DEBE poder tener **como máximo una** iniciativa activa a la vez.

#### Scenario: El Creador elige Proyecto

- **WHEN** un Creador sin iniciativa activa elige "Armar proyecto"
- **THEN** se le presenta el formulario de Proyecto (descripción + roles + fotos) y no el de Equipo

#### Scenario: El Creador elige Equipo

- **WHEN** un Creador sin iniciativa activa elige "Armar equipo"
- **THEN** se le presenta el formulario de Equipo (título + cupo + fotos), sin ningún campo de roles

#### Scenario: Ya hay una iniciativa activa

- **WHEN** un Creador con un Proyecto activo intenta crear un Equipo (o viceversa)
- **THEN** el sistema lo impide y le indica que primero debe cerrar o archivar la iniciativa activa

### Requirement: Formulario de Proyecto

Un Proyecto DEBE tener una descripción libre de la iniciativa, **entre 1 y 10 roles** (cada uno con su propio campo de texto), y **al menos 3 fotos**.

#### Scenario: Alta válida

- **WHEN** el Creador completa la descripción, 1 a 10 roles y sube 3 o más fotos
- **THEN** el Proyecto se publica y aparece en el feed del Talento marcado como "Proyecto"

#### Scenario: Menos de 3 fotos

- **WHEN** el Creador intenta publicar un Proyecto con menos de 3 fotos
- **THEN** el sistema rechaza la publicación e indica el mínimo

#### Scenario: Más de 10 roles

- **WHEN** el Creador intenta cargar un rol número 11
- **THEN** el sistema lo impide

### Requirement: Formulario de Equipo

Un Equipo DEBE tener un **título** que explique el motivo de la búsqueda, **al menos 3 fotos**, y una **cantidad de integrantes** dentro del tope definido por producto (referencia de la spec: 6). NO DEBE mostrar campos de roles.

#### Scenario: Alta válida

- **WHEN** el Creador ingresa un título, sube 3 o más fotos y elige una cantidad de integrantes dentro del tope
- **THEN** el Equipo se publica y aparece en el feed del Talento marcado como "Armar equipo"

#### Scenario: Sin título

- **WHEN** el Creador intenta publicar un Equipo sin título
- **THEN** el sistema rechaza la publicación

#### Scenario: Cupo fuera de rango

- **WHEN** el Creador elige una cantidad de integrantes mayor al tope
- **THEN** el sistema lo impide

### Requirement: El Talento ve y se postula a ambos

El feed del Talento DEBE incluir tanto Proyectos como Equipos, y el Talento DEBE poder expresar interés en cualquiera de los dos. La distinción de tipo DEBE ser visible en el listado y en el detalle.

#### Scenario: Postulación a un rol de Proyecto

- **WHEN** el Talento se postula a un Proyecto
- **THEN** la postulación queda asociada a un rol del Proyecto y sigue el circuito de selección existente

#### Scenario: Interés en un Equipo

- **WHEN** el Talento expresa interés en un Equipo
- **THEN** el interés se registra contra el cupo del Equipo (sin rol) y, si el Creador lo acepta, se abre la sala
