## MODIFIED Requirements

### Requirement: Edición del perfil propio

El sistema SHALL permitir al talento editar cualquier campo de su perfil después del alta, incluidos su ubicación, su género, su autodescripción de género, su unidad de distancia y sus redes sociales, y SHALL impedir que edite el perfil de otra persona.

#### Scenario: Edición exitosa
- **WHEN** el talento modifica campos de su perfil y guarda
- **THEN** el sistema persiste los cambios y los refleja en las convocatorias donde ya se postuló

#### Scenario: Cambio de género
- **WHEN** el talento cambia su género y guarda
- **THEN** el sistema lo persiste y aplica el nuevo valor al filtrado del feed desde la siguiente consulta

#### Scenario: Cambio de ubicación
- **WHEN** el talento elige una ubicación distinta y guarda
- **THEN** el sistema la persiste y el filtro de distancia del feed pasa a medirse desde el lugar nuevo

#### Scenario: Cambio de redes sociales
- **WHEN** el talento agrega, edita o borra alguna de sus redes sociales y guarda
- **THEN** el sistema persiste el conjunto resultante y el perfil deja de mostrar las redes que borró

#### Scenario: Intento de editar un perfil ajeno
- **WHEN** una persona intenta modificar el perfil de otro talento
- **THEN** el sistema rechaza la operación

## ADDED Requirements

### Requirement: Redes sociales del talento

El sistema SHALL ofrecer en el perfil de talento un bloque de redes sociales con un campo independiente por cada red soportada — Instagram, YouTube, TikTok, X, LinkedIn, Vimeo y un sitio web propio —, SHALL aceptar en cada campo tanto un identificador (`@usuario` o `usuario`) como una URL completa, SHALL normalizar lo ingresado a una URL canónica antes de guardar, y SHALL validar que esa URL pertenezca al dominio de la red elegida. Todas las redes son opcionales.

#### Scenario: Carga por identificador
- **WHEN** el talento escribe `@karina.acosta` en el campo de Instagram y guarda
- **THEN** el sistema lo normaliza a `https://instagram.com/karina.acosta` y lo persiste

#### Scenario: Carga por URL completa
- **WHEN** el talento pega `https://www.youtube.com/@SalaBatato` en el campo de YouTube y guarda
- **THEN** el sistema la acepta, la normaliza a su forma canónica y la persiste

#### Scenario: URL de otro dominio en un campo de red
- **WHEN** el talento pega una URL de `facebook.com` en el campo de Instagram
- **THEN** el sistema no guarda e informa que ese enlace no corresponde a Instagram

#### Scenario: Sitio web propio
- **WHEN** el talento ingresa el dominio de su sitio personal
- **THEN** el sistema acepta cualquier dominio siempre que resulte una URL `https` válida, y la persiste

#### Scenario: Entrada que no es ni identificador ni URL válida
- **WHEN** el talento ingresa un texto que no puede normalizarse a una URL de esa red
- **THEN** el sistema no guarda e informa cuál campo revisar

#### Scenario: Redes vacías
- **WHEN** el talento guarda el perfil sin completar ninguna red
- **THEN** el sistema guarda el perfil igual, porque todas las redes son opcionales

#### Scenario: Presentación en el perfil
- **WHEN** alguien ve un perfil de talento que tiene al menos una red cargada
- **THEN** el sistema muestra un icono enlazado por cada red cargada, las no cargadas no ocupan lugar, y cada enlace abre en una pestaña nueva con `rel="noopener noreferrer"`

#### Scenario: Perfil sin ninguna red
- **WHEN** alguien ve un perfil de talento sin redes cargadas
- **THEN** el sistema no muestra el bloque de redes y el resto del perfil se ve sin alteración
