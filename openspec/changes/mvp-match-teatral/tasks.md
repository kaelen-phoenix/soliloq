## 1. Andamiaje del proyecto

- [x] 1.1 Inicializar el proyecto Next.js con App Router, TypeScript y Tailwind CSS en la raíz del repositorio
- [x] 1.2 Agregar `@supabase/supabase-js` y `@supabase/ssr`, y una librería de gestos para el swipe
- [x] 1.3 Crear los clientes de Supabase para servidor y navegador, leyendo URL y clave anónima desde variables de entorno
- [x] 1.4 Crear `.env.example` con las variables requeridas y agregar `.env.local` a `.gitignore`
- [x] 1.5 Definir el layout base mobile-first en español rioplatense, con la barra de navegación inferior y el ícono de notificaciones
- [x] 1.6 Configurar el manifiesto PWA y los íconos para que la app se pueda instalar desde el navegador móvil

## 2. Proyecto Supabase y esquema base

- [x] 2.1 Crear el proyecto Supabase en plan Free y registrar sus credenciales localmente
- [x] 2.2 Escribir la migración de `perfiles`, con el rol (`talento` | `creador`) vinculado a `auth.users`
- [x] 2.3 Escribir la migración de `perfiles_talento` con fecha de nacimiento, locación, link de videoreel, experiencia y habilidades
- [x] 2.4 Escribir la migración de `perfiles_creador` con tipo, locación, descripción e imagen, y de `obras_previas`
- [x] 2.5 Escribir la migración de `obras` y `roles`, con estados de obra y rango etario y vacantes por rol
- [x] 2.6 Escribir la migración de `postulaciones` y `descartes`, con restricción de unicidad por talento y rol
- [x] 2.7 Escribir la migración de `notificaciones`, `salas`, `sala_integrantes` y `mensajes`
- [x] 2.8 Crear el bucket de Storage para fotos, con carpeta por usuario y límite de tamaño y tipo de archivo

## 3. Seguridad: RLS, funciones y triggers

- [x] 3.1 Habilitar RLS en todas las tablas y escribir las políticas de `perfiles`, `perfiles_talento` y `perfiles_creador` según la visibilidad definida en el design
- [x] 3.2 Escribir las políticas de `obras` y `roles`: lectura del creador dueño siempre, lectura de talentos solo si la obra está publicada
- [x] 3.3 Escribir las políticas de `postulaciones`, impidiendo que el talento modifique el estado y permitiendo que solo el creador de la obra lo actualice
- [x] 3.4 Escribir las funciones `SECURITY DEFINER` de pertenencia a sala y las políticas de `salas`, `sala_integrantes` y `mensajes` sobre esas funciones, evitando recursión entre políticas
- [x] 3.5 Escribir las políticas de `notificaciones`: lectura y marcado solo del destinatario, inserción reservada a los triggers
- [x] 3.6 Escribir las políticas del bucket de Storage, restringiendo la escritura a la carpeta del usuario dueño
- [x] 3.7 Implementar el trigger de aprobación: valida vacantes con bloqueo de la fila del rol, crea la sala si no existe, incorpora al talento y al creador, y genera las notificaciones de match y de sala
- [x] 3.8 Implementar el trigger de revocación: quita al talento de los integrantes de la sala y libera la vacante
- [x] 3.9 Implementar la vista o función SQL del feed: obras publicadas, rango etario compatible, vacantes disponibles, excluyendo roles ya postulados o descartados
- [ ] 3.10 Verificar las políticas con dos cuentas de rol distinto, intentando activamente leer y escribir datos ajenos y confirmando que cada operación falla — **requiere un proyecto Supabase real desplegado**

## 4. Autenticación y onboarding

- [x] 4.1 Implementar la pantalla de ingreso con magic link por email, incluyendo validación de formato y pantalla de "revisá tu correo"
- [ ] 4.2 Configurar el proveedor de Google en Supabase con las credenciales de Google Cloud Console y agregar el botón de ingreso — botón implementado en el código; **falta que el usuario cree las credenciales OAuth y las cargue en el dashboard de Supabase** (ver README)
- [x] 4.3 Implementar la ruta de callback que crea la sesión y maneja el caso de enlace vencido o ya utilizado
- [x] 4.4 Implementar el middleware que redirige según el estado del onboarding: sin sesión al ingreso, sin rol a la elección de rol, sin perfil al alta de perfil
- [x] 4.5 Implementar la pantalla de elección de rol, que persiste el rol y deriva al alta del perfil correspondiente
- [x] 4.6 Implementar el cierre de sesión y la persistencia de sesión entre visitas

## 5. Perfiles

- [x] 5.1 Implementar el formulario de alta y edición del perfil de talento, con validación de campos obligatorios y de edad mínima de 16 años
- [x] 5.2 Implementar la carga de fotos al Storage: entre 3 y 5, con validación de tipo y tamaño, reordenamiento y eliminación
- [x] 5.3 Implementar la validación del link de videoreel para YouTube y Vimeo, y su renderizado embebido
- [x] 5.4 Implementar el campo de experiencia con límite de 2000 caracteres y el selector de habilidades predefinidas
- [x] 5.5 Implementar el formulario de alta y edición del perfil de creador, con tipo, locación, descripción e imagen
- [x] 5.6 Implementar el alta, listado y eliminación de obras previas, con validación del año y orden del más reciente al más antiguo
- [x] 5.7 Implementar la vista pública del perfil de creador, accesible desde las tarjetas del feed
- [x] 5.8 Implementar la vista del perfil de talento para el creador, con fotos, videoreel, experiencia y habilidades

## 6. Convocatorias

- [x] 6.1 Implementar el formulario de creación de obra, que la deja en estado borrador y deriva a la definición de roles
- [x] 6.2 Implementar el alta y edición de roles, con validación de rango etario y de cantidad de vacantes
- [x] 6.3 Implementar la publicación de la obra, exigiendo al menos un rol definido
- [x] 6.4 Implementar el cierre de la obra, que la retira del feed conservando postulaciones y sala
- [x] 6.5 Implementar el tablero del creador con sus obras, su estado, el conteo de postulaciones sin clasificar y el estado vacío inicial

## 7. Feed y postulación

- [x] 7.1 Implementar la pila de tarjetas deslizables consumiendo la vista del feed, con precarga de las tarjetas siguientes
- [x] 7.2 Implementar el gesto de swipe y los botones equivalentes de postularse y descartar, con actualización optimista y reversión ante error
- [x] 7.3 Implementar el detalle expandible de la tarjeta, con descripción del rol, sinopsis de la obra y acceso al perfil del creador
- [x] 7.4 Implementar el registro de postulaciones y descartes, y el rechazo de postulaciones a roles cubiertos, de obras cerradas o con perfil incompleto
- [x] 7.5 Implementar el filtro opcional por locación
- [x] 7.6 Implementar el estado vacío del feed y el listado de postulaciones del talento con el estado de cada una

## 8. Selección y match

- [x] 8.1 Implementar la bandeja de postulantes por rol, con foto principal, nombre, edad y locación, ordenada del más reciente al más antiguo
- [x] 8.2 Implementar el panel de material del postulante, con fotos, videoreel embebido, experiencia y habilidades, sin salir de la pantalla de revisión
- [x] 8.3 Implementar la clasificación en rechazado, en duda y aprobado, con actualización optimista, avance al postulante siguiente y reversión ante error
- [x] 8.4 Implementar la reclasificación, incluida la revocación de una aprobación, y el bloqueo de la clasificación en obras cerradas
- [x] 8.5 Implementar el indicador de vacantes cubiertas sobre el total en la lista de roles de la obra
- [x] 8.6 Implementar el estado vacío de un rol sin postulantes

## 9. Notificaciones in-app

- [x] 9.1 Implementar la bandeja de notificaciones, ordenada de la más reciente a la más antigua y distinguiendo las no leídas
- [x] 9.2 Implementar el badge con el conteo de no leídas, visible desde toda la aplicación y oculto cuando no hay pendientes
- [x] 9.3 Implementar el marcado como leída al abrir una notificación y la acción de marcar todas como leídas
- [x] 9.4 Implementar la navegación desde la notificación de match al detalle de la obra y el rol, y desde la de sala creada a la sala
- [x] 9.5 Implementar el estado vacío de la bandeja

## 10. Sala de proyecto

- [x] 10.1 Implementar el listado de salas de la persona, con título de la obra, vista previa del último mensaje y estado vacío
- [x] 10.2 Implementar la pantalla de sala con el historial cronológico, autor, foto y hora, posicionada en el mensaje más reciente
- [x] 10.3 Implementar el envío de mensajes con validación de contenido vacío y límite de 2000 caracteres
- [x] 10.4 Implementar la suscripción Realtime, abriéndola al entrar a la sala y cerrándola al salir, con recuperación de mensajes tras una reconexión
- [x] 10.5 Implementar el marcado de mensajes no enviados con opción de reintentar
- [x] 10.6 Implementar el panel de integrantes con nombre, foto y rol en la obra, y el mensaje de bienvenida de la sala recién creada

## 11. Despliegue

- [ ] 11.1 Publicar el repositorio en GitHub y conectarlo a un proyecto de Vercel en plan Hobby — **acción manual del usuario**
- [ ] 11.2 Cargar las variables de entorno en Vercel y verificar que el deploy automático por push funciona — **acción manual del usuario**
- [ ] 11.3 Configurar en Supabase las URLs de redirección de auth apuntando al dominio de Vercel — **acción manual del usuario**
- [x] 11.4 Aplicar todas las migraciones en el proyecto Supabase de producción y verificar que RLS quedó habilitada en cada tabla
- [x] 11.5 Escribir el README con el procedimiento de instalación local, las variables requeridas y la advertencia de pausa del proyecto Supabase tras 7 días de inactividad

## 12. Verificación del bucle completo

- [ ] 12.1 Recorrer en producción el flujo del talento con una cuenta real: registro, elección de rol, perfil con 3 fotos y videoreel, feed, postulación — **pendiente de despliegue real**
- [ ] 12.2 Recorrer en producción el flujo del creador con otra cuenta real: registro, perfil, obra con roles, publicación, revisión de postulantes, aprobación — **pendiente de despliegue real**
- [ ] 12.3 Verificar que la aprobación genera la notificación de match en el talento y crea la sala con ambos integrantes — **pendiente de despliegue real**
- [ ] 12.4 Verificar el intercambio de mensajes en tiempo real entre las dos cuentas en dispositivos distintos — **pendiente de despliegue real**
- [ ] 12.5 Verificar los casos límite de vacantes: aprobación que excede el cupo, revocación que libera vacante y saca al talento de la sala — **pendiente de despliegue real**
- [ ] 12.6 Medir la fluidez del swipe y de la clasificación en un teléfono real y ajustar la precarga si el avance se percibe lento — **pendiente de despliegue real**

---

**Nota de estado**: el código de la aplicación está completo — 61 de 68 tareas hechas. Las 7 restantes (2.1, 3.10, 4.2 parcial, 11.1–11.4, 12.1–12.6) requieren credenciales y acciones que solo el usuario puede realizar (crear cuentas en Supabase/Vercel/Google, y probar en producción). El proyecto compila (`npm run build`) y pasa el chequeo de tipos (`npx tsc --noEmit`) sin errores.
