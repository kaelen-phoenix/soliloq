## 0. Decisiones de producto / técnicas

- [ ] 0.1 Confirmar: extracción en server, en memoria, sin storage (propuesta del design).
- [ ] 0.2 Confirmar: la foto del CV no se usa en v1.
- [ ] 0.3 Confirmar topes (8 MB doc / 12 MB imagen / 15 páginas PDF).
- [ ] 0.4 Confirmar: habilidades sin match no se muestran en v1.
- [ ] 0.5 Decidir cómo se resuelve la ubicación extraída (coords server-side vs. string a confirmar).
- [ ] 0.6 Medir cold-start con `pdfjs-dist` + `tesseract.js` en el deploy; decidir si el OCR va aislado.

## 1. Dependencias

- [ ] 1.1 Agregar `pdfjs-dist` (o `pdf-parse`), `mammoth`, `tesseract.js`.
- [ ] 1.2 Verificar que los assets wasm/worker se sirven bien en el deploy.

## 2. Módulo de extracción (`src/lib/extraccion-cv/`)

- [ ] 2.1 `aTextoPlano(buffer, mime)` → PDF / DOCX / imagen (OCR spa+eng, timeout duro).
- [ ] 2.2 `descartarDatosSensibles(texto)` → saca teléfono, DNI, email, direcciones. Corre primero.
- [ ] 2.3 Reglas por campo: nombre, ubicación, experiencia (≤2000), habilidades (match vs `HABILIDADES`), redes (normalizadas con `src/lib/redes.ts`).
- [ ] 2.4 `extraerPerfil(buffer, mime)` → `{ campos, marcados, ok }`. Nunca incluye `fecha_nacimiento`.
- [ ] 2.5 Tests del módulo con CVs de muestra (uno "limpio", uno con columnas, un OCR pobre).

## 3. Endpoint

- [ ] 3.1 Route handler / server action que recibe `FormData`, valida mime + tamaño (rechazo con mensaje), llama `extraerPerfil`, responde JSON. El buffer se descarta al responder.
- [ ] 3.2 Límite de tiempo y manejo de error → `{ ok: false }` en vez de 500.

## 4. UI de alta

- [ ] 4.1 Pantalla previa "¿Completar a mano o subir un archivo?" en `perfil/nuevo`.
- [ ] 4.2 Zona de carga (drag/drop + input), estados: subiendo / procesando / listo / no se pudo leer.
- [ ] 4.3 `formulario-talento`: prop `valoresIniciales` + `camposDelArchivo` (set). Insignia "del archivo" por campo, que se va al editar.
- [ ] 4.4 Fallo total → formulario vacío + aviso "no pudimos leer el archivo".
- [ ] 4.5 i18n es/en de todos los textos nuevos.

## 5. Cierre

- [ ] 5.1 Verificación manual: PDF limpio, DOCX, foto de un CV, archivo inválido, archivo grande, PDF sin texto.
- [ ] 5.2 Revisar bundle/cold-start reales tras el deploy.
- [ ] 5.3 `openspec sync` de las specs principales.
- [ ] 5.4 Cerrar #5.
