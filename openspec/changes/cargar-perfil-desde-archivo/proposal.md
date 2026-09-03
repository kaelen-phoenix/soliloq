## Why

Completar el perfil de Talento es un formulario largo (nombre, fecha de nacimiento, ubicación, género, experiencia hasta 2000 caracteres, habilidades, fotos, videoreel). Es el primer muro para quien se registra, y la mayor parte de esa info ya la tiene escrita en un CV. Poder subir el CV y llegar al formulario **precargado** baja esa fricción.

## What Changes

- En el alta de perfil de Talento, además de "completar a mano", aparece **"subir un archivo"** (PDF, DOCX, JPG o PNG) con un **límite de tamaño explícito** y mensajes claros para formato/tamaño inválidos.
- El sistema **extrae con librerías locales** (sin LLM, sin costo por archivo): `pdf-parse` / `pdfjs-dist` para PDF, `mammoth` para DOCX, `tesseract.js` (OCR) para imágenes. Sobre el texto plano, **reglas y regex** ubican cada campo.
- Campos que se intentan extraer: **nombre, ubicación, experiencia, habilidades, enlaces a redes**. La **fecha de nacimiento no se extrae** (validación dura de ≥16 años en `0001_perfiles.sql`, y casi nunca está en un CV): se pide siempre a mano.
- **Nada se guarda directo**: se muestra el formulario precargado; la persona revisa, corrige y confirma. Los campos completados desde el archivo van **marcados visualmente**. Los no extraídos quedan vacíos y editables, **sin inventar valores**.
- Si la extracción falla del todo → formulario **vacío con un aviso**, nunca una pantalla de error.
- Las **habilidades** extraídas se mapean contra la lista cerrada `HABILIDADES` (`src/lib/constantes.ts`): lo que no coincide se descarta o se ofrece aparte, nunca se inserta como valor nuevo.
- **Datos personales que el perfil no pide** (teléfono, DNI, dirección exacta) se **descartan explícitamente** en la extracción, no solo se ignoran.
- El **archivo original no se almacena** una vez procesado (salvo decisión contraria).

## Capabilities

### New Capabilities

- `carga-perfil-archivo`: subir un CV (PDF/DOCX/JPG/PNG) y obtener el formulario de alta de Talento precargado a partir de una extracción local por reglas, con revisión y confirmación obligatorias antes de guardar.

### Modified Capabilities

- `perfil-talento`: el alta del perfil suma una entrada alternativa (subir archivo) al camino de completar a mano; el resto de las reglas del perfil no cambian.
- `auth-onboarding`: el onboarding de Talento contempla el nuevo punto de entrada; no cambia qué hace falta para considerar el perfil completo.

## Impact

**Decisiones abiertas antes de implementar:**
1. **Dónde corre la extracción.** Cliente (subir el archivo, parsear en el navegador con las libs wasm) vs. server (route handler / server action). Definir también si el archivo toca **storage** o vive **solo en memoria** durante el request. `tesseract.js` y `pdfjs-dist` son pesados; en el cliente inflan el bundle, en el server suman cold-start.
2. **Foto.** Si el archivo trae una foto de la persona, ¿se usa como foto de perfil? Propuesta: **no en v1**.
3. **Tope de tamaño** concreto por tipo (p. ej. 8 MB PDF/DOCX, 12 MB imagen) y tope de páginas del PDF para acotar el OCR/parseo.
4. **"Ofrecer aparte"** las habilidades que no matchean `HABILIDADES`: ¿se muestran como sugerencias para descartar, o directamente no se muestran? Propuesta: no mostrarlas en v1 (solo las que matchean).

**Código**: alta de perfil de Talento (`src/app/(app)/perfil/nuevo`, `src/components/perfil/formulario-talento.tsx`), un paso/pantalla nueva de "subir archivo" + estado de "revisando lo extraído", el marcado visual de campos precargados, y un módulo nuevo de extracción (`src/lib/extraccion-cv/` con parsers + reglas + mapeo contra `HABILIDADES` y `src/lib/redes.ts`).

**Dependencias nuevas**: `pdfjs-dist` (o `pdf-parse`), `mammoth`, `tesseract.js`. Son libres y sin costo por uso; el trade-off es **calidad de extracción bastante peor que un modelo** — el objetivo es *ahorrar tipeo, no completar el perfil solo*. Si la tasa de acierto resulta muy baja, la salida es reconsiderar el modelo, no seguir agregando reglas.

**Base de datos**: ninguna. No hay tabla nueva ni columnas; el archivo no se persiste.

**Fuera de alcance**: importar desde LinkedIn u otras plataformas; guardar y mostrar el CV original como adjunto del perfil; extraer fecha de nacimiento; usar la foto del CV.
