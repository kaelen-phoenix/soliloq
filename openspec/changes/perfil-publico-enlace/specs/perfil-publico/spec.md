## Purpose

Permitir que una persona comparta su perfil con un enlace de token revocable que se vea sin iniciar sesión —una vidriera acotada a fotos, experiencia o descripción y habilidades o disciplinas— y que el contacto desde ahí exija registro y se resuelva por el circuito de armar equipo.

## ADDED Requirements

### Requirement: Enlace público con token revocable, opt-in

El sistema SHALL asociar a cada perfil un token de enlace público aleatorio y un estado de activación que por defecto está apagado. El sistema SHALL resolver la URL pública de un perfil SOLO cuando su enlace está activado. El dueño del perfil SHALL poder activar el enlace, desactivarlo y regenerar el token; al desactivarlo o regenerarlo, la URL anterior SHALL dejar de resolver.

#### Scenario: Perfil sin enlace activado
- **WHEN** alguien abre la URL pública de un perfil cuyo enlace nunca fue activado
- **THEN** el sistema responde 404 y no expone ningún dato del perfil

#### Scenario: Activar el enlace
- **WHEN** el dueño activa el enlace público de su perfil
- **THEN** la URL con su token pasa a resolver y muestra la vidriera

#### Scenario: Desactivar el enlace
- **WHEN** el dueño desactiva el enlace público
- **THEN** la URL que había compartido deja de resolver y responde 404

#### Scenario: Regenerar el token
- **WHEN** el dueño regenera el token de su enlace
- **THEN** la URL anterior deja de resolver y solo la URL con el token nuevo muestra la vidriera

### Requirement: La vidriera se ve sin sesión y con datos acotados

El sistema SHALL mostrar el perfil público a quien abra la URL con un token válido y activo SIN pedir sesión ni redirigir a login. La vidriera SHALL mostrar únicamente: el nombre, las fotos, la experiencia o descripción, y las habilidades o disciplinas. La vidriera NO SHALL mostrar correo, teléfono, redes sociales, fecha de nacimiento, edad, ubicación (ni la pública), ni videoreel.

#### Scenario: Visita anónima con token válido
- **WHEN** una persona sin sesión abre la URL pública de un perfil con el enlace activado
- **THEN** el sistema muestra el nombre, las fotos, la experiencia o descripción y las habilidades o disciplinas, y nada más

#### Scenario: Sin datos de contacto ni sensibles
- **WHEN** se muestra una vidriera pública
- **THEN** no aparece correo, teléfono, redes sociales, fecha de nacimiento, edad, ubicación ni videoreel

#### Scenario: Perfil de talento sin fotos
- **WHEN** el enlace activado corresponde a un talento que no cargó ninguna foto
- **THEN** la vidriera se muestra igual con el resto de los datos acotados, sin romper el layout

### Requirement: 404 indistinguible para token inválido o enlace apagado

El sistema SHALL responder de la misma forma (404, sin cuerpo que confirme la existencia de la persona) tanto para un token que no corresponde a ningún perfil como para un token cuyo enlace está desactivado.

#### Scenario: Token inexistente
- **WHEN** alguien abre la URL pública con un token que no corresponde a ningún perfil
- **THEN** el sistema responde 404 sin distinguir ese caso del de un enlace desactivado

### Requirement: Tarjeta para compartir y exclusión de buscadores

La página pública SHALL emitir metadatos Open Graph y Twitter Card con el nombre del perfil y su primera foto como imagen, para que el enlace pegado en un chat o una red muestre una tarjeta. La página SHALL declararse `noindex` de modo que los buscadores no la incluyan.

#### Scenario: Enlace pegado en un chat
- **WHEN** el enlace público se pega en una plataforma que expande tarjetas
- **THEN** la tarjeta muestra el nombre del perfil y su primera foto

#### Scenario: Rastreador de buscador
- **WHEN** un rastreador de buscador accede a la página pública
- **THEN** recibe indicación de no indexarla, tanto en los metadatos como en la cabecera de la respuesta

### Requirement: Acción de compartir en el perfil propio

El sistema SHALL ofrecer en la vista del perfil propio —de talento y de creador— una acción de compartir. La acción SHALL usar el diálogo nativo del sistema cuando esté disponible y, en su defecto, SHALL ofrecer WhatsApp, X, Instagram, Facebook y "copiar enlace". "Copiar enlace" SHALL copiar la URL al portapapeles y dar una confirmación visible. La primera vez que se comparte, el sistema SHALL activar el enlace público informando en una línea qué queda visible.

#### Scenario: Copiar el enlace
- **WHEN** el dueño elige "copiar enlace"
- **THEN** la URL pública queda en el portapapeles y aparece una confirmación visible

#### Scenario: Primer uso activa el enlace
- **WHEN** el dueño usa la acción de compartir por primera vez, con el enlace todavía apagado
- **THEN** el sistema activa el enlace y le informa qué datos quedan visibles públicamente

### Requirement: Contactar exige registro y vuelve al perfil

La vidriera pública SHALL mostrar una acción de contacto visible. Cuando la activa alguien sin sesión, el sistema SHALL pedirle registrarse y, terminado el registro, SHALL devolverlo a la vidriera desde la que venía y no a la home. El registro NO SHALL obligar a elegir el rol de creador.

#### Scenario: Contacto sin sesión
- **WHEN** una persona sin sesión activa la acción de contacto en una vidriera pública
- **THEN** el sistema la lleva al registro y, al terminar, la devuelve a esa misma vidriera

#### Scenario: El registro no fuerza rol
- **WHEN** alguien se registra a partir de un contacto desde un perfil compartido
- **THEN** puede elegir rol como en cualquier registro y el contacto funciona sea talento o creador

### Requirement: El contacto se resuelve por el circuito de armar equipo

Cuando quien tiene sesión activa la acción de contacto, el sistema SHALL registrar su interés hacia el dueño del perfil reusando el mecanismo de intereses entre personas. El sistema NO SHALL exigir crear una obra para contactar. Si el interés resulta mutuo, el sistema SHALL abrir una sala entre ambos. El dueño del perfil SHALL recibir una notificación de que alguien quiere contactarlo, con acceso a la proyección acotada de esa persona para responder el interés.

#### Scenario: Interés registrado
- **WHEN** una persona con sesión activa la acción de contacto en una vidriera
- **THEN** el sistema registra su interés hacia el dueño y le envía a este una notificación de interés recibido

#### Scenario: Interés mutuo abre sala
- **WHEN** el dueño responde con interés a quien lo contactó desde su perfil compartido
- **THEN** el sistema abre una sala entre ambos, sin necesidad de una obra

#### Scenario: Sin obra de por medio
- **WHEN** se registra un contacto desde un perfil compartido
- **THEN** el sistema no crea ni pide ninguna obra

### Requirement: La vidriera anónima no filtra por bloqueos; el contacto sí

El sistema NO garantiza que la vidriera anónima oculte el perfil a alguien bloqueado, porque el enlace es público. El sistema SÍ SHALL impedir que se registre un contacto entre un par bloqueado: si existe un bloqueo entre quien mira y el dueño, la acción de contacto SHALL fallar sin registrar interés ni abrir sala.

#### Scenario: Mirada anónima de alguien bloqueado
- **WHEN** una persona bloqueada por el dueño abre la URL pública sin sesión
- **THEN** ve la vidriera igual, porque el enlace es público

#### Scenario: Contacto de un par bloqueado
- **WHEN** alguien con sesión intenta contactar desde la vidriera a un perfil con el que existe un bloqueo en cualquier sentido
- **THEN** el sistema rechaza la acción y no registra interés ni abre sala
