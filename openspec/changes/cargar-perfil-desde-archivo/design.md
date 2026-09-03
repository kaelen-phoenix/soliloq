## Contexto

El alta de Talento hoy es `src/components/perfil/formulario-talento.tsx` (client), montado en `src/app/(app)/perfil/nuevo`. Los datos válidos:

- `nombre`, `fecha_nacimiento` (≥16, `0001_perfiles.sql`), `ubicacion` (autocompletado con coordenadas, `src/lib/ubicacion.ts`), `genero`, `experiencia` (≤2000), `habilidades` (lista cerrada `HABILIDADES` en `src/lib/constantes.ts`), fotos (`fotos_talento`), `videoreel_url` (`src/lib/videoreel.ts`), redes (`src/lib/redes.ts`, normaliza por dominio).

La feature **no toca la base**: agrega un paso previo al formulario que lo precarga.

## Decisiones — RESUELTAS (2026-09-03, criterio de negocio)

El dueño delegó estas decisiones. Nota de prioridad: **#5 es P2**. El issue mismo admite que la calidad de extracción por reglas será "bastante peor" que un modelo, y suma dependencias pesadas (`tesseract.js`, `pdfjs-dist`). Se prioriza #57 (modelo de producto, P1). #5 queda listo para implementar pero después.

| # | Decisión | Resolución |
|---|---|---|
| 1 | ¿Extracción en cliente o server? ¿Storage? | **Server, en memoria.** `FormData` → route handler → `Buffer` → se descarta al responder. No entra a Storage. Evita inflar el bundle del cliente y hace trivial el "no se persiste". |
| 2 | ¿Foto del CV como foto de perfil? | **No en v1.** |
| 3 | Topes | PDF/DOCX ≤ 8 MB; imagen ≤ 12 MB; PDF ≤ 15 páginas. |
| 4 | Habilidades sin match | **No se muestran en v1.** Solo se preseleccionan las que matchean `HABILIDADES`. |
| 5 | Ubicación extraída | **String a confirmar.** La extracción deja la ciudad como texto y el formulario obliga a re-elegirla en el autocompletado (que resuelve coords). Nada de geocoding server-side en v1: menos dependencias, y la persona valida igual. |
| 6 | Cold-start del OCR | Medir tras un spike; si el cold-start con `tesseract.js` + `pdfjs-dist` en el server duele, aislar el OCR en su propia función. No bloquea el diseño. |

## Arquitectura

```
Cliente: pantalla "subir archivo" (drag/drop + input) -> POST FormData
   |
Server (route handler `app/(app)/perfil/nuevo/extraer/route.ts` o server action):
   1. Validar mime + tamaño (rechazo temprano, mensajes claros).
   2. A texto plano:
        PDF   -> pdfjs-dist (getDocument -> textContent por página)
        DOCX  -> mammoth (extractRawText)
        JPG/PNG -> tesseract.js (spa+eng), timeout duro
   3. Reglas sobre el texto (`src/lib/extraccion-cv/`):
        - nombre: heurística de primeras líneas / "Nombre:" / mayúsculas iniciales
        - ubicacion: match contra ciudades conocidas -> se resuelve a coords con el mismo
          autocompletado del form (o se deja el string para que la persona lo confirme)
        - experiencia: bloques bajo encabezados típicos (Experiencia, Trayectoria, Formación),
          recortado a 2000
        - habilidades: match exacto/normalizado contra HABILIDADES
        - redes: extraer URLs, normalizar con src/lib/redes.ts, quedarse con dominios conocidos
        - DESCARTE explícito: teléfono (regex), DNI (regex), email, direcciones con altura
   4. Responder JSON { campos: {...}, marcados: [...], ok: boolean }.
   |
Cliente: monta `formulario-talento` con `valoresIniciales` + set de campos "marcados";
   la persona revisa, corrige y confirma -> recién ahí el submit normal del formulario.
```

- **Marcado visual**: prop nueva en el formulario, un set de nombres de campo precargados; cada campo marcado muestra una insignia ("del archivo") que desaparece al editarlo.
- **Fallo total** (`ok: false` o todo vacío): el cliente monta el formulario vacío + un aviso.
- **`fecha_nacimiento`**: nunca viaja en `campos`.

## Riesgos

- **Peso / cold-start**: `tesseract.js` + `pdfjs-dist` en el server son MB de wasm. Medir el cold-start en Vercel; si duele, aislar el OCR en su propia función o hacerlo opcional (imágenes = camino lento y avisado).
- **Calidad**: CV con columnas/tablas sale desordenado; OCR de foto de celular falla seguido. Nombre y redes aciertan bastante; experiencia y habilidades, poco. Por eso "nada sin revisión" no es opcional: es lo que sostiene la feature.
- **Ubicación**: extraer una ciudad como texto no alcanza — el form necesita coordenadas. O se resuelve server-side con el mismo servicio de autocompletado, o se deja el string y se obliga a confirmarlo. Definir en tasks.
- **Falsos negativos de descarte** (un teléfono que pasa como "experiencia"): el set de regex de descarte se corre **antes** de armar los bloques de texto.
- Si la tasa de acierto es muy baja en la práctica, la salida es **reconsiderar el modelo**, no seguir agregando reglas.
