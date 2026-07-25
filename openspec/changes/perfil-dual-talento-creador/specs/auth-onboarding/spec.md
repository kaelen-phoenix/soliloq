## MODIFIED Requirements

### Requirement: Elección de rol en el onboarding

Tras su primer ingreso, el sistema SHALL requerir que la persona elija con qué perfil empieza, entre `talento` y `creador`, antes de poder usar cualquier otra parte de la aplicación. Esa elección determina el primer perfil a crear y el modo activo inicial, pero NO SHALL impedir que más adelante cree también el otro perfil.

#### Scenario: Primer ingreso sin rol asignado
- **WHEN** una persona autenticada que todavía no eligió con qué perfil empieza accede a cualquier ruta de la aplicación
- **THEN** el sistema la redirige a la pantalla de elección de rol

#### Scenario: Elección de rol
- **WHEN** la persona elige `talento` o `creador` y confirma
- **THEN** el sistema registra esa elección, fija el modo activo en ese rol y la lleva al formulario de alta del perfil correspondiente

#### Scenario: Corrección del rol antes de crear el perfil
- **WHEN** una persona que ya eligió con qué perfil empieza pero todavía no creó ningún perfil vuelve a la pantalla de elección de rol
- **THEN** el sistema le permite elegir el otro rol y la deriva al formulario de alta correspondiente

#### Scenario: Acceso a la corrección de rol desde el alta del primer perfil
- **WHEN** una persona está en el formulario de alta de su primer perfil
- **THEN** el sistema le ofrece una acción visible para volver a elegir el rol

#### Scenario: La elección inicial no bloquea el segundo perfil
- **WHEN** una persona que empezó como `talento` quiere además publicar convocatorias
- **THEN** el sistema le permite crear su perfil de `creador` sin cambiar ni perder el de `talento`

### Requirement: Onboarding incompleto hasta completar el perfil

El sistema SHALL considerar el onboarding incompleto mientras la cuenta no tenga ningún perfil creado, y SHALL restringir el acceso al resto de la aplicación hasta entonces. Una vez que existe al menos un perfil, el onboarding SHALL considerarse completo.

#### Scenario: Acceso sin ningún perfil creado
- **WHEN** una persona con rol inicial elegido pero sin ningún perfil creado accede a cualquier ruta que no sea el alta de perfil o la elección de rol
- **THEN** el sistema la redirige al formulario de alta de su perfil

#### Scenario: Onboarding completado con el primer perfil
- **WHEN** la persona guarda su primer perfil con todos los campos obligatorios
- **THEN** el sistema marca su onboarding como completo y la lleva a la pantalla principal de su modo activo: el feed si es `talento`, el tablero de obras si es `creador`

#### Scenario: El segundo perfil no condiciona el acceso
- **WHEN** una persona con un solo perfil creado navega por la aplicación
- **THEN** el sistema le da acceso completo a las funcionalidades de ese perfil, sin redirigirla a completar el que le falta

### Requirement: Sesión persistente y cierre de sesión

El sistema SHALL mantener la sesión de la persona entre visitas al sitio y SHALL ofrecer una acción explícita para cerrarla, restaurando el modo activo que la persona usó por última vez.

#### Scenario: Regreso a la aplicación con sesión vigente
- **WHEN** una persona con sesión vigente vuelve a abrir la aplicación
- **THEN** el sistema la lleva directamente a la pantalla principal de su último modo activo, sin pedirle credenciales

#### Scenario: Cierre de sesión
- **WHEN** la persona elige "Cerrar sesión"
- **THEN** el sistema destruye la sesión y la redirige a la pantalla de ingreso

#### Scenario: Acceso sin sesión a una ruta protegida
- **WHEN** una persona sin sesión accede directamente a la URL de una ruta protegida
- **THEN** el sistema la redirige a la pantalla de ingreso
