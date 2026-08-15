---
name: consultar-base
description: Conectarse a la base Postgres de Supabase de soliloq para leer o aplicar SQL. Usar cuando haga falta verificar datos reales (¿hay bloqueos?, ¿qué migraciones están aplicadas?, ¿cuántas salas hay?), probar que una política RLS filtra de verdad, o aplicar una migración pendiente.
---

# Consultar la base de soliloq

La app corre contra un proyecto Supabase. Verificar contra la base es la diferencia entre
"la política debería filtrar" y "la política filtra": las dos veces que se dio por buena una
verificación sin base, quedó anotado en `ESTADO-DEL-PROYECTO.md` como pendiente.

## La credencial no está en el repo

Vive en `~/.soliloq-deploy/db-url.txt`, fuera de git, y es la cadena de conexión completa.
**Nunca copiarla a un archivo del repositorio**, ni a `.claude/settings.local.json`, ni a
`ia-memory` — ese último es un repo **público**. Leerla siempre por sustitución, para que no
quede escrita en el historial de comandos ni en el transcript:

```bash
DBURL="$(cat ~/.soliloq-deploy/db-url.txt)"
```

Si el archivo no existe, la contraseña se saca del dashboard de Supabase
(Project Settings → Database → Connection string → URI) y se vuelve a crear ahí. No pedírsela
al usuario por chat si se puede evitar.

### El token de la Management API también

Para lo que no es SQL —configuración de auth, URLs de redirect, ajustes del proyecto— hace
falta un **personal access token** de Supabase, que vive al lado de la cadena de conexión:

```bash
TOKEN="$(cat ~/.soliloq-deploy/supabase-token.txt)"
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/ydnafjmznntfmzrsijko/config/auth"
```

Sirve, por ejemplo, para el `site_url` y la lista de *Redirect URLs*, que es lo que rompe
todo el ingreso si queda apuntando a un dominio viejo. El callback de la app se arma con
`window.location.origin`, así que **cada dominio nuevo desde el que se entre tiene que estar
en esa lista**.

Es un token de **cuenta**, no de proyecto: da acceso a todos los proyectos del usuario. Va
fuera del repo por eso, y por eso mismo no va en `.env.local` — Next.js carga ese archivo en
el proceso de build y de dev. Si se filtra, se revoca en
`supabase.com/dashboard/account/tokens` y se genera otro.

## Requisito único

El cliente `pg` instalado global (una sola vez, ya hecho en esta máquina):

```bash
npm i -g pg
```

No instalarlo dentro de `soliloq/`: es tooling de diagnóstico, no una dependencia de la app,
y ensucia el `package.json`.

## Cómo correr una consulta

`psql` **no** está instalado. El camino es un script Node con `NODE_PATH` apuntando a los
módulos globales — sin eso `require("pg")` falla con `MODULE_NOT_FOUND`, y `npx -p pg node`
tampoco alcanza porque no resuelve el módulo desde un script de otro directorio.

Escribir el script en el scratchpad, no en el repo:

```bash
cat > "$SCRATCH/q.js" <<'EOF'
const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString: process.env.DBURL,
    ssl: { rejectUnauthorized: false }, // Supabase corta la conexión sin TLS
  });
  await c.connect();
  const q = async (titulo, sql) => {
    const r = await c.query(sql);
    console.log(`\n== ${titulo} ==`);
    console.table(r.rows);
  };

  await q("bloqueos", "select count(*)::int as total from bloqueos");

  await c.end();
})().catch((e) => { console.error("FALLO:", e.message); process.exit(1); });
EOF

NODE_PATH="$(npm root -g)" DBURL="$(cat ~/.soliloq-deploy/db-url.txt)" node "$SCRATCH/q.js"
```

`console.table` conviene sobre `console.log`: las filas con muchos UUID se leen mucho mejor.

## Con qué permisos corre

La cadena conecta como `postgres`, el superusuario: **saltea RLS por completo**. Es lo que
permite contar filas que ninguna sesión de la app podría ver, y es exactamente por qué no
sirve para verificar que una política filtra. Si la pregunta es "¿el bloqueo esconde esto?",
consultar como `postgres` responde que la fila existe, no que la persona la ve.

Para verificar RLS de verdad hay dos caminos:

```sql
-- Simular a una persona concreta dentro de una transacción.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-del-perfil>"}';
select * from mensajes where sala_id = '<uuid>';  -- ve sólo lo que vería en la app
rollback;
```

O bien pegarle a PostgREST con la anon key de `.env.local`, que es el camino real de la app:

```bash
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '\r"')
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '\r"')
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" "$URL/rest/v1/bloqueos?select=*"
```

Ojo con este último: como anónimo `auth.uid()` es `null`, así que muchas tablas devuelven
`[]` **siempre**, haya datos o no. Un vacío ahí no prueba nada — es el RLS haciendo su
trabajo, no un conteo. Para leer como alguien real hace falta su JWT.

## Consultas que suelen pedirse

```sql
-- Migraciones aplicadas (la app va por `supabase db push`).
select version from supabase_migrations.schema_migrations order by version desc limit 10;

-- Panorama rápido.
select (select count(*)::int from perfiles)          as perfiles,
       (select count(*)::int from salas)             as salas,
       (select count(*)::int from mensajes)          as mensajes,
       (select count(*)::int from bloqueos)          as bloqueos;

-- Bloqueos con nombres, que solos son UUID ilegibles.
select b.creado_por, b.motivo, b.creado_en,
       coalesce(tm.nombre, cm.nombre) as menor,
       coalesce(tM.nombre, cM.nombre) as mayor
from bloqueos b
left join perfiles_talento tm on tm.id = b.perfil_menor
left join perfiles_creador cm on cm.id = b.perfil_menor
left join perfiles_talento tM on tM.id = b.perfil_mayor
left join perfiles_creador cM on cM.id = b.perfil_mayor;

-- ¿Algún par bloqueado comparte sala? Son los casos que las políticas de 0023 tienen que
-- esconder; si devuelve filas, hay gente viéndose que no debería.
select si.sala_id, o.titulo, b.perfil_menor, b.perfil_mayor
from bloqueos b
join sala_integrantes si on si.perfil_id = b.perfil_menor
join sala_integrantes sj on sj.perfil_id = b.perfil_mayor and sj.sala_id = si.sala_id
join salas s on s.id = si.sala_id
join obras o on o.id = s.obra_id;
```

## Revisar denuncias

La app registra denuncias pero **no modera sola**: la decisión es humana y sale de acá. Nadie
recibe un aviso automático todavía, así que esta consulta hay que correrla a mano — conviene
hacerlo cada vez que se abre el proyecto, y sin falta durante una prueba con gente invitada.

```sql
-- Denuncias sin resolver, con nombres en vez de UUID.
select d.id, d.motivo, d.detalle, d.creado_en,
       coalesce(td.nombre, cd.nombre) as denunciante,
       coalesce(tx.nombre, cx.nombre) as denunciado,
       o.titulo as obra
from denuncias d
left join perfiles_talento td on td.id = d.denunciante_id
left join perfiles_creador cd on cd.id = d.denunciante_id
left join perfiles_talento tx on tx.id = d.perfil_denunciado_id
left join perfiles_creador cx on cx.id = d.perfil_denunciado_id
left join obras o on o.id = d.obra_id
where d.estado in ('abierta', 'en_revision')
order by d.creado_en;
```

Para actuar sobre una denuncia hay dos herramientas, y son manuales:

```sql
-- 1. Separar a las dos personas: insertar el par ordenado en `bloqueos` (ver 0022).
-- 2. Cerrar el caso dejando asentado qué se hizo.
update denuncias
set estado = 'resuelta', resolucion = 'Se bloqueó el par y se avisó por mail.', resuelto_en = now()
where id = '<uuid>';
```

`estado` y `resolucion` no tienen política de update: solo se tocan con esta conexión, que
saltea RLS. Es a propósito — nadie edita el resultado de su propia denuncia desde la app.

## Aplicar migraciones

No correr el SQL a mano si se puede evitar: `schema_migrations` tiene que quedar al día, o la
próxima migración se aplica sobre un estado que nadie sabe cuál es.

```bash
npx -y supabase db push --db-url "$(cat ~/.soliloq-deploy/db-url.txt)" --dry-run   # ver qué falta
npx -y supabase db push --db-url "$(cat ~/.soliloq-deploy/db-url.txt)" --yes
```

Aplicar a producción es un cambio que se le pide al usuario antes de hacerlo, salvo que ya lo
haya autorizado en la conversación. `--dry-run` no necesita permiso: no toca nada.

## Cosas que no funcionan (probadas)

- **`psql`** no está instalado.
- **La CLI de Supabase no está autenticada** (`supabase projects list` → `Access token not
  provided`), así que los comandos que van por la Management API no sirven. Los que aceptan
  `--db-url` sí.
- **Supabase local con Docker** no arranca: Docker Desktop no está corriendo.
- **`~/.soliloq-deploy/run.sh`** y el token de la Management API que usaban los deploys viejos
  ya no existen. Si algo los menciona, está desactualizado.
