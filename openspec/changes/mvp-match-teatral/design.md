## Context

Repositorio vacío: este change define la primera implementación completa del prototipo. La restricción dominante es doble — **entregar el prototipo lo antes posible** y **operar íntegramente en free tier**, sin tarjeta de crédito ni costo recurrente. Todo lo demás se subordina a eso.

La segunda restricción, funcional, es que la mecánica de match tiene que sentirse instantánea. Eso empuja hacia lecturas optimistas en la interfaz y precarga de las tarjetas siguientes: la percepción de velocidad importa más que la consistencia estricta en las acciones de swipe.

La tercera es de seguridad: al no haber backend propio, el cliente habla directamente con Postgres a través de la API de Supabase. **Row Level Security es la única barrera de autorización**, así que las políticas no son un detalle de implementación sino la superficie de seguridad completa del sistema.

## Goals / Non-Goals

**Goals:**
- Cerrar el bucle completo: un talento se registra, ve convocatorias, se postula; un director la publica, lo aprueba, y ambos terminan conversando en una sala compartida.
- Desplegar en una URL pública con deploy automático por push, sin costo.
- Que la interfaz de swipe y la de clasificación de postulantes respondan sin latencia perceptible.
- Un modelo de datos relacional que soporte los filtros del feed sin trabajo del cliente.
- Políticas RLS verificables, con un procedimiento de prueba explícito.

**Non-Goals:**
- Escalabilidad más allá de una demo con decenas de usuarios. Sin CDN de imágenes, sin caché distribuida, sin paginación infinita.
- Pagos, planes premium, B2B, blockchain, perfiles de grandes ligas.
- Push notifications y notificaciones por email.
- Algoritmo de recomendación. El feed ordena por fecha de publicación, no por afinidad.
- Moderación de contenido, reportes o bloqueo entre usuarios.
- Tests end-to-end automatizados. La verificación del prototipo es manual y guiada por los escenarios de las specs.

## Decisions

### Supabase como backend completo, sin servidor propio

Supabase cubre en un solo producto lo que el prototipo necesita: Postgres relacional, autenticación con magic link y OAuth, storage de imágenes y suscripciones en tiempo real. Escribir una API propia implicaría construir auth, storage y websockets a mano y agregar un servicio más que hostear gratis.

*Alternativas descartadas:* Firebase resuelve chat y push más rápido, pero su modelo NoSQL complica los filtros del feed (rango etario cruzado con estado de obra y exclusión de roles ya clasificados es una query relacional natural y un dolor en Firestore). Una API propia en NestJS da control del dominio pero es incompatible con el objetivo de velocidad de entrega.

### Next.js App Router en Vercel Hobby

Vercel es el hosting gratuito con mejor integración con Next.js: deploy por push a GitHub, preview por rama y HTTPS con dominio `*.vercel.app` sin configuración. El App Router permite renderizar en servidor las pantallas de lectura (perfiles, tablero, listados) y dejar en cliente solo lo interactivo (swipe, clasificación, chat).

*Alternativa descartada:* app nativa con Expo. Da mejor sensación táctil y push reales, pero suma el ciclo de build y distribución (TestFlight, APK) a la validación. Como PWA responsive, el prototipo se comparte con un link.

### Todas las reglas de acceso viven en RLS

Cada tabla lleva RLS habilitada desde su migración, nunca como paso posterior. Las políticas se derivan directamente de los requisitos de visibilidad de las specs:

- `perfiles_talento`: lectura propia siempre; lectura por un creador solo si existe una postulación de ese talento a un rol de una obra suya. Escritura solo propia.
- `perfiles_creador`: lectura para cualquier usuario autenticado. Escritura solo propia.
- `obras` y `roles`: lectura por su creador siempre; lectura por talentos solo si la obra está `publicada`. Escritura solo del creador dueño.
- `postulaciones`: lectura y alta por el talento dueño; lectura y actualización de estado por el creador de la obra. El talento **no** puede modificar el estado — esa columna se protege con una política de update restringida al creador.
- `notificaciones`: lectura y marcado como leída solo del destinatario. La inserción la hace el trigger, no el cliente.
- `salas` y `mensajes`: lectura y escritura solo para integrantes de la sala.

Las políticas que dependen de pertenencia (¿es este usuario integrante de esta sala?) se implementan con funciones `SECURITY DEFINER` para evitar recursión infinita entre políticas de tablas que se referencian mutuamente — un error clásico y difícil de diagnosticar en Supabase.

### La sala de proyecto se crea por trigger en base de datos, no en el cliente

Cuando una postulación pasa a `aprobado`, un trigger de Postgres crea la sala de la obra si no existe, agrega al talento y al creador como integrantes, y genera las notificaciones. Ponerlo en el cliente significaría que una desconexión a mitad de camino deja un match aprobado sin sala y sin aviso. En el trigger, todo ocurre en la misma transacción que la aprobación: o pasa entero o no pasa nada.

El mismo trigger maneja la revocación: al pasar de `aprobado` a otro estado, quita al talento de los integrantes y libera la vacante.

### Edad derivada, nunca almacenada

El perfil guarda `fecha_nacimiento`; la edad se calcula en las queries. Guardar la edad como número la vuelve incorrecta con el paso del tiempo, y el filtro etario del feed es justamente lo que decide qué ve cada talento.

### Las clasificaciones del feed se registran como filas, no como estado en el cliente

Descartar una tarjeta inserta una fila en `descartes`. Es lo que permite que el feed no repita roles ya vistos entre sesiones y dispositivos, con una sola query del lado del servidor.

### Interacciones optimistas en swipe y clasificación

El swipe y la clasificación de postulantes actualizan la interfaz de inmediato y persisten en segundo plano; ante un fallo, revierten y avisan. Es lo que sostiene el requisito de que el match se sienta instantáneo. Las pantallas de lectura no usan optimismo: se renderizan en servidor con datos reales.

### Storage solo para imágenes, videoreel por link

Las fotos van a un bucket de Supabase Storage con políticas por carpeta de usuario. El videoreel es una URL de YouTube o Vimeo validada por patrón y renderizada como embed. Almacenar video consumiría el free tier en pocos perfiles.

### Vista SQL para el feed

El filtro del feed (obra publicada + rango etario compatible + vacantes disponibles + no postulado + no descartado) se resuelve en una vista o función SQL, no componiendo queries en el cliente. Mantiene la lógica en un solo lugar y evita traer al navegador roles que el talento no debe ver.

## Risks / Trade-offs

**El proyecto Supabase Free se pausa tras 7 días de inactividad** → Se documenta en el README con el procedimiento de reactivación. Antes de una demo agendada, abrir la app el día anterior. Si el prototipo queda en uso real, es la primera razón para pasar al plan pago.

**Una política RLS mal escrita es una filtración de datos directa**, sin backend que la ataje → Las tareas incluyen un paso de verificación explícito: probar cada política con dos cuentas de rol distinto e intentar activamente leer y escribir datos ajenos, verificando que la operación falle.

**Recursión infinita entre políticas** de `salas` y `sala_integrantes` → Se resuelve con funciones `SECURITY DEFINER` para las comprobaciones de pertenencia, en lugar de subqueries entre tablas con RLS.

**Concurrencia sobre las vacantes**: dos aprobaciones simultáneas podrían exceder el cupo → El control se implementa dentro del trigger con bloqueo de la fila del rol, no como un chequeo previo en el cliente.

**La UI optimista puede mostrar un estado que no se persistió** → Cada acción optimista revierte visiblemente ante el error y ofrece reintentar; nunca falla en silencio.

**200 conexiones Realtime concurrentes en el free tier** → Suficiente para la demo. La suscripción se abre solo al entrar a una sala y se cierra al salir, no de forma global.

**Sin moderación ni reportes** → Riesgo aceptado y explícito para el prototipo: la validación se hace con usuarios invitados, no con registro abierto al público.

**Las claves de Supabase quedan expuestas en el cliente** → Es lo esperado con la clave anónima, cuya seguridad depende enteramente de RLS. La clave de servicio no se usa en la aplicación ni se sube a Vercel.

## Migration Plan

No hay migración de datos: es un sistema nuevo. El despliegue sigue este orden:

1. Crear el proyecto Supabase y aplicar las migraciones SQL en orden (tablas → RLS → funciones → triggers → bucket de storage).
2. Configurar los proveedores de auth: magic link y credenciales OAuth de Google, con las URLs de redirección del dominio de Vercel.
3. Conectar el repositorio de GitHub a Vercel y cargar las variables de entorno (URL del proyecto y clave anónima).
4. Verificar el bucle completo en producción con dos cuentas reales, una por rol, recorriendo los escenarios de las specs.

*Rollback:* revertir el commit en la rama principal alcanza para el frontend — Vercel redespliega el estado anterior automáticamente. Los cambios de esquema se revierten aplicando la migración inversa; mientras el prototipo no tenga datos reales, recrear el esquema desde cero es una opción válida.

## Open Questions

- **Alta de las cuentas de prueba para la demo**: ¿se invita a un grupo cerrado o el registro queda abierto? Afecta si hace falta una lista blanca de emails. Se asume registro abierto hasta que se indique lo contrario.
- **Locación como texto libre o lista cerrada**: el filtro por locación del feed funciona mucho mejor con una lista predefinida de ciudades. Se asume una lista cerrada acotada al AMBA para el prototipo, ampliable después.
- **Idioma del contenido de Supabase Auth**: los emails de magic link salen en inglés por defecto. Traducir la plantilla es un ajuste menor de configuración; queda pendiente confirmar si entra en el alcance de la demo.
