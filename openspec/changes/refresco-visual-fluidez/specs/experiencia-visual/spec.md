## Purpose

Define la piel y la fluidez de la interfaz autenticada: el color de acento cambia según el rol activo, el movimiento respeta la preferencia de reducción de motion del sistema, las imágenes reservan su espacio y muestran un placeholder mientras cargan, y el conmutador de modo separa el estado actual de la acción de cambiarlo.

## ADDED Requirements

### Requirement: Acento de color según el rol activo

La interfaz autenticada SHALL aplicar un color de acento distinto según el rol en el que la persona está operando (`talento` o `creador`). El acento SHALL usarse solo en el encabezado de sección, el estado activo de la navegación y el anillo de foco; NO SHALL reemplazar el color de marca en las acciones primarias ni alterar los colores de familia de oficio ni los de estado.

#### Scenario: En modo talento

- **WHEN** la persona tiene el modo `talento` activo y abre cualquier pantalla del área autenticada
- **THEN** el encabezado y el ítem de navegación activo se tiñen con el acento de talento
- **AND** los botones primarios siguen usando el color de marca sin cambios

#### Scenario: En modo creador

- **WHEN** la persona conmuta a modo `creador`
- **THEN** el acento del encabezado y de la navegación activa cambia al de creador en la siguiente pantalla renderizada

#### Scenario: Colores fuera del sistema de acento

- **WHEN** una pantalla muestra etiquetas de familia de oficio o mensajes de estado (error, alerta, éxito)
- **THEN** esos colores se mantienen idénticos en ambos modos

### Requirement: El movimiento respeta la preferencia de reducción

Toda animación de entrada, transición de página o feedback de toque SHALL anularse cuando el sistema operativo reporta `prefers-reduced-motion: reduce`. Con la preferencia activa, los elementos SHALL aparecer en su estado final sin desplazamiento ni fundido perceptible, y la app SHALL seguir siendo completamente utilizable.

#### Scenario: Preferencia de reducción activa

- **WHEN** el sistema reporta `prefers-reduced-motion: reduce` y la persona navega entre pantallas o carga una lista
- **THEN** el contenido aparece sin animación de desplazamiento ni fundido
- **AND** ningún contenido queda oculto a la espera de una animación que no se ejecuta

#### Scenario: Preferencia de reducción inactiva

- **WHEN** no hay preferencia de reducción y la persona abre una lista o grilla
- **THEN** los ítems entran con una animación breve y escalonada
- **AND** la transición entre pantallas del área autenticada es animada

### Requirement: Las imágenes reservan su espacio y muestran un placeholder

Toda imagen remota (fotos de perfil, tarjetas del buscador, avatares, portfolio) SHALL reservar su espacio en el layout antes de cargar, de modo que el contenido alrededor no se desplace cuando la imagen aparece. Mientras la imagen no cargó, su lugar SHALL mostrar un placeholder (desenfoque si hay dato de blur, o un fondo neutro). Si la imagen falla, el espacio SHALL mostrar un sustituto estable (inicial o ícono) sin romper el layout.

#### Scenario: Carga en conexión lenta

- **WHEN** la persona abre la grilla del buscador de talento con la red limitada
- **THEN** cada celda ya tiene su alto y ancho final y muestra un placeholder
- **AND** al llegar cada foto reemplaza al placeholder sin mover las celdas vecinas

#### Scenario: Imagen que no resuelve

- **WHEN** la URL de una foto de perfil devuelve error
- **THEN** el espacio reservado muestra la inicial del nombre sobre un fondo neutro
- **AND** el resto de la pantalla mantiene su posición

### Requirement: Las imágenes se solicitan al tamaño en que se muestran

Una imagen mostrada como miniatura o avatar SHALL solicitarse a un ancho acorde a su tamaño de presentación y no a su resolución original. La solicitud SHALL aprovechar la transformación de tamaño del almacenamiento cuando la imagen proviene de él.

#### Scenario: Avatar pequeño

- **WHEN** se renderiza un avatar de 32 px de una foto almacenada a 1200 px
- **THEN** la solicitud de red pide una versión redimensionada, no el archivo de 1200 px

### Requirement: El conmutador de modo separa el estado de la acción

Cuando la persona tiene ambos perfiles, el conmutador de modo SHALL mostrar dos elementos distintos: un indicador no interactivo del modo actual y un control interactivo cuyo texto nombra el modo **destino**. El texto del control NO SHALL nombrar el modo actual. El `aria-label` o `title` del control SHALL coincidir con su texto visible.

#### Scenario: Con ambos perfiles, en modo talento

- **WHEN** la persona tiene perfil de talento y de creador y está en modo talento
- **THEN** ve un indicador que dice que está en Talento
- **AND** ve un control separado cuyo texto es "Cambiar a Creador"
- **AND** activar ese control la deja en modo creador

#### Scenario: Con un solo perfil

- **WHEN** la persona solo tiene perfil de talento
- **THEN** ve el indicador de modo actual y una invitación a sumar el perfil de creador
- **AND** no aparece un control de conmutación entre modos

### Requirement: Estados de carga y vacío consistentes en las listas

Cada pantalla de lista o grilla del área autenticada SHALL mostrar un estado de carga con la forma del contenido (skeleton) mientras trae datos, y un estado vacío explícito con texto cuando no hay resultados. El estado vacío NO SHALL confundirse con un error.

#### Scenario: Lista cargando

- **WHEN** una pantalla de lista está trayendo datos
- **THEN** muestra placeholders con la forma de sus ítems, no una pantalla en blanco ni un spinner suelto

#### Scenario: Lista sin resultados

- **WHEN** la consulta de una lista devuelve cero ítems
- **THEN** la pantalla muestra un mensaje que explica que no hay resultados y, si aplica, qué hacer al respecto
