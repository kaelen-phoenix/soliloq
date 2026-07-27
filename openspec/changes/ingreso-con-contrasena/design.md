## Context

Soliloq no tiene backend propio: el cliente habla directo con Supabase, y la autenticación es enteramente Supabase Auth. Este change no agrega infraestructura, cambia qué método de Auth usamos y cómo lo envolvemos.

La restricción de fondo es la misma de todo el prototipo: **no hay servidor donde poner lógica de seguridad**. Todo lo que decidamos acá se apoya en lo que Supabase ya garantiza (hashing, expiración de tokens, rate limiting de correos) más lo poco que podemos hacer del lado del cliente sin engañarnos sobre su valor.

Hay cuentas reales creadas con magic link. Es un prototipo, son pocas, pero no pueden quedar sin puerta de entrada.

## Goals / Non-Goals

**Goals:**
- Volver a entrar sin abrir el correo, y que el gestor de contraseñas del teléfono pueda guardarlo.
- Que una contraseña olvidada se resuelva sola, sin tocar la base a mano.
- Un solo lugar donde vivan las reglas de contraseña y los mensajes de error de Auth.
- Que ninguna URL que llega por correo pueda redirigir fuera del sitio.

**Non-Goals:**
- Reglas de complejidad de contraseña más allá del largo mínimo. Los requisitos de mayúscula/número/símbolo empujan a patrones predecibles y a anotarlas; el largo es lo que importa.
- Medidor de fortaleza, chequeo contra listas de contraseñas filtradas, o rotación obligatoria.
- Segundo factor.
- Migrar automáticamente las cuentas de magic link asignándoles una contraseña. Sin intervención de la persona no hay forma honesta de hacerlo.
- Mantener el magic link en paralelo como tercera vía.

## Decisions

### El largo mínimo es la única regla, y son 8 caracteres

Es el piso de Supabase y el que recomienda el NIST. Sumar reglas de composición encarece el alta sin mejorar nada medible, y en un prototipo cuyo problema es que la gente no vuelva, cada regla extra en el alta es deserción.

La validación vive en `validarClave()` en `src/lib/clave.ts` y se usa en el alta y en el cambio. Es validación de interfaz, para dar el mensaje antes del viaje al servidor: **la que cuenta es la de Supabase**, y por eso `weak_password` también está traducido.

### Los mensajes de error se traducen en un solo lugar, por código y no por texto

`mensajeErrorAuth(codigo, mensaje)` mapea los códigos de Supabase Auth a castellano rioplatense, con un genérico para lo que no reconocemos. Se traduce por `error.code`, no por el string en inglés: el texto de Supabase cambia entre versiones sin aviso y hacer `match` sobre él es una falla silenciosa esperando el próximo `npm update`.

El genérico nunca dice "usuario inexistente" ni nada que permita enumerar cuentas.

### Recuperar contraseña siempre responde lo mismo

`/recuperar` muestra "si existe una cuenta con ese email, te enviamos un enlace" haya o no cuenta. Decir la verdad ahí convierte el formulario en un oráculo de qué direcciones están registradas.

El costo es real y lo aceptamos: quien se equivocó de email espera un correo que no va a llegar. En un producto maduro esto se compensa con un correo de "alguien pidió recuperar y no tenés cuenta"; para el prototipo no vale la complejidad.

### La URL de callback se arma con `window.location.origin`, no con una variable de entorno

`urlCallback()` toma el origen real del navegador. Con una variable de build, cada deploy de preview de Vercel mandaría a la gente a producción al abrir el enlace del correo — el bug clásico, y difícil de ver porque en producción funciona perfecto.

Contrapartida: el origen es un valor controlado por el cliente. No es un agujero porque Supabase solo acepta redirecciones a las URL de su allowlist; ese allowlist es la defensa, y hay que mantenerlo.

### El callback acepta los dos formatos de enlace

Supabase manda `?code=` con el flujo PKCE y `?token_hash=&type=` con las plantillas de correo por defecto, y cuál llega depende de la plantilla configurada en el proyecto. Resolver ambos evita que un cambio de plantilla en el dashboard rompa el ingreso sin que nadie toque el código.

Cualquier fallo — enlace vencido, ya usado, o sin parámetros — termina en `/ingresar?error=enlace_invalido` con un aviso que ofrece pedir otro. Un enlace vencido es el caso normal, no un error del sistema, y tiene que leerse así.

### `next` y `volver` se restringen a rutas internas

Ambos vienen de una URL que viajó por correo. Se aceptan solo si empiezan con `/` y no con `//` — el `//` es lo que convierte `//evil.com` en un destino absoluto. Sin ese segundo chequeo, el filtro es decorativo.

### `/cambiar-clave` es la única ruta exenta del onboarding

Se llega ahí desde el correo de recuperación, con sesión iniciada pero potencialmente con el onboarding a medias. Si el middleware la tratara como cualquier ruta privada, redirigiría a completar el perfil y la persona nunca podría cambiar la contraseña — con el agravante de que el enlace ya se consumió.

Por eso el middleware tiene `RUTAS_SIEMPRE_DISPONIBLES` como lista aparte, evaluada **antes** de leer el estado de cuenta. Es una excepción y se documenta como tal en el código: la lista tiene que quedarse en un elemento.

### Las cuentas de magic link se recuperan por "olvidé mi contraseña"

No tienen contraseña, así que `signInWithPassword` les falla con `invalid_credentials` — el mismo error que una contraseña equivocada, sin forma de distinguirlos desde el cliente. La salida es la que ya existe: pedir el enlace de recuperación y elegir una. También pueden entrar con Google si el email coincide.

Son cuentas de prueba y son pocas; no justifica un flujo especial, pero sí una línea en la documentación de traspaso.

## Risks / Trade-offs

- **El rate limit de correos de Supabase es bajo en el plan Free** (unos pocos por hora). Alcanza para el uso real, pero en una demo donde se crean varias cuentas seguidas se choca. Está traducido como "demasiados intentos, esperá unos minutos" para que se entienda en vez de parecer una caída.
- **La confirmación de email queda activada**, así que entre crear la cuenta y poder usarla hay una ida al correo. Es fricción en el alta, pero solo una vez, y sin ella cualquiera crea cuentas con emails ajenos.
- **No hay verificación de la contraseña actual al cambiarla desde el perfil.** Supabase permite `updateUser({ password })` con la sesión activa. Si alguien deja el teléfono desbloqueado, puede quedarse con la cuenta. Se acepta para el prototipo; la mitigación honesta es pedir reautenticación y no está implementada.

## Migration Plan

1. En Supabase → Authentication → Providers: habilitar Email con contraseña, dejando la confirmación de email activada.
2. En Authentication → URL Configuration: agregar `/auth/callback` de local, de `*.vercel.app` y de producción a las redirecciones permitidas.
3. Desplegar el código. No hay migración de base de datos, así que no hay orden que respetar entre esquema y deploy.
4. Avisar a las cuentas de prueba existentes que entren por "Olvidé mi contraseña" o con Google.

Reversión: volver a `signInWithOtp` en la pantalla de ingreso. Las contraseñas ya creadas quedan en `auth.users` sin uso, no estorban.

## Open Questions

- Si el prototipo suma usuarios reales, ¿se pide reautenticación para cambiar la contraseña desde el perfil? Hoy no, y es la deuda más concreta que deja este change.
