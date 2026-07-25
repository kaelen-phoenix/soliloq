## ADDED Requirements

### Requirement: Ingreso por magic link de email

El sistema SHALL permitir a una persona ingresar con su dirección de email, enviándole un enlace de acceso de un solo uso, sin requerir contraseña.

#### Scenario: Solicitud de magic link con email válido
- **WHEN** una persona no autenticada ingresa un email con formato válido y confirma
- **THEN** el sistema envía un enlace de acceso a esa dirección y muestra una pantalla de "revisá tu correo" con el email al que se envió

#### Scenario: Email con formato inválido
- **WHEN** una persona ingresa un texto que no es un email válido y confirma
- **THEN** el sistema muestra un mensaje de validación junto al campo y no envía ningún correo

#### Scenario: Uso del enlace recibido
- **WHEN** la persona abre el enlace de acceso recibido y este no está vencido ni fue usado
- **THEN** el sistema crea la sesión y la redirige al paso siguiente de su onboarding

#### Scenario: Enlace vencido o ya utilizado
- **WHEN** la persona abre un enlace de acceso vencido o previamente utilizado
- **THEN** el sistema no crea sesión y muestra un mensaje que ofrece solicitar un enlace nuevo

### Requirement: Ingreso con Google

El sistema SHALL ofrecer el ingreso mediante cuenta de Google como alternativa al magic link.

#### Scenario: Ingreso exitoso con Google
- **WHEN** la persona elige "Continuar con Google" y autoriza el acceso
- **THEN** el sistema crea la sesión y la redirige al paso siguiente de su onboarding

#### Scenario: La persona cancela la autorización
- **WHEN** la persona interrumpe o rechaza el flujo de autorización de Google
- **THEN** el sistema la devuelve a la pantalla de ingreso sin sesión y sin mensaje de error alarmante

#### Scenario: Mismo email por dos vías de ingreso
- **WHEN** una persona que ya ingresó con magic link vuelve a ingresar con Google usando la misma dirección de email
- **THEN** el sistema la reconoce como la misma cuenta y le da acceso a su perfil existente, sin crear una cuenta duplicada

### Requirement: Elección de rol en el onboarding

Tras su primer ingreso, el sistema SHALL requerir que la persona elija un único rol entre `talento` y `creador` antes de poder usar cualquier otra parte de la aplicación.

#### Scenario: Primer ingreso sin rol asignado
- **WHEN** una persona autenticada que todavía no eligió rol accede a cualquier ruta de la aplicación
- **THEN** el sistema la redirige a la pantalla de elección de rol

#### Scenario: Elección de rol
- **WHEN** la persona elige `talento` o `creador` y confirma
- **THEN** el sistema guarda el rol en su cuenta y la lleva al formulario de alta del perfil correspondiente a ese rol

#### Scenario: El rol es inmutable en el prototipo
- **WHEN** una persona con rol ya asignado intenta acceder a la pantalla de elección de rol
- **THEN** el sistema la redirige a la pantalla principal de su rol y no le ofrece cambiarlo

### Requirement: Onboarding incompleto hasta completar el perfil

El sistema SHALL considerar el onboarding incompleto mientras el perfil obligatorio del rol elegido no esté creado, y SHALL restringir el acceso al resto de la aplicación hasta entonces.

#### Scenario: Acceso con perfil pendiente
- **WHEN** una persona con rol elegido pero sin perfil creado accede a cualquier ruta que no sea el alta de perfil
- **THEN** el sistema la redirige al formulario de alta de su perfil

#### Scenario: Onboarding completado
- **WHEN** la persona guarda su perfil con todos los campos obligatorios
- **THEN** el sistema marca su onboarding como completo y la lleva a la pantalla principal de su rol: el feed si es `talento`, el tablero de obras si es `creador`

### Requirement: Sesión persistente y cierre de sesión

El sistema SHALL mantener la sesión de la persona entre visitas al sitio y SHALL ofrecer una acción explícita para cerrarla.

#### Scenario: Regreso a la aplicación con sesión vigente
- **WHEN** una persona con sesión vigente vuelve a abrir la aplicación
- **THEN** el sistema la lleva directamente a la pantalla principal de su rol sin pedirle credenciales

#### Scenario: Cierre de sesión
- **WHEN** la persona elige "Cerrar sesión"
- **THEN** el sistema destruye la sesión y la redirige a la pantalla de ingreso

#### Scenario: Acceso sin sesión a una ruta protegida
- **WHEN** una persona sin sesión accede directamente a la URL de una ruta protegida
- **THEN** el sistema la redirige a la pantalla de ingreso
