## 1. Configuración de Supabase Auth

- [x] 1.1 Habilitar el proveedor Email con contraseña en Supabase → Authentication → Providers, dejando activada la confirmación de email
- [x] 1.2 Agregar `/auth/callback` de local, de `*.vercel.app` y de producción a las URL de redirección permitidas
- [ ] 1.3 Revisar las plantillas de correo de verificación y de recuperación en castellano rioplatense

## 2. Reglas y mensajes compartidos

- [x] 2.1 Crear `src/lib/clave.ts` con el largo mínimo, `validarClave()` y la expresión de validación de email
- [x] 2.2 Agregar `mensajeErrorAuth(codigo, mensaje)`, que traduce por código de Supabase y no por el texto en inglés, con un genérico que no permite enumerar cuentas
- [x] 2.3 Agregar `urlCallback(destino?)`, que arma la URL desde `window.location.origin` para que previews y local no deriven a producción

## 3. Pantalla de ingreso

- [x] 3.1 Reemplazar el formulario de magic link por uno de email y contraseña con los modos "Ingresar" y "Crear cuenta"
- [x] 3.2 Limpiar la contraseña y el error al alternar de modo
- [x] 3.3 Implementar el ingreso con `signInWithPassword`, delegando el destino al middleware
- [x] 3.4 Implementar el alta con `signUp` y la pantalla de "confirmá tu email"; si el proyecto no exige confirmación, entrar directo con la sesión devuelta
- [x] 3.5 Usar `autoComplete` de `current-password` y `new-password` según el modo, para que el gestor de contraseñas del teléfono funcione
- [x] 3.6 Agregar el enlace a "Olvidé mi contraseña", visible solo en el modo de ingreso
- [x] 3.7 Mostrar el aviso de enlace vencido o ya usado cuando se llega con `?error=enlace_invalido`
- [x] 3.8 Conservar el ingreso con Google sin cambios de comportamiento

## 4. Recuperación de contraseña

- [x] 4.1 Crear la ruta `/recuperar` con su formulario de email
- [x] 4.2 Enviar el enlace con `resetPasswordForEmail`, apuntando el retorno a `/cambiar-clave`
- [x] 4.3 Responder siempre con el mismo aviso, exista o no la cuenta

## 5. Cambio de contraseña

- [x] 5.1 Crear la ruta `/cambiar-clave` con la sesión verificada del lado del servidor
- [x] 5.2 Implementar el formulario con contraseña nueva, repetición, validación de largo y de coincidencia
- [x] 5.3 Aceptar en `volver` únicamente destinos internos, para no convertir la ruta en un redirect abierto
- [x] 5.4 Agregar la acción "Cambiar contraseña" en la pantalla de perfil, volviendo ahí al terminar

## 6. Callback y middleware

- [x] 6.1 Resolver en el callback los dos formatos de enlace: `code` con `exchangeCodeForSession` y `token_hash` + `type` con `verifyOtp`
- [x] 6.2 Aceptar en `next` únicamente destinos internos
- [x] 6.3 Derivar cualquier fallo del callback a `/ingresar?error=enlace_invalido`
- [x] 6.4 Agregar `/recuperar` a las rutas públicas del middleware
- [x] 6.5 Agregar `/cambiar-clave` como ruta siempre disponible, evaluada antes del estado de cuenta, para que el enlace de recuperación funcione con el onboarding a medias

## 7. Verificación

- [x] 7.1 Verificar `npx tsc --noEmit` sin errores
- [ ] 7.2 Probar el alta completa: crear cuenta, recibir el correo, verificar y llegar al onboarding
- [ ] 7.3 Probar el ingreso con credenciales correctas e incorrectas, y con una cuenta sin verificar
- [ ] 7.4 Probar la recuperación de punta a punta, incluyendo con el onboarding incompleto, y confirmar que no hay bucle de redirección
- [ ] 7.5 Probar el cambio de contraseña desde el perfil y confirmar que vuelve al perfil
- [ ] 7.6 Confirmar que el enlace pedido desde un deploy de preview devuelve a ese preview y no a producción
- [ ] 7.7 Confirmar que las cuentas viejas de magic link pueden entrar vía recuperación de contraseña
