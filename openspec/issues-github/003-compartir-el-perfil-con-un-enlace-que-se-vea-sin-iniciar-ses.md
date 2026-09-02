# #3 — Compartir el perfil con un enlace que se vea sin iniciar sesion

- Estado: OPEN
- Labels: feature
- Autor: kaelen-phoenix
- Creado: 2026-08-16T01:49:56Z
- Actualizado: 2026-08-16T02:00:58Z
- URL: https://github.com/kaelen-phoenix/soliloq/issues/3

---

## Contexto

Hoy ningún perfil se puede ver sin sesión: todas las políticas de lectura exigen `auth.uid() is not null` (`0007_rls_perfiles.sql`). Compartir un perfil por WhatsApp o Instagram implica abrir, por primera vez, una superficie pública y anónima de la app.

Esto no es solo un botón: es una decisión de producto sobre qué datos de una persona quedan accesibles en internet abierto.

## Requerimiento

Una persona puede compartir su perfil con un enlace, y quien lo reciba lo ve sin crear cuenta ni iniciar sesión. Para **contactarla**, en cambio, tiene que registrarse.

El enlace público es una vidriera, no una puerta.

## Compartir

- En el perfil propio hay una acción de compartir.
- La acción usa el diálogo nativo del sistema cuando está disponible (Web Share API), y en su defecto muestra las opciones de WhatsApp, X, Instagram, Facebook y "copiar enlace".
- "Copiar enlace" copia la URL al portapapeles y da confirmación visible.
- El dueño del perfil puede desactivar el enlace público, y a partir de ahí la URL deja de resolver.

## Qué se ve sin sesión

- Abrir la URL sin sesión muestra el perfil público. No redirige a login.
- Se muestran **solo**: fotos, descripción o experiencia, y habilidades o disciplinas.
- **No** se muestra ningún dato de contacto: ni correo, ni teléfono, ni redes sociales, ni fecha de nacimiento, ni ubicación exacta.
- La página tiene metadatos Open Graph y Twitter Card, con imagen, para que al pegar el enlace se vea una tarjeta con la foto y el nombre.
- Un perfil no compartido públicamente devuelve 404 a quien no tenga sesión, no un "no autorizado" que confirme que la persona existe.

## Cómo se contacta

- El perfil público tiene una acción de contacto visible.
- Al tocarla, a quien no tiene sesión se le pide registrarse.
- Terminado el registro, vuelve al perfil desde el que venía, no a la home.
- El contacto se resuelve por el circuito de **armar equipo** (`intereses_equipo`, `0033_armar_equipo.sql`): se registra el interés y, si es mutuo, se abre la sala.
- **No** se exige crear una obra para contactar. `0033` sacó ese requisito a propósito ("para cruzarte con alguien había que inventar una obra con roles"); volver a pedirlo reintroduce esa fricción y ensucia la base con obras creadas solo para destrabar un contacto.
- Las obras siguen siendo el camino cuando hay convocatoria real, no cuando alguien solo quiere escribirle a una persona.
- El registro **no obliga a elegir el rol de creador**. `busca_equipo` vive en `perfiles`, no en `perfiles_creador`: un talento contactando a otro talento es un caso real (dos actores armando algo juntos). Quien llega desde un perfil compartido elige rol como en cualquier registro, y el contacto funciona para los dos.

## Decisiones que hay que tomar antes de implementar

1. **Público de verdad o enlace secreto.** URL adivinable (`/p/nombre-usuario`) es linkeable y prolija pero queda expuesta a quien pruebe. URL con token aleatorio no se adivina y se puede revocar. Sugerencia: token, por ser el perfil de una persona real y por ser revocable.
3. **Indexación en buscadores.** Sugerencia: `noindex` por defecto. Que Google indexe el perfil es un cambio grande para alguien que solo quería mandarlo por WhatsApp.
4. **Alcance.** ¿Aplica a talento, a creador, o a los dos? El perfil de creador ya es de lectura abierta para cualquier usuario logueado, así que ahí el salto es menor.
5. **Fotos en storage.** Las políticas de `0010_rls_storage.sql` habría que revisarlas: si el bucket no sirve a anónimos, el perfil público se ve sin imágenes. Puede requerir URLs firmadas.
6. **Interacción con bloqueos.** Si A bloqueó a B, y B abre el enlace público de A sin sesión, lo ve igual. Es inevitable con un enlace público; conviene decidirlo a conciencia. Lo que sí debe respetarse es el contacto: registrado, el bloqueo vuelve a aplicar.

## Fuera de alcance

- Perfiles públicos indexables y optimizados para SEO.
- Analítica de visitas al perfil compartido.

## Relación con otros issues

- Este "perfil público" (con fotos, sin contacto) **no es** la misma proyección que el feed de armar equipo, que a propósito no muestra fotos ni edad (`0033`). Son dos vistas reducidas distintas y conviene nombrarlas distinto.
- Cruza con el issue de redes sociales: las redes son un canal de contacto directo y por eso quedan fuera del perfil público.
