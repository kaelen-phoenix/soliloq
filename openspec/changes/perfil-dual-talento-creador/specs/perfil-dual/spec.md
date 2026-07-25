## ADDED Requirements

### Requirement: Coexistencia de ambos perfiles en una cuenta

El sistema SHALL permitir que una misma cuenta tenga perfil de Talento, perfil de Creador, o ambos, sin requerir cuentas ni direcciones de email separadas.

#### Scenario: Cuenta con un solo perfil
- **WHEN** una persona completa su primer perfil y no crea el segundo
- **THEN** el sistema opera con ese único perfil y no le exige crear el otro

#### Scenario: Cuenta con ambos perfiles
- **WHEN** una persona tiene creados el perfil de Talento y el de Creador
- **THEN** el sistema le permite usar las funcionalidades de ambos, alternando el modo activo

#### Scenario: Independencia de los perfiles
- **WHEN** una persona con ambos perfiles edita los datos de uno
- **THEN** el sistema no altera los datos del otro

### Requirement: Modo activo persistido

El sistema SHALL registrar el modo en que la persona está operando (`talento` o `creador`) y SHALL restaurarlo en su siguiente ingreso.

#### Scenario: Ingreso posterior con modo recordado
- **WHEN** una persona que usó por última vez el modo `creador` vuelve a ingresar
- **THEN** el sistema abre la aplicación en modo `creador`, mostrando su tablero de obras

#### Scenario: Modo activo tras el primer alta
- **WHEN** una persona completa su primer perfil
- **THEN** el sistema fija el modo activo en el rol de ese perfil

#### Scenario: Modo activo sin el perfil correspondiente
- **WHEN** el modo activo registrado corresponde a un perfil que no existe
- **THEN** el sistema opera en el modo del perfil que sí existe y corrige el modo activo registrado

### Requirement: Conmutación entre modos

El sistema SHALL ofrecer una acción visible para alternar el modo activo a quien tenga ambos perfiles, sin cerrar la sesión.

#### Scenario: Cambio de modo
- **WHEN** una persona con ambos perfiles elige el otro modo desde el conmutador
- **THEN** el sistema actualiza el modo activo, lo persiste y la lleva a la pantalla principal de ese modo

#### Scenario: Persona con un solo perfil
- **WHEN** una persona que tiene un único perfil abre el menú de perfil
- **THEN** el sistema no le ofrece conmutar, sino la acción de crear el perfil que le falta

#### Scenario: La navegación acompaña al modo
- **WHEN** la persona conmuta de modo
- **THEN** el sistema muestra la barra de navegación y la pantalla principal correspondientes al modo nuevo: feed y postulaciones en `talento`, tablero de obras en `creador`

### Requirement: Alta del segundo perfil on demand

El sistema SHALL permitir crear el segundo perfil en cualquier momento posterior al onboarding, y NO SHALL exigirlo para seguir usando el primero.

#### Scenario: Creación del segundo perfil
- **WHEN** una persona con un solo perfil elige crear el que le falta y completa los campos obligatorios
- **THEN** el sistema crea ese perfil, lo deja disponible y conmuta el modo activo al perfil recién creado

#### Scenario: Alta interrumpida del segundo perfil
- **WHEN** la persona abre el alta del segundo perfil y la abandona sin guardar
- **THEN** el sistema la mantiene operando con su perfil existente, sin bloquearle el acceso

#### Scenario: Los datos del primer perfil no se repiten
- **WHEN** la persona crea su segundo perfil
- **THEN** el sistema no le vuelve a pedir los datos que ya están en su cuenta, y le pide únicamente los propios del rol nuevo
