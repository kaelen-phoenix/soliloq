# #5 — Cargar el perfil desde un archivo (PDF, Word o imagen)

- Estado: OPEN
- Labels: feature
- Autor: kaelen-phoenix
- Creado: 2026-08-16T01:49:58Z
- Actualizado: 2026-08-16T02:00:59Z
- URL: https://github.com/kaelen-phoenix/soliloq/issues/5

---

## Contexto

Completar el perfil de talento hoy es un formulario largo: nombre, fecha de nacimiento, ubicación, género, experiencia (hasta 2000 caracteres), habilidades, fotos, videoreel. Es el primer muro que encuentra alguien que se registra, y la mayoría de esa información ya la tiene escrita en un CV.

## Requerimiento

El talento puede subir un archivo con su CV y que el sistema complete el perfil a partir de él, en lugar de tipear todo.

## Criterios de aceptación

- En el alta de perfil hay una opción de subir un archivo como alternativa a completar a mano.
- Se aceptan PDF, DOCX y las imágenes JPG y PNG (foto de un CV impreso).
- Hay un límite de tamaño explícito y un mensaje claro cuando el archivo lo excede o el formato no se acepta.
- El sistema extrae del archivo lo que pueda de: nombre, fecha de nacimiento, ubicación, experiencia, habilidades y enlaces a redes.
- **El resultado nunca se guarda directo.** Se muestra el formulario precargado, y el talento revisa, corrige y confirma.
- Los campos que se completaron desde el archivo están marcados visualmente, para que la persona sepa qué revisar.
- Los campos que no se pudieron extraer quedan vacíos y editables, sin inventar valores.
- Si la extracción falla por completo, el flujo cae al formulario vacío con un aviso, no a una pantalla de error.
- Las habilidades extraídas se mapean contra la lista cerrada `HABILIDADES`; lo que no coincide se descarta o se ofrece aparte, pero no se inserta como valor nuevo.
- El archivo original no queda almacenado una vez procesado, salvo que se decida lo contrario.

## Decisión tomada: extracción sin costo por uso

Nada de LLM. La extracción se resuelve con librerías locales, sin servicio pago ni costo por archivo procesado:

- **PDF**: `pdf-parse` o `pdfjs-dist` para sacar el texto.
- **DOCX**: `mammoth`.
- **JPG / PNG**: OCR con `tesseract.js`, que es libre y corre en el propio proceso.
- Sobre el texto plano resultante, reglas y expresiones regulares para ubicar cada campo: los enlaces a redes salen limpios por dominio, y las habilidades por coincidencia contra la lista cerrada `HABILIDADES`.

**Lo que esto implica, y hay que asumirlo de entrada:** la calidad va a ser bastante peor que con un modelo. Un CV con columnas, tablas o maquetación de diseñador va a salir con el texto desordenado, y el OCR sobre una foto sacada con el celular va a fallar seguido. La extracción por reglas acierta nombre y enlaces con bastante confianza; experiencia y habilidades, mucho menos.

Por eso el criterio de "nada se guarda sin revisión" no es una precaución opcional acá: es lo que sostiene la feature. El objetivo realista es **ahorrar tipeo, no completar el perfil solo**.

Si más adelante la tasa de acierto resulta demasiado baja para que valga la pena, la salida es reconsiderar el modelo, no seguir agregando reglas.

## Decisiones que hay que tomar antes de implementar

1. **Dónde corre.** Subir el archivo al cliente y mandarlo a una función, o procesarlo en el server. Definir también si el archivo toca storage o vive solo en memoria durante el request.
4. **Fecha de nacimiento.** Es un campo con validación dura (mínimo 16 años, `0001_perfiles.sql`) y rara vez figura en un CV. Probablemente convenga no intentar extraerlo y pedirlo siempre a mano.
5. **Datos personales.** Un CV trae teléfono, DNI y dirección, cosas que el perfil no pide y no debería guardar. La extracción tiene que descartarlos explícitamente, no solo ignorarlos.
6. **Foto.** Si el archivo trae foto de la persona, ¿se usa como foto de perfil? Sugerencia: no en esta primera versión; la foto de un CV rara vez sirve para lo que la app necesita.

## Fuera de alcance

- Importar desde LinkedIn u otras plataformas.
- Guardar y mostrar el CV original como adjunto del perfil.
