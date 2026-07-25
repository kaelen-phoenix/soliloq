## 1. Esquema y reglas en base de datos

- [ ] 1.1 Migración: agregar `perfiles.modo_activo` (`talento` | `creador`, nullable) inicializada con el valor de `rol` para las cuentas existentes
- [ ] 1.2 Migración: actualizar `feed_para_talento` para excluir los roles de obras cuyo creador es el propio talento que consulta
- [ ] 1.3 Migración: actualizar el trigger `validar_alta_postulacion` para rechazar la postulación a un rol de una obra propia
- [ ] 1.4 Aplicar las migraciones en el proyecto Supabase y confirmar que las cuentas existentes conservan su perfil y su modo

## 2. Estado de cuenta y redirección

- [ ] 2.1 Implementar una función única que, dado el usuario, resuelva su estado de cuenta: perfiles existentes, modo activo efectivo y destino de redirección
- [ ] 2.2 Reescribir el middleware sobre esa función, evaluando el onboarding por perfiles existentes en vez de por `onboarding_completo`
- [ ] 2.3 Corregir el modo activo cuando apunta a un perfil inexistente, sin bloquear el acceso
- [ ] 2.4 Verificar los cuatro estados de cuenta sin bucles de redirección: sin perfiles, solo talento, solo creador, ambos

## 3. Conmutador de modo

- [ ] 3.1 Implementar la acción de conmutar modo, que persiste `modo_activo` y redirige a la pantalla principal del modo nuevo
- [ ] 3.2 Agregar el conmutador al encabezado, indicando de forma permanente el modo activo
- [ ] 3.3 Mostrar, a quien tiene un solo perfil, la acción de crear el que le falta en lugar del conmutador
- [ ] 3.4 Hacer que la barra de navegación y la pantalla principal dependan del modo activo

## 4. Alta del segundo perfil

- [ ] 4.1 Implementar la ruta de alta del segundo perfil, reutilizando los formularios de talento y creador
- [ ] 4.2 Al guardar el segundo perfil, conmutar el modo activo a ese perfil
- [ ] 4.3 Permitir abandonar el alta del segundo perfil sin perder acceso al primero
- [ ] 4.4 Adaptar la edición de perfil para que edite el perfil del modo activo

## 5. Bloqueo de auto-postulación

- [ ] 5.1 Verificar que el feed no muestra roles de obras propias
- [ ] 5.2 Verificar que el servidor rechaza la postulación a una obra propia y que la interfaz informa el motivo

## 6. Ajustes de la interfaz existente

- [ ] 6.1 Actualizar la pantalla de elección de rol para reflejar que se trata del perfil inicial, no de una decisión definitiva
- [ ] 6.2 Revisar los estados vacíos que mencionan el rol para que hablen del modo activo
- [ ] 6.3 Confirmar que las notificaciones de la cuenta llegan en cualquier modo y que abrirlas lleva al modo correcto

## 7. Verificación en producción

- [ ] 7.1 Con una cuenta existente: confirmar que abre en su modo previo sin pedir nada nuevo
- [ ] 7.2 Crear el segundo perfil desde una cuenta con uno solo y confirmar la conmutación
- [ ] 7.3 Alternar modos varias veces y confirmar que el modo persiste entre recargas y reingresos
- [ ] 7.4 Con una cuenta que tiene ambos perfiles y una obra publicada: confirmar que esa obra no aparece en su propio feed
