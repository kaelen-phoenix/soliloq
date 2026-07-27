## Why

El ingreso por magic link parecía la opción de menor fricción y resultó ser la contraria. En las primeras pruebas de uso el enlace tarda, cae en spam, o abre en el navegador interno de la aplicación de correo — que no comparte cookies con el navegador donde la persona venía usando Soliloq, así que la sesión se crea en el lugar equivocado. Peor todavía en móvil, que es donde vive el producto: para volver a entrar hay que repetir la ida al correo **cada vez**, porque no hay nada que la persona pueda recordar ni que el gestor de contraseñas pueda guardar.

Para un prototipo cuya única métrica es si la gente vuelve, un ingreso que exige abrir el correo en cada visita es un impuesto sobre exactamente lo que queremos medir.

## What Changes

- **BREAKING**: el magic link deja de ser la vía de ingreso por email. Lo reemplaza **email + contraseña**, con alta de cuenta y verificación del email por enlace de un solo uso.
- La pantalla de ingreso pasa a tener dos modos, **Ingresar** y **Crear cuenta**, sobre el mismo formulario.
- Se agrega **recuperación de contraseña** (`/recuperar`): enlace por correo que deriva a elegir una contraseña nueva.
- Se agrega **cambio de contraseña** (`/cambiar-clave`), accesible tanto desde el enlace de recuperación como desde el perfil con la sesión ya iniciada.
- El callback de autenticación pasa a resolver **dos formatos** de enlace de correo (`code` y `token_hash` + `type`) y a respetar un destino interno vía `next`.
- Los errores de Supabase Auth se traducen a mensajes en castellano rioplatense, en un único lugar.
- El ingreso con Google **no cambia**.

## Capabilities

### Modified Capabilities

- `auth-onboarding`: el ingreso por email pasa de magic link a contraseña, con alta verificada por correo, recuperación y cambio de contraseña. La elección de rol y el resto del onboarding quedan intactos.

## Impact

**Código afectado**: pantalla de ingreso (`src/app/ingresar/`), rutas nuevas `src/app/recuperar/` y `src/app/cambiar-clave/`, callback `src/app/auth/callback/route.ts`, middleware de sesión (rutas públicas y ruta siempre disponible), pantalla de perfil (acción de cambiar contraseña) y el módulo nuevo `src/lib/clave.ts`.

**Base de datos**: ninguna migración. La contraseña vive en `auth.users`, que administra Supabase; las tablas de la aplicación no se tocan.

**Configuración de Supabase**: hay que habilitar el proveedor Email con contraseña, mantener activada la confirmación de email, y agregar `/auth/callback` a las URL de redirección permitidas para local, preview y producción.

**Riesgos**:
- Las cuentas creadas con magic link **no tienen contraseña**. Quien haya entrado así antes de este cambio no puede ingresar con el formulario: tiene que pasar por "Olvidé mi contraseña" para asignarse una, o entrar con Google. Es un puñado de cuentas de prueba, pero hay que decirlo en vez de que parezca una falla.
- `/cambiar-clave` tiene que ser alcanzable con sesión iniciada aunque el onboarding esté a medias, porque se llega ahí desde el correo. Es una excepción explícita en el middleware y un punto donde un error produce un bucle de redirección.
- El parámetro `next` del callback y el `volver` de `/cambiar-clave` vienen de una URL enviada por correo: si no se restringen a destinos internos, son un redirect abierto.
