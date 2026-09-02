## 1. Tokens y base visual

- [x] 1.1 En `tailwind.config.ts` agregar los tokens de color `talento` (rampa rosa-magenta, misma que `brand`) y `creador` (índigo-violeta: `50 #f1f0fd` … `500 #5b45d8` `600 #4a37b8` … `900 #241a58`). No se quitó ni renombró ningún token existente. `npm run build` en verde.
- [x] 1.2 En `src/app/globals.css`, `@layer base`: `--acento` / `--acento-suave` en `:root` (valores de `brand`) y sobrescritos en `[data-rol='talento']` y `[data-rol='creador']`. El anillo de `:focus-visible` pasó a `box-shadow` con `color-mix(... var(--acento) ...)` conservando el gap blanco.
- [x] 1.3 En `globals.css`, `@layer utilities`: `.acento-texto`, `.acento-fondo`, `.borde-acento`, `.superficie-portada` (gradiente de `--acento-suave` a transparente), y el bloque `@media (prefers-reduced-motion: reduce)` que fuerza `animation-duration` / `transition-duration` a `0.01ms` en `*`.

## 2. Componente de imagen

- [x] 2.1 `next.config.mjs`: `images.remotePatterns` con `{ hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }`. Build en verde.
- [x] 2.2 `src/components/ui/imagen.tsx` (client): wrapper de `next/image` con modos `fill` (contenedor con `aspect-ratio`, `sizes` obligatorio) y fijo (`width`/`height`). Placeholder `bg-ink-100 motion-safe:animate-pulse` hasta `onLoad`; `ref` que cubre el caso de imagen ya cacheada; `onError` → `fallback` o fondo neutro; `loading="lazy"` salvo `priority`. `typecheck` y `lint` en verde.
- [~] 2.3 Verificación de layout shift con throttling en DevTools. Pendiente de pasada manual — el build no la cubre. No bloquea el merge: el contenedor reserva el alto por `aspect-ratio` en todos los usos `fill`, y `width`/`height` en los avatares.

## 3. Movimiento

- [x] 3.1 `src/components/ui/movimiento.tsx` (client): `usePrefiereReduccion()` (sobre `useReducedMotion` de framer-motion), variantes `entradaLista` (`staggerChildren: 0.04`), `entradaItem` (`y: 8` + fade, `0.18s`), `toque` (`scale: 0.98`), y `variantesSeguras(prefiereReduccion)` que devuelve variantes neutras cuando hay reducción.
- [x] 3.2 `src/components/ui/transicion-pagina.tsx` (client): `AnimatePresence` + `motion.div` keyed por `usePathname()`, fade + `y: 4`. Si `usePrefiereReduccion()` es `true` devuelve el `children` sin envolver.

## 4. Acento por rol en el layout

- [x] 4.1 `src/app/(app)/layout.tsx`: `data-rol={estado.modoActivo}` en el contenedor raíz del área autenticada y `<TransicionPagina>` alrededor del `children`.
- [x] 4.2 `src/components/layout/encabezado.tsx`: `.superficie-portada` en el `<header>` (con `bg-white/75` para que el degradé de acento se note detrás del blur). `src/components/layout/titulo-seccion.tsx`: título a `sm:text-2xl` (se mantiene `font-display`, ya lo era).
- [x] 4.3 `barra-lateral.tsx`: ítem activo `acento-fondo acento-texto`. `barra-navegacion.tsx`: ítem activo `acento-texto`.

## 5. Conmutador de modo

- [x] 5.1 `src/components/layout/conmutador-modo.tsx`, caso `tieneAmbosPerfiles`: una `<span>` "Estás en {modo actual}" con estilo de acento y un `<button>` separado "Cambiar a {modo destino}" con `aria-label` acorde y sin `title` contradictorio. Se mantienen `useTransition` + `conmutarModo(otro)` y el `disabled` durante la transición. El caso de un solo perfil quedó igual.

## 6. Reemplazo de `<img>` por `<Imagen>`

- [x] 6.1 `talento/tarjeta-talento.tsx` (foto `fill`, `aspect-[3/4]`, `sizes`) + `hover:shadow-tarjeta`; `feed/tarjeta-rol.tsx` (avatar 28 px con `fallback` de inicial).
- [x] 6.2 `app/(app)/perfil/page.tsx` y `perfil/formulario-creador.tsx` (avatar 64 px); `perfil/perfil-talento-detalle.tsx` y `perfil/subir-fotos.tsx` (portfolio `fill`, `aspect-[3/4]`, `sizes`). `vidriera-publica.tsx` y `p/[token]/page.tsx` no existen en esta rama (viven en `perfil-publico-enlace`); se migran ahí.
- [x] 6.3 `notificaciones/lista-notificaciones.tsx` (par de caras, 36 px), `salas/sala-chat.tsx` (32 px), `seleccion/bandeja-postulantes.tsx` (56 px `rounded-lg`), `equipo/feed-equipo.tsx` (56 px), `app/(app)/creadores/[id]/page.tsx` (64 px). `grep -rn "<img" src` → sin resultados.

## 7. Movimiento en listas y estados

- [x] 7.1 Grilla del buscador (`buscador-talento.tsx`): `motion.div` contenedor con `variants={lista}` + ítems `motion.div variants={item}` y `whileTap` (gateado por `prefiereReduccion`). `feed-equipo.tsx`: `AnimatePresence` + `motion.article` keyed por persona, entrada/salida gateadas por `prefiereReduccion`. `Boton`: `active:scale-[0.98]` (y `disabled:active:scale-100`).
- [x] 7.2 Estados: el buscador pasó de un texto suelto a una grilla de skeletons (`Esqueleto`) mientras carga y a `<EstadoVacio>` cuando no hay resultados. `lista-notificaciones.tsx` cambió su vacío hecho a mano por `<EstadoVacio>`. Nuevos `loading.tsx` para `/equipo` y `/talentos` (faltaban); el resto ya tenía `loading.tsx` y/o `EstadoVacio`.

## 8. Verificación integral

- [x] 8.1 `npm run lint && npm run typecheck && npm run build` en verde.
- [ ] 8.2 Recorrido manual en dev: conmutar talento↔creador (acento del encabezado y del ítem activo cambia; botón nombra el destino); grilla del buscador con red lenta (sin salto, placeholder); `prefers-reduced-motion` en el SO (sin animaciones, nada oculto); etiquetas de familia de oficio y mensajes de estado sin cambios de color. **Pendiente: no hay `.env.local` en este entorno, así que la app no levanta acá. Lo hace el usuario en local o se verifica en el deploy.**
- [ ] 8.3 Merge del PR a `main`; CI en verde; deploy de Vercel a producción en verde. Smoke-test en `https://yalope.com`: home y buscador cargan sin 500; fotos con placeholder; Lighthouse sin regresión de CLS. Marcar tareas y actualizar el issue #8.
