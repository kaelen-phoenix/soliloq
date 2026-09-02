# #2 — Buscador de artistas para creadores, con la foto como primera impresion

- Estado: OPEN
- Labels: feature
- Autor: kaelen-phoenix
- Creado: 2026-08-16T01:49:54Z
- Actualizado: 2026-08-16T02:00:56Z
- URL: https://github.com/kaelen-phoenix/soliloq/issues/2

---

## Contexto

Hoy no existe forma de que un creador encuentre talento por iniciativa propia. La ruta `talentos/` solo tiene `[id]`: se llega a un perfil si ya sabés el id, en la práctica solo desde una postulación. La RLS lo refuerza: `perfil_talento_select_para_creador` (`0007_rls_perfiles.sql`) permite leer un perfil de talento únicamente si ese talento se postuló a alguna obra del creador.

O sea que el descubrimiento va en un solo sentido: el talento se postula, el creador reacciona. Esta feature abre el sentido inverso.

## Requerimiento

Un creador puede buscar y recorrer artistas de la plataforma, y lo primero que recibe de cada uno es su foto.

## Criterios de aceptación

- Existe una pantalla de búsqueda de talento accesible desde la navegación, disponible solo para usuarios con rol `creador`.
- El resultado se presenta como una grilla de fotos. La foto es el elemento dominante de la tarjeta; nombre y disciplina son secundarios.
- Cada tarjeta muestra: foto principal, nombre, edad, ubicación pública y habilidades. Nada más.
- Se puede filtrar por, al menos: ubicación, rango de edad, género y habilidades.
- Se puede buscar por texto sobre el nombre.
- Al tocar una tarjeta se abre el perfil completo del talento.
- Un talento sin ninguna foto cargada no aparece en los resultados, o aparece con un marcador neutro (a decidir, ver abajo).
- El listado excluye a los talentos que bloquearon al creador y viceversa (`0022_bloqueos.sql`).
- La búsqueda pagina o carga de a tramos; no trae todos los perfiles de una.

## Decisión tomada: aparecer en el buscador es opt-in

El talento decide si quiere ser encontrado. El switch se ofrece durante el onboarding, prendido por defecto y explicado en una línea, así el buscador no arranca vacío pero nadie queda expuesto sin haberlo visto.

Quien lo apaga sigue pudiendo postularse; simplemente no aparece en la grilla.

## Decisiones que hay que tomar antes de implementar

1. **Qué ve el creador antes de contactar.** El perfil completo incluye videoreel y experiencia. Puede convenir un perfil reducido en la búsqueda y el completo recién tras un contacto o postulación.
2. **Cambio de RLS.** Se necesita una política nueva de lectura para creadores, o una vista con el subconjunto de campos del buscador. Definir cuál, porque una política amplia sobre `perfiles_talento` deja expuestos campos como `fecha_nacimiento` exacta.
3. **Cuál es "la foto principal".** `fotos_talento` tiene orden (`0006`, `0015`) pero no una marcada como principal. Hay que elegir: la primera del orden, o agregar el concepto de foto de portada.
4. **Talentos sin foto.** Si el valor de la feature es la foto, un perfil sin foto desvirtúa la grilla. Sugerencia: ocultarlos del buscador y avisarle al talento que por eso no lo encuentran.

## Fuera de alcance

- Invitar o contactar directamente al talento desde la búsqueda. Eso es una feature aparte.
- Recomendaciones o ranking algorítmico.
