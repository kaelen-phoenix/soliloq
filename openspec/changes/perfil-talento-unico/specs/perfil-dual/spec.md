## MODIFIED Requirements

### Requirement: Coexistencia de ambos perfiles en una cuenta

El sistema SHALL mantener un único perfil personal por cuenta (el Perfil de Talento). El sistema SHALL permitir que, además, la cuenta active la función de Creador (crear y gestionar Proyectos o Equipos, buscar Talentos, gestionar Matches, convocar) sin que eso implique un segundo perfil con nombre, foto, ubicación o descripción propios.

#### Scenario: Cuenta con Perfil de Talento únicamente
- **WHEN** una persona completa su Perfil de Talento y no crea ningún Proyecto o Equipo
- **THEN** el sistema opera con ese único perfil y no le exige nada de la función de Creador

#### Scenario: Cuenta que además usa la función de Creador
- **WHEN** una persona con Perfil de Talento crea un Proyecto o un Equipo
- **THEN** el sistema le permite usar las funcionalidades de Creador (armar, buscar Talentos, gestionar Matches, convocar) sin pedirle un segundo perfil de identidad, y toda superficie que muestre "quién lo creó" sigue mostrando su Perfil de Talento

#### Scenario: La identidad no cambia entre funciones
- **WHEN** una persona con Proyectos o Equipos propios edita su Perfil de Talento (nombre, foto, ubicación, trayectoria)
- **THEN** el sistema refleja ese cambio en todas las superficies donde aparece como Creador, porque es la misma y única identidad

### Requirement: Conmutación entre modos

El sistema SHALL ofrecer una acción visible para alternar entre la experiencia de Talento y la de Creador a quien use ambas, sin cerrar la sesión y sin cambiar la identidad mostrada (nombre y foto vienen siempre del Perfil de Talento).

#### Scenario: Cambio de experiencia
- **WHEN** una persona que usa ambas funciones elige la otra desde el conmutador
- **THEN** el sistema cambia qué puede hacer (navegación y pantalla principal) sin cambiar el nombre ni la foto que se muestran en el encabezado

#### Scenario: Persona sin ningún Proyecto o Equipo propio
- **WHEN** una persona que todavía no creó ningún Proyecto o Equipo abre el menú de perfil
- **THEN** el sistema no le ofrece conmutar a una experiencia de Creador vacía, sino la acción de armar un Proyecto o un Equipo

#### Scenario: La navegación acompaña a la experiencia activa
- **WHEN** la persona conmuta de experiencia
- **THEN** el sistema muestra la barra de navegación y la pantalla principal correspondientes: feed y Convocado en Talento, tablero de Proyectos/Equipos y Matches en Creador

## REMOVED Requirements

### Requirement: Alta del segundo perfil on demand

**Reason**: Ya no existe un "segundo perfil" que dar de alta — la función de Creador no tiene campos de identidad propios que completar. Desde #157 crear un Proyecto o un Equipo ya es el único paso para activarla.

**Migration**: Quien quiera usar la función de Creador simplemente crea un Proyecto o un Equipo desde el tablero; no hay un formulario de alta de perfil de Creador que reemplazar.
