-- Separa "dónde estoy" de "qué se publica de dónde estoy".
--
-- Hasta ahora el campo de ubicación sólo aceptaba ciudades, así que mostrar
-- `ubicacion_texto` tal cual era inofensivo. Desde que acepta direcciones con altura y
-- barrios, `perfiles_talento.ubicacion_texto` puede ser el domicilio de alguien — y ese
-- texto se le muestra a cualquier creador en la bandeja de postulantes y en el detalle del
-- perfil. Publicar la dirección de una actriz porque se postuló a una obra es un riesgo
-- concreto, no una imprecisión.
--
-- `ubicacion_publica` guarda la misma ubicación recortada a "barrio, ciudad, país". El
-- recorte se hace **al guardar**, en `etiquetaPublica` (src/lib/ubicacion.ts), y no al
-- mostrar: si dependiera de cada pantalla, alcanzaría con una que se olvide para filtrar el
-- domicilio. Las coordenadas siguen siendo las exactas, porque el filtro por distancia es la
-- razón de ser del campo y no se publica.
--
-- Va en las tres tablas que comparten `aColumnas`. En `obras` la ubicación es la del lugar
-- de ensayo y es pública a propósito, pero la columna existe igual para que `aColumnas`
-- siga siendo una sola función y no haya que recordar cuál tabla es la excepción.
--
-- Idempotente.

alter table perfiles_talento add column if not exists ubicacion_publica text;
alter table perfiles_creador add column if not exists ubicacion_publica text;
alter table obras           add column if not exists ubicacion_publica text;

-- Backfill exacto, no aproximado: las filas que ya existen se cargaron cuando el campo sólo
-- admitía ciudades, así que su `ubicacion_texto` **ya es** una etiqueta pública válida.
update perfiles_talento set ubicacion_publica = ubicacion_texto where ubicacion_publica is null;
update perfiles_creador set ubicacion_publica = ubicacion_texto where ubicacion_publica is null;
update obras           set ubicacion_publica = ubicacion_texto where ubicacion_publica is null;

-- La columna queda **nullable a propósito**, aunque a esta altura ninguna fila la tenga en
-- null.
--
-- El motivo es el orden del despliegue: la migración corre antes que el código, así que
-- durante unos minutos la versión vieja de la app —la que todavía no conoce la columna—
-- sigue insertando perfiles y obras sin ella. Con `not null` esos inserts fallarían, y darse
-- de alta se rompería justo en la ventana entre una cosa y la otra.
--
-- El `not null` se agrega en una migración posterior, una vez que el código desplegado
-- siempre escribe la columna. Mientras tanto, `desdeColumnas` cae a `ubicacion_texto` si la
-- encuentra vacía, que para las filas viejas es la ciudad que ya tenían.
