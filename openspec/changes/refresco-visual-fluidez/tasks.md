## 1. Tokens y base visual

- [ ] 1.1 En `tailwind.config.ts` agregar los tokens de color `talento` (rampa rosa-magenta: `50 #fdf2f7`, `100 #fce7f0`, `200 #fbcfe1`, `300 #f9a8c9`, `400 #f472a6`, `500 #d81b7a`, `600 #be1367`, `700 #9d1054`, `900 #5c0a31`) y `creador` (índigo-violeta: `50 #f1f0fd`, `100 #e5e2fb`, `200 #cdc7f6`, `300 #a99eef`, `400 #7d6be4`, `500 #5b45d8`, `600 #4a37b8`, `700 #3c2d95`, `900 #241a58`). No quitar ni renombrar ningún token existente. Verificar con `npm run build` que compila y con una clase de prueba `bg-creador-500` en un componente descartable que el color sale.
- [ ] 1.2 En `src/app/globals.css`, dentro de `@layer base`, definir `--acento` / `--acento-suave` en `:root` (valores de `brand`) y sobrescribirlos en `[data-rol='talento']` y `[data-rol='creador']`. Pasar el anillo de foco de `:focus-visible` de `ring-brand-500/40` a `ring-[color:var(--acento)]/40`. Verificar en el navegador que el color del foco cambia al poner `data-rol` a mano en el `<body>`.
- [ ] 1.3 En `src/app/globals.css`, dentro de `@layer utilities`, agregar `.acento-texto` (`color: var(--acento)`), `.acento-fondo` (`background-color: var(--acento-suave)`), `.borde-acento` (`border-color: var(--acento)`), `.superficie-portada` (`linear-gradient(180deg, var(--acento-suave), transparent)`), y el bloque `@media (prefers-reduced-motion: reduce)` que fuerza `animation-duration`/`transition-duration` a `.01ms` en `*`. Verificar con `npm run build`.

## 2. Componente de imagen

- [ ] 2.1 En `next.config.mjs` agregar `images.remotePatterns` con `{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }`. Verificar con `npm run build` que arranca sin warning de config.
- [ ] 2.2 Crear `src/components/ui/imagen.tsx` (client): wrapper de `next/image` con props `{ src, alt, fill?, width?, height?, sizes?, priority?, className?, contenedorClassName?, fallback? }`. En modo `fill` el contenedor es `relative overflow-hidden` con el `aspect-ratio` que le pase el consumidor y la imagen `object-cover`; exige `sizes`. Mientras `onLoadingComplete` no disparó, el contenedor muestra `bg-ink-100 animate-pulse`. `onError` renderiza `fallback` (nodo) o, si no hay, un `bg-ink-100` con la inicial. `loading` es `lazy` salvo `priority`. Verificar con `npm run typecheck` y renderizándolo en una pantalla con una foto real: reserva el espacio, se ve el pulse y luego la foto.
- [ ] 2.3 Verificación de layout shift: abrir el buscador de talento con throttling "Slow 4G" en DevTools y confirmar en el panel Performance/Rendering que las celdas de la grilla no se desplazan al cargar las fotos (CLS ≈ 0 para esa interacción).

## 3. Movimiento

- [ ] 3.1 Crear `src/components/ui/movimiento.tsx` (client): `usePrefiereReduccion()` (matchMedia `(prefers-reduced-motion: reduce)` con suscripción a `change`); variantes `entradaLista` (`staggerChildren: 0.04`), `entradaItem` (`{ opacity: 0, y: 8 }` → `{ opacity: 1, y: 0 }`, duración `0.18`), `toque` (`whileTap: { scale: 0.98 }`). Exportar un helper `variantesSeguras(prefiereReduccion)` que devuelve variantes neutras (sin `y`, sin `opacity: 0`) cuando la preferencia está activa. Verificar con `npm run typecheck`.
- [ ] 3.2 Crear `src/components/ui/transicion-pagina.tsx` (client): envuelve `children` con `motion.div` + key por `usePathname()`; `entrada` corta (fade + `y: 4`), desactivada cuando `usePrefiereReduccion()` es `true`. Verificar navegando entre dos pantallas de `(app)` con y sin la preferencia del SO activa: con ella activa no hay transición y nada queda invisible.

## 4. Acento por rol en el layout

- [ ] 4.1 En el layout server de `(app)` (`src/app/(app)/layout.tsx` o el contenedor equivalente que ya lee `leerEstadoCuenta`), poner `data-rol={modoActivo}` en el contenedor raíz del área autenticada y envolver el `children` con `<TransicionPagina>`. Verificar que en el DOM aparece `data-rol="talento"` / `"creador"` según el modo y que el foco toma el color del acento correspondiente.
- [ ] 4.2 En `src/components/layout/titulo-seccion.tsx` aplicar `.superficie-portada` al fondo del encabezado y subir el título un escalón (`text-2xl`, `font-display` donde hoy es `sans`). Verificar visualmente en dos pantallas (una de talento, una de creador) que el degradé usa el acento del rol.
- [ ] 4.3 En la barra lateral (`barra-lateral.tsx`) y la inferior (`barra-navegacion.tsx`), el ítem activo usa `.acento-texto` y un fondo `.acento-fondo` en vez de los `brand-*`/`ink-*` actuales para el estado activo. Verificar que al conmutar de modo el resaltado del ítem activo cambia de color.

## 5. Conmutador de modo

- [ ] 5.1 En `src/components/layout/conmutador-modo.tsx`, para el caso `tieneAmbosPerfiles`, reemplazar el `<button>` único por: un `<span>` no interactivo "Estás en {ETIQUETA[modoActivo]}" y un `<button>` separado con texto "Cambiar a {ETIQUETA[otro]}" + `Icono nombre="cambiar"`, `aria-label={`Cambiar a ${ETIQUETA[otro]}`}` y sin `title` contradictorio. Mantener `useTransition` + `conmutarModo(otro)` y el estado `disabled` durante la transición. El caso de un solo perfil queda igual. Verificar: en modo talento el botón dice "Cambiar a Creador" y al tocarlo se queda en creador; el lector de pantalla anuncia el destino, no el estado.

## 6. Reemplazo de `<img>` por `<Imagen>`

- [ ] 6.1 Buscador y feed: `src/components/talento/tarjeta-talento.tsx` (foto `fill`, `aspect-[3/4]`, `sizes="(max-width: 640px) 50vw, 200px"`, `priority` en las primeras de la grilla si es simple, si no ninguna), `src/components/feed/tarjeta-rol.tsx` (avatar `width={28} height={28}`). Sumar `shadow-tarjeta` en `hover` a la tarjeta de talento. Verificar con `npm run build` y viendo la grilla: fotos con placeholder, sin salto.
- [ ] 6.2 Perfil: `src/app/(app)/perfil/page.tsx` y `src/components/perfil/formulario-creador.tsx` (avatar redondo `width={64} height={64}`, `fallback` = inicial), `src/components/perfil/perfil-talento-detalle.tsx` y `src/components/perfil/subir-fotos.tsx` (portfolio `fill`, `aspect-[3/4]` / `aspect-square`, `sizes`), `src/components/perfil/vidriera-publica.tsx`. Verificar `npm run build` y las pantallas de perfil propio (talento y creador).
- [ ] 6.3 Resto de avatares: `src/components/notificaciones/lista-notificaciones.tsx`, `src/components/salas/sala-chat.tsx`, `src/components/seleccion/bandeja-postulantes.tsx`, `src/components/equipo/feed-equipo.tsx`, `src/app/(app)/creadores/[id]/page.tsx`. Todos con `width`/`height` explícitos y `fallback` de inicial. Verificar `npm run build` y `grep -rn "<img" src` → sin resultados (o solo los `eslint-disable` que se quiten).

## 7. Movimiento en listas y estados

- [ ] 7.1 Aplicar `entradaLista`/`entradaItem` (vía `variantesSeguras`) a la grilla del buscador (`buscador-talento.tsx`) y al feed de equipo (`feed-equipo.tsx`). `whileTap={toque}` en `TarjetaTalento` y en `Boton`. Verificar que con `prefers-reduced-motion` activo los ítems aparecen sin desplazamiento y ninguno queda en `opacity: 0`.
- [ ] 7.2 Revisar que cada pantalla de lista de `(app)` (buscador, postulaciones, salas, equipo, notificaciones, mis proyectos) tenga estado de carga con skeleton (reusar `esqueleto.tsx`) y estado vacío con texto (reusar `estado-vacio.tsx`). Sumar el que falte. Verificar cada pantalla con datos y sin datos.

## 8. Verificación integral

- [ ] 8.1 `npm run lint && npm run typecheck && npm run build` en verde.
- [ ] 8.2 Recorrido manual en dev: conmutar talento↔creador (acento del encabezado y del ítem activo cambia; botón nombra el destino); grilla del buscador con red lenta (sin salto, placeholder); `prefers-reduced-motion` en el SO (sin animaciones, nada oculto); etiquetas de familia de oficio y mensajes de estado sin cambios de color.
- [ ] 8.3 Merge del PR a `main`; CI en verde; deploy de Vercel a producción en verde. Smoke-test en `https://yalope.com`: home y buscador cargan sin 500; fotos con placeholder; Lighthouse sin regresión de CLS respecto de la corrida previa. Marcar tareas y actualizar el issue #8.
