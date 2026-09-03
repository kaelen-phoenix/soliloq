## Purpose

Subir un CV (PDF, DOCX, JPG o PNG) y llegar al formulario de alta de Talento precargado, a partir de una extracción local por reglas. La revisión y la confirmación de la persona son obligatorias: nada se guarda sin pasar por el formulario.

## ADDED Requirements

### Requirement: Punto de entrada en el alta de Talento

El alta de perfil de Talento DEBE ofrecer "subir un archivo" como alternativa a completar el formulario a mano.

#### Scenario: Elegir subir archivo

- **WHEN** una persona inicia el alta de perfil de Talento
- **THEN** ve dos caminos: completar a mano o subir un archivo (CV)

#### Scenario: Volver a mano

- **WHEN** la persona eligió subir un archivo pero prefiere no hacerlo
- **THEN** puede pasar al formulario vacío sin subir nada

### Requirement: Formatos y tamaño aceptados

El sistema DEBE aceptar PDF, DOCX, JPG y PNG, y DEBE rechazar con un mensaje claro cualquier otro formato o un archivo que exceda el tope de tamaño definido.

#### Scenario: Formato no soportado

- **WHEN** la persona sube un archivo que no es PDF/DOCX/JPG/PNG
- **THEN** el sistema lo rechaza e indica los formatos aceptados

#### Scenario: Archivo demasiado grande

- **WHEN** la persona sube un archivo que supera el tope de tamaño
- **THEN** el sistema lo rechaza e indica el tope

### Requirement: Extracción local por reglas

La extracción DEBE resolverse con librerías locales (sin servicio de LLM ni costo por archivo): texto de PDF, texto de DOCX, OCR de imágenes, y reglas/regex sobre el texto plano. DEBE intentar extraer **nombre, ubicación, experiencia, habilidades y enlaces a redes**. NO DEBE extraer la fecha de nacimiento.

#### Scenario: Extracción parcial

- **WHEN** el archivo permite extraer algunos campos y otros no
- **THEN** los que se pudieron extraer se precargan y los que no quedan vacíos, sin valores inventados

#### Scenario: Fecha de nacimiento

- **WHEN** se procesa cualquier archivo
- **THEN** la fecha de nacimiento nunca se precarga: se pide a mano en el formulario

#### Scenario: Datos personales fuera del perfil

- **WHEN** el CV contiene teléfono, DNI o dirección exacta
- **THEN** la extracción los descarta explícitamente y no aparecen en ningún campo

### Requirement: Habilidades contra la lista cerrada

Las habilidades extraídas DEBEN mapearse contra la lista `HABILIDADES`. Lo que no coincide NO DEBE insertarse como valor nuevo.

#### Scenario: Habilidad reconocida

- **WHEN** el texto menciona una habilidad que está en `HABILIDADES`
- **THEN** esa habilidad queda preseleccionada en el formulario

#### Scenario: Habilidad no reconocida

- **WHEN** el texto menciona algo que no está en `HABILIDADES`
- **THEN** no se agrega como habilidad nueva (se descarta, u —opción a definir— se ofrece aparte)

### Requirement: Revisión y confirmación obligatorias

El resultado de la extracción NUNCA se guarda directo. El sistema DEBE mostrar el formulario de alta precargado, con los campos completados desde el archivo **marcados visualmente**, y la persona DEBE revisar y confirmar antes de guardar.

#### Scenario: Confirmación

- **WHEN** la extracción terminó y se muestra el formulario precargado
- **THEN** hasta que la persona no confirme el formulario, no se crea ni se modifica ningún perfil

#### Scenario: Campos marcados

- **WHEN** un campo se completó a partir del archivo
- **THEN** ese campo se muestra con una marca que lo distingue de los que la persona escribió

### Requirement: Fallo de extracción sin pantalla de error

Si la extracción falla por completo, el flujo DEBE caer al formulario **vacío con un aviso**, no a una pantalla de error.

#### Scenario: Archivo ilegible

- **WHEN** no se puede extraer ningún dato del archivo (OCR fallido, PDF sin texto, etc.)
- **THEN** la persona llega al formulario vacío con un aviso de que no se pudo leer el archivo, y puede completarlo a mano

### Requirement: El archivo no se persiste

El archivo original NO DEBE quedar almacenado una vez procesado.

#### Scenario: Después de procesar

- **WHEN** la extracción terminó (con éxito o no)
- **THEN** el archivo subido ya no está en el servidor ni en storage
