## 1. Configuración de Google Maps Platform

- [ ] 1.1 Crear el proyecto en Google Cloud, habilitar Places API y Geocoding API, y generar una API key
- [ ] 1.2 Restringir la key por HTTP referrer (localhost, `*.vercel.app`, dominio de producción) y por API
- [ ] 1.3 Fijar cuota diaria tope y alerta de presupuesto en Google Cloud Console
- [x] 1.4 Agregar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` a `.env.example`, a `.env.local` y a Vercel
- [x] 1.5 Documentar en `ESTADO-DEL-PROYECTO.md` la nueva dependencia externa y su costo

## 2. Base de datos: ubicación

- [x] 2.1 Migración `0018_ubicacion_geografica.sql`: habilitar las extensiones `cube` y `earthdistance`
- [x] 2.2 Agregar a `perfiles_talento`, `perfiles_creador` y `obras` las columnas `ubicacion_texto`, `ubicacion_place_id`, `ubicacion_lat`, `ubicacion_lng` y `ubicacion_pais`, nullables por ahora
- [x] 2.3 Rellenar las filas existentes mapeando las cinco locaciones del AMBA a coordenadas fijas y `ubicacion_pais = 'AR'`
- [x] 2.4 Poner `not null` en `ubicacion_texto`, `ubicacion_lat`, `ubicacion_lng` y `ubicacion_pais` una vez rellenadas
- [x] 2.5 Crear índices GiST sobre `ll_to_earth(ubicacion_lat, ubicacion_lng)` en `obras` y en `perfiles_talento`
- [x] 2.6 Agregar `radio_busqueda_metros integer default 50000` y `unidad_distancia` (enum `km` / `mi`) a `perfiles_talento`

## 3. Base de datos: género

- [x] 3.1 Migración `0019_genero.sql`: crear el enum `genero_persona` con `mujer`, `varon`, `no_binarie`, `otro`, `sin_especificar`
- [x] 3.2 Agregar a `perfiles_talento` las columnas `genero` (default `sin_especificar`, luego `not null`) y `genero_descripcion` con check de 60 caracteres
- [x] 3.3 Agregar a `roles` la columna `generos_buscados genero_persona[] not null default '{}'`
- [x] 3.4 Agregar check que impida `sin_especificar` dentro de `generos_buscados`

## 4. Base de datos: feed

- [x] 4.1 Migración `0020_vista_feed_geo.sql`: recrear la vista `feed_talento` exponiendo la ubicación de la obra y los `generos_buscados` del rol
- [x] 4.2 Reescribir `feed_para_talento` con el parámetro `p_radio_metros integer` nullable, sumando el filtro de distancia con `earth_distance` y el cruce de género
- [x] 4.3 Verificar con `explain` que el filtro de distancia usa el índice GiST
- [ ] 4.4 Aplicar las migraciones contra la base de Supabase y confirmar que las anteriores siguen corriendo en orden

## 5. Capa de ubicación en el código

- [x] 5.1 Crear `src/lib/ubicacion.ts` como única fuente de verdad: tipo `Ubicacion`, carga del script de Places, autocompletado con `sessiontoken`, y conversión de la sugerencia elegida a `Ubicacion`
- [x] 5.2 Agregar a `src/lib/ubicacion.ts` la unidad por defecto según país (`US`, `GB`, `LR`, `MM` → millas) y las conversiones metros ↔ unidad para presentación
- [x] 5.3 Definir en `src/lib/ubicacion.ts` los pasos de radio por unidad (5/10/25/50/100/200 km y 5/10/25/50/100 mi) más la opción "todo el mundo"
- [x] 5.4 Crear el componente `src/components/ui/campo-ubicacion.tsx`: input con sugerencias, estado de "no elegiste un lugar de la lista" y manejo de fallo del servicio
- [x] 5.5 Quitar `LOCACIONES` de `src/lib/constantes.ts` y agregar las opciones de género con sus etiquetas
- [x] 5.6 Regenerar `src/lib/supabase/types.ts` con el esquema nuevo

## 6. Perfiles

- [x] 6.1 Reemplazar el `select` de locación por `campo-ubicacion` en `src/components/perfil/formulario-talento.tsx`
- [x] 6.2 Agregar al formulario de talento el selector de género y el campo de autodescripción, con validación de obligatoriedad y de los 60 caracteres
- [x] 6.3 Inicializar `unidad_distancia` desde el país al crear el perfil, y no volver a pisarla al cambiar de ubicación
- [x] 6.4 Reemplazar el `select` de locación por `campo-ubicacion` en `src/components/perfil/formulario-creador.tsx`
- [x] 6.5 Mostrar género y autodescripción en `src/components/perfil/perfil-talento-detalle.tsx` y en `src/components/seleccion/bandeja-postulantes.tsx`
- [x] 6.6 Actualizar las pantallas que muestran locación (`creadores/[id]`, `obras/[id]`, `roles/[rolId]`) para usar `ubicacion_texto`

## 7. Convocatorias

- [x] 7.1 Reemplazar el input de texto de locación de ensayos por `campo-ubicacion` en `src/app/(app)/obras/nueva/page.tsx`
- [x] 7.2 Agregar al alta y edición de roles el selector múltiple de géneros buscados, con vacío por defecto y sin ofrecer `sin_especificar`
- [x] 7.3 Mostrar los géneros buscados en la lista de roles del creador, indicando "abierto a cualquier género" cuando está vacío

## 8. Feed

- [x] 8.1 Sacar de `src/components/feed/pila-tarjetas.tsx` el filtro de locación por igualdad de texto
- [x] 8.2 Pasar `radio_busqueda_metros` a `feed_para_talento` y traer las tarjetas ya filtradas del servidor
- [x] 8.3 Agregar el control de radio y unidad en el feed, persistiendo ambos en el perfil al cambiarlos
- [x] 8.4 Distinguir los dos estados de feed vacío: sin resultados por radio (con acción de ampliar) y sin convocatorias nuevas
- [x] 8.5 Actualizar `src/components/feed/tarjeta-rol.tsx` para mostrar `ubicacion_texto` de la obra

## 9. Limpieza y verificación

- [x] 9.1 Migración `0021_baja_locacion_texto.sql`: eliminar las columnas viejas `locacion` y `locacion_ensayos`, una vez desplegado el código nuevo
- [x] 9.2 Revisar los textos de la interfaz que asumen Buenos Aires y neutralizarlos
- [x] 9.3 Verificar `npm run build` y `npx tsc --noEmit` sin errores
- [ ] 9.4 Probar en producción: alta de perfil con ubicación en otro país, feed filtrado por radio, cambio de unidad, y rol con y sin géneros buscados
- [ ] 9.5 Confirmar que un talento con "prefiero no decirlo" recibe roles con género especificado
- [x] 9.6 Actualizar `ESTADO-DEL-PROYECTO.md`: el supuesto de "lista cerrada del AMBA" queda revocado
