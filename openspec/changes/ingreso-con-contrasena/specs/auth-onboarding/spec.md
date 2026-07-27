## REMOVED Requirements

### Requirement: Ingreso por magic link de email

**Motivo**: el enlace de un solo uso obliga a abrir el correo en cada visita y, en móvil, suele abrirse en el navegador interno de la aplicación de correo, que no comparte cookies con el navegador donde la persona usa Soliloq. Se reemplaza por ingreso con contraseña.

**Migración**: las cuentas creadas por magic link no tienen contraseña. Ingresan usando la recuperación de contraseña para asignarse una, o con Google si el email coincide. No se pierde ninguna cuenta ni ningún perfil.

## ADDED Requirements

### Requirement: Alta de cuenta con email y contraseña

El sistema SHALL permitir crear una cuenta con una dirección de email y una contraseña de al menos 8 caracteres, y SHALL verificar la dirección mediante un enlace de un solo uso enviado a ese correo antes de dar acceso a la aplicación.

#### Scenario: Alta con datos válidos
- **WHEN** una persona no autenticada elige "Crear cuenta", ingresa un email con formato válido y una contraseña de al menos 8 caracteres, y confirma
- **THEN** el sistema crea la cuenta, envía un enlace de verificación a esa dirección y muestra una pantalla que indica a qué email se envió

#### Scenario: Contraseña demasiado corta
- **WHEN** la persona intenta crear una cuenta con una contraseña de menos de 8 caracteres
- **THEN** el sistema muestra un mensaje junto al campo indicando el largo mínimo y no crea la cuenta

#### Scenario: Email con formato inválido
- **WHEN** la persona ingresa un texto que no es un email válido y confirma
- **THEN** el sistema muestra un mensaje de validación junto al campo y no envía ningún correo

#### Scenario: Email ya registrado
- **WHEN** la persona intenta crear una cuenta con un email que ya tiene cuenta
- **THEN** el sistema muestra un mensaje que la invita a ingresar en lugar de registrarse, y no crea una cuenta duplicada

#### Scenario: Verificación del email
- **WHEN** la persona abre el enlace de verificación recibido y este no está vencido ni fue usado
- **THEN** el sistema crea la sesión y la lleva al paso siguiente de su onboarding

#### Scenario: Cuenta sin verificar
- **WHEN** una persona que creó su cuenta pero todavía no abrió el enlace de verificación intenta ingresar con su email y contraseña
- **THEN** el sistema no crea sesión y le indica que revise su correo y abra el enlace

### Requirement: Ingreso con email y contraseña

El sistema SHALL permitir ingresar con la dirección de email y la contraseña de la cuenta, en la misma pantalla donde se ofrece el alta y sin requerir el correo en cada ingreso.

#### Scenario: Credenciales correctas
- **WHEN** una persona con la cuenta verificada ingresa su email y su contraseña y confirma
- **THEN** el sistema crea la sesión y la lleva a la pantalla que corresponde al estado de su cuenta

#### Scenario: Credenciales incorrectas
- **WHEN** la persona ingresa un email o una contraseña que no coinciden con ninguna cuenta
- **THEN** el sistema muestra un único mensaje que no distingue si el error está en el email o en la contraseña, y no crea sesión

#### Scenario: Contraseña vacía
- **WHEN** la persona confirma el ingreso sin haber escrito una contraseña
- **THEN** el sistema le pide la contraseña y no envía la solicitud

#### Scenario: Alternancia entre ingresar y crear cuenta
- **WHEN** la persona alterna entre los modos "Ingresar" y "Crear cuenta"
- **THEN** el sistema limpia la contraseña escrita y cualquier mensaje de error del modo anterior

#### Scenario: Demasiados intentos seguidos
- **WHEN** la persona supera el límite de intentos o de correos que acepta el servicio de autenticación
- **THEN** el sistema le indica que espere unos minutos antes de volver a probar, sin presentarlo como una falla de la aplicación

### Requirement: Recuperación de contraseña

El sistema SHALL permitir a quien olvidó su contraseña solicitar un enlace por correo que la habilite a elegir una nueva, y SHALL responder siempre de la misma forma exista o no una cuenta con esa dirección.

#### Scenario: Acceso a la recuperación
- **WHEN** una persona está en el modo "Ingresar" de la pantalla de ingreso
- **THEN** el sistema le ofrece una acción visible para recuperar su contraseña

#### Scenario: Solicitud con una dirección registrada
- **WHEN** la persona ingresa el email de una cuenta existente y confirma
- **THEN** el sistema envía un enlace de recuperación a esa dirección y muestra un aviso de que revise su correo

#### Scenario: Solicitud con una dirección sin cuenta
- **WHEN** la persona ingresa un email que no corresponde a ninguna cuenta y confirma
- **THEN** el sistema muestra exactamente el mismo aviso que ante una dirección registrada, sin revelar si la cuenta existe

#### Scenario: Uso del enlace de recuperación
- **WHEN** la persona abre el enlace de recuperación y este no está vencido ni fue usado
- **THEN** el sistema crea la sesión y la lleva directamente a la pantalla de elegir una contraseña nueva

#### Scenario: Recuperación con el onboarding incompleto
- **WHEN** quien abre el enlace de recuperación todavía no eligió rol ni creó ningún perfil
- **THEN** el sistema igualmente le permite elegir la contraseña nueva antes de retomar el onboarding

### Requirement: Cambio de contraseña

El sistema SHALL permitir a una persona con la sesión iniciada elegir una contraseña nueva, tanto desde el enlace de recuperación como desde su perfil.

#### Scenario: Cambio desde el perfil
- **WHEN** una persona con sesión iniciada busca cambiar su contraseña
- **THEN** el sistema le ofrece la acción desde su pantalla de perfil y la devuelve ahí al terminar

#### Scenario: Contraseña nueva válida
- **WHEN** la persona escribe dos veces la misma contraseña de al menos 8 caracteres y confirma
- **THEN** el sistema actualiza la contraseña, se lo confirma y la devuelve al lugar desde donde llegó

#### Scenario: Las contraseñas no coinciden
- **WHEN** la persona escribe una confirmación distinta de la contraseña nueva
- **THEN** el sistema se lo indica y no actualiza nada

#### Scenario: Contraseña nueva demasiado corta
- **WHEN** la persona escribe una contraseña de menos de 8 caracteres
- **THEN** el sistema muestra el mensaje de largo mínimo y no actualiza nada

#### Scenario: Contraseña nueva igual a la actual
- **WHEN** la persona elige una contraseña idéntica a la que ya tenía
- **THEN** el sistema le indica que tiene que ser distinta y no actualiza nada

#### Scenario: Abandono del cambio
- **WHEN** la persona decide no cambiar la contraseña
- **THEN** el sistema le ofrece una acción para volver al lugar desde donde llegó, sin cambios

### Requirement: Tratamiento de los enlaces recibidos por correo

El sistema SHALL resolver los enlaces de verificación y de recuperación creando la sesión y llevando a la persona al destino indicado en el enlace, SHALL aceptar únicamente destinos internos de la aplicación, y SHALL tratar cualquier enlace no utilizable como un caso previsto y no como un error del sistema.

#### Scenario: Enlace vencido o ya utilizado
- **WHEN** la persona abre un enlace de correo vencido o previamente utilizado
- **THEN** el sistema no crea sesión, la devuelve a la pantalla de ingreso y le muestra un aviso que la invita a pedir uno nuevo

#### Scenario: Destino externo en el enlace
- **WHEN** el enlace llega con un destino que apunta fuera de la aplicación
- **THEN** el sistema lo descarta y lleva a la persona a la pantalla principal

#### Scenario: Enlace abierto desde un deploy de preview
- **WHEN** la persona solicita el enlace desde un entorno de preview o desde el entorno local
- **THEN** el enlace la devuelve a ese mismo entorno y no al de producción

## MODIFIED Requirements

### Requirement: Ingreso con Google

El sistema SHALL ofrecer el ingreso mediante cuenta de Google como alternativa al ingreso con email y contraseña.

#### Scenario: Ingreso exitoso con Google
- **WHEN** la persona elige "Continuar con Google" y autoriza el acceso
- **THEN** el sistema crea la sesión y la redirige al paso siguiente de su onboarding

#### Scenario: La persona cancela la autorización
- **WHEN** la persona interrumpe o rechaza el flujo de autorización de Google
- **THEN** el sistema la devuelve a la pantalla de ingreso sin sesión y sin mensaje de error alarmante

#### Scenario: Mismo email por dos vías de ingreso
- **WHEN** una persona que ya tiene cuenta con email y contraseña ingresa con Google usando la misma dirección
- **THEN** el sistema la reconoce como la misma cuenta y le da acceso a su perfil existente, sin crear una cuenta duplicada
