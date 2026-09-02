## Context

Ver `proposal.md — Why`. Estado actual relevante para el enfoque:

- **Sistema visual** centralizado en `tailwind.config.ts` (tokens `brand`, `ink`, familias de oficio, estados) y `src/app/globals.css` (base, foco, `safe-*`). Nada de gradientes ni sombras salvo el token `shadow-tarjeta`, hoy sin usar.
- **Imágenes**: todos los `<img>` son crudos. La URL se arma con `supabase.storage.from("fotos-perfil").getPublicUrl(path)` → `https://<ref>.supabase.co/storage/v1/object/public/fotos-perfil/<path>`. No hay `next/image` en el proyecto ni `images` en `next.config.mjs`.
- **Deploy**: Vercel, push a `main` (según historial). Eso da acceso a la Image Optimization de Vercel sin configuración extra.
- **Rol activo**: `leerEstadoCuenta` / `conmutarModo` (`src/app/acciones-modo.ts`) ya resuelven `modoActivo: RolUsuario` en el servidor; el layout de `(app)` lo tiene disponible.
- **Movimiento**: `framer-motion` ya es dependencia; se usa de forma puntual (`pila-tarjetas`).
- Requisitos observables: ver `specs/experiencia-visual/spec.md`.

## Goals / Non-Goals

**Goals:**

- Un único punto de verdad para cada pieza nueva: el acento por rol vive en un token + una variable CSS; el movimiento en un módulo con las variantes y el hook de reducción; la imagen en un solo componente.
- Reemplazo mecánico y de bajo riesgo de los `<img>` por `<Imagen>`, preservando clases y `aspect-ratio` actuales.
- El refresco no cambia el árbol de componentes ni el flujo de ninguna pantalla: solo tokens, clases y wrappers.

**Non-Goals:**

- No se crea un theming runtime ni un `ThemeProvider`: el acento por rol se resuelve en el server render del layout y se pasa por `data-rol` + CSS var.
- No se toca `getPublicUrl` ni el modelo de storage.
- No se migra `pila-tarjetas` ni otras animaciones existentes que ya funcionan.

## Decisions

### 1. Acento por rol: `data-rol` en el contenedor de `(app)` + CSS var, no clases condicionales por componente

El layout server de `(app)` ya conoce `modoActivo`. Pone `data-rol={modoActivo}` en el contenedor raíz. En `globals.css`:

```css
:root { --acento: theme('colors.brand.500'); --acento-suave: theme('colors.brand.50'); }
[data-rol='talento'] { --acento: theme('colors.talento.500'); --acento-suave: theme('colors.talento.50'); }
[data-rol='creador'] { --acento: theme('colors.creador.500'); --acento-suave: theme('colors.creador.50'); }
```

Los componentes que quieran acento usan `text-[color:var(--acento)]` / `bg-[color:var(--acento-suave)]` o utilidades cortas (`.acento-texto`, `.acento-fondo`, `.borde-acento`) definidas en `@layer utilities`. El anillo de foco pasa de `ring-brand-500/40` a `ring-[color:var(--acento)]/40`.

**Tokens nuevos** en `tailwind.config.ts` — derivados de `brand` (rosa) girando el tono, para que sean familia y no dos colores sin relación:

- `talento`: rosa-magenta actual de `brand` (50 `#fdf2f7`, 500 `#d81b7a`, 600 `#be1367`). El talento es el uso "por defecto" histórico.
- `creador`: índigo-violeta (50 `#f1f0fd`, 500 `#5b45d8`, 600 `#4a37b8`). Complementario, mismo lightness/chroma aproximado que el de talento.

Ambos pares 500/blanco y 600/blanco pasan contraste AA para texto e íconos; el 50 es solo fondo.

**Alternativas descartadas:** (a) clases condicionales `modoActivo === 'talento' ? 'text-talento-500' : 'text-creador-500'` en cada componente — se disemina la decisión y Tailwind necesita ver ambas clases; (b) reusar los colores de familia de oficio como acento — chocan con las etiquetas de disciplina que ya los usan en la misma pantalla.

### 2. Carga de imágenes: `next/image` con el loader por defecto (Image Optimization de Vercel), envuelto en `<Imagen>`

`next/image` por defecto delega el redimensionado y el formato moderno (WebP/AVIF) a la Image Optimization de Vercel, que ya está disponible en este deploy. Solo hace falta declarar el host en `next.config.mjs`:

```js
images: {
  remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
}
```

`<Imagen>` (`src/components/ui/imagen.tsx`) es un wrapper delgado sobre `next/image` que fija las decisiones de la spec:

- Exige `alt` (string, puede ser `""` para decorativas).
- Dos formas de uso: `fill` (el contenedor declara `position: relative` y `aspect-ratio`, la imagen hace `object-cover`) para tarjetas y portfolio; `width`/`height` explícitos para avatares.
- `sizes` obligatorio en modo `fill` para que Vercel pida el ancho correcto (Decisión de la spec "se solicitan al tamaño en que se muestran").
- `placeholder`: `empty` con un fondo `bg-ink-100` + `animate-pulse` en el contenedor mientras `onLoad` no disparó; sin `blurDataURL` porque las fotos vienen de storage y no tenemos el hash en build. (Ver Open Questions.)
- `onError`: renderiza el `fallback` que le pasen (inicial o ícono) en el mismo espacio.
- `loading="lazy"` salvo `priority` explícito.

**Alternativas descartadas:** (a) loader al render endpoint de Supabase (`/storage/v1/render/image/...?width=`) — es una feature de plan **Pro**; en el plan actual devuelve 400 y dejaría todas las fotos rotas. Queda como opción futura si se sube de plan, cambiando solo el `loader` de `<Imagen>`. (b) Seguir con `<img>` + `width`/`height` a mano — resuelve el layout shift pero no el peso ni el formato, y no hay placeholder.

### 3. Movimiento: un módulo con variantes + hook, y `prefers-reduced-motion` resuelto en CSS y en JS

`src/components/ui/movimiento.tsx`:

- `usePrefiereReduccion()`: hook que lee `window.matchMedia('(prefers-reduced-motion: reduce)')` y se suscribe a cambios.
- Variantes exportadas para `framer-motion`: `entradaLista` (contenedor con `staggerChildren`), `entradaItem` (y+fade), `toque` (`whileTap={{ scale: 0.98 }}`).
- `<TransicionPagina>`: wrapper client para el `children` del layout de `(app)`, con `AnimatePresence` por `pathname`.
- Cada consumidor pasa las variantes a `initial=false` / desactiva el `stagger` cuando el hook devuelve `true`.

Además, red de seguridad en `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

Así, aunque un componente se olvide del hook, la preferencia se respeta. La spec exige que ningún contenido quede oculto esperando animación: las variantes usan `initial` visible-equivalente cuando hay reducción, nunca `opacity: 0` permanente.

**Alternativa descartada:** solo la regla CSS. No alcanza para `framer-motion`, que anima con transforms inline vía JS y no siempre por `transition`/`animation` CSS.

### 4. Conmutador de modo: dos nodos, el botón nombra el destino

`conmutador-modo.tsx` con ambos perfiles pasa de un `<button>` que muestra `ETIQUETA[modoActivo]` a:

```
<span> Estás en {ETIQUETA[modoActivo]} </span>
<button onClick={conmutar(otro)} aria-label={`Cambiar a ${ETIQUETA[otro]}`}> Cambiar a {ETIQUETA[otro]} <Icono nombre="cambiar" /> </button>
```

El caso de un solo perfil no cambia (ya dice "Sumar perfil de …"). El `title` que hoy decía "Cambiar a modo Creador" mientras el texto visible decía "TALENTO" desaparece: ahora coinciden.

### 5. Gradientes y sombras: utilidades acotadas, no en botones

`@layer utilities` en `globals.css`:

- `.superficie-portada` — `linear-gradient` muy suave de `--acento-suave` a `white` (o `ink-50`), solo para el fondo del encabezado de portada y de `titulo-seccion`.
- Tarjetas de lista (`tarjeta-talento`, `tarjeta-rol`, feed de equipo): suman `shadow-tarjeta` al `hover` y una sombra más leve en reposo; el borde se mantiene.

Los botones primarios siguen sólidos (`bg-brand-500`), sin gradiente — es lo que la Decisión de producto pidió.

## Risks / Trade-offs

- **[La Image Optimization de Vercel tiene cuota en el plan]** → El proyecto ya deploya en Vercel y el volumen de fotos es bajo (perfiles y buscador). Si se acerca a la cuota, el cambio a un loader externo es local a `<Imagen>`. Mitigación inmediata: `sizes` correcto en cada uso para no generar variantes de más.
- **[`*.supabase.co` como `hostname` es amplio]** → El `pathname` lo acota a `/storage/v1/object/public/**` (solo lo público, que es lo que hoy se sirve con `getPublicUrl`). No abre nada que no estuviera ya público.
- **[El acento de creador (índigo) cerca de las etiquetas de familia `direccion` (`#4338ca`)]** → Son tonos cercanos. Mitigación: el acento de rol solo aparece en encabezado/nav/foco, nunca dentro del cuerpo donde viven las etiquetas de disciplina; no se muestran juntos en la misma zona. Verificar en la pantalla de perfil de creador.
- **[Reemplazo masivo de `<img>` puede romper un `aspect-ratio` o un `object-position` puntual]** → Migrar y revisar pantalla por pantalla (una tarea por grupo de archivos), no en un solo commit. `npm run build` valida que `next/image` acepta cada uso (falta de `width`/`height` o de `sizes` es error de build).
- **[Animación de entrada de listas percibida como lenta en navegación repetida]** → `stagger` corto (≤ 40 ms) y duración ≤ 200 ms; la transición de página no bloquea interacción.

## Migration Plan

1. Sin migración de base. Todo el cambio es frontend.
2. Orden de merge: un solo PR contra `main`. Al mergear, Vercel deploya.
3. Verificación post-deploy en `https://yalope.com`: (a) grilla del buscador con throttling de red — celdas no saltan, placeholder visible; (b) conmutar modo talento↔creador — el acento del encabezado cambia y el botón dice el destino; (c) `prefers-reduced-motion` activado en el SO — sin animaciones, nada oculto; (d) Lighthouse: sin regresión de CLS respecto de la medición previa.
4. **Rollback**: `git revert` del merge y push. Sin estado persistente que deshacer (no hay datos ni esquema tocados).

## Open Questions

- **`blurDataURL` para las fotos**: hoy no tenemos el hash de blur en build (las fotos son user-generated en storage). Se puede sumar más adelante guardando un `blurhash` por foto al subirla (`subir-fotos.tsx`) y una columna en `fotos_talento`. No cambia la spec ni la estructura de `<Imagen>` (solo pasa a poblar `placeholder="blur"`), así que queda fuera de este change.
