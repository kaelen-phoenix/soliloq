# #4 — Redes sociales en el perfil de talento

- Estado: OPEN
- Labels: feature
- Autor: kaelen-phoenix
- Creado: 2026-08-16T01:49:57Z
- Actualizado: 2026-08-16T01:49:57Z
- URL: https://github.com/kaelen-phoenix/soliloq/issues/4

---

## Contexto

El perfil de talento tiene hoy una sección "CV y habilidades" (`formulario-talento.tsx`) donde `habilidades` es un `text[]` elegido de la lista cerrada `HABILIDADES` en `constantes.ts`. En el medio artístico las redes son parte del material de presentación: mucho del trabajo de una persona vive en su Instagram o en su canal de YouTube, no en un CV.

## Requerimiento

El talento puede sumar sus redes sociales al perfil, y quien lo mira puede llegar a ellas.

## Criterios de aceptación

- En el formulario de perfil de talento hay un bloque de redes sociales.
- Se soportan al menos: Instagram, YouTube, TikTok, X, LinkedIn, Vimeo y un sitio web propio.
- Cada red se carga por separado; no es un campo de texto libre.
- Se acepta tanto el usuario (`@nombre`) como la URL completa, y el sistema normaliza a una URL válida.
- Se valida que la URL corresponda al dominio de la red elegida.
- En el perfil se muestran como iconos enlazados; las que no cargó no ocupan lugar.
- Los enlaces abren en pestaña nueva, con `rel="noopener noreferrer"`.
- Las redes no cargadas no rompen el layout del perfil.

## Decisiones que hay que tomar antes de implementar

1. **Dónde vive el dato.** Una columna `redes jsonb` en `perfiles_talento` es lo más simple. Una tabla aparte permite orden y redes futuras sin migración. Sugerencia: `jsonb`, porque el conjunto de redes es chico y estable.
2. **No mezclarlo con `habilidades`.** Aunque el pedido dice "en aptitudes", meter las redes dentro del array de habilidades ensuciaría un dato que hoy es una lista cerrada y sirve para filtrar. Van como bloque propio dentro de la misma sección visual.
3. **Visibilidad.** Si el perfil público sin login existe, hay que decidir si las redes se muestran ahí. Publicar el Instagram de alguien en una página abierta es exponer un canal de contacto directo. Sugerencia: que sea una casilla del talento.
4. **¿También para creadores?** `perfiles_creador` tiene el mismo hueco. Puede resolverse de una en la misma migración.
5. **Relación con el videoreel.** Ya existe `videoreel_url` con embed propio (`videoreel-embed.tsx`). Si alguien pega su YouTube en ambos lados queda duplicado; definir si conviven o si el videoreel pasa a ser parte de las redes.

## Fuera de alcance

- Verificar que la cuenta sea realmente de esa persona.
- Traer seguidores o publicaciones desde las redes.
