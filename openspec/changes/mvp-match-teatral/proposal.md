## Why

El casting teatral independiente se coordina hoy por grupos de WhatsApp, historias de Instagram y contactos personales: los directores no llegan a talentos fuera de su círculo y los actores se enteran tarde (o nunca) de las convocatorias. Este prototipo valida una hipótesis concreta antes de invertir en producto: **si la mecánica de match es rápida y visual, los actores van a completar su perfil y los directores van a publicar convocatorias**.

Es el primer código del proyecto (repositorio vacío), así que este change define tanto el producto mínimo como la base técnica sobre la que se construirá.

## What Changes

- **Nuevo proyecto Next.js (App Router) + React**, PWA responsive mobile-first, en español rioplatense.
- **Backend sin servidor propio**: Supabase (Postgres + Auth + Storage + Realtime), con Row Level Security como única capa de autorización.
- **Autenticación** por magic link de email + Google OAuth, con elección de rol (`talento` | `creador`) en el onboarding.
- **Perfil de Talento**: datos básicos, 3-5 fotos en Storage, link a videoreel externo (YouTube/Vimeo) y CV en texto con habilidades.
- **Perfil de Creador**: compañía o director independiente, con historial de obras previas opcional.
- **Convocatorias**: el Creador publica una obra y define los roles a cubrir (rango etario, tipo, descripción).
- **Feed de tarjetas deslizables** para el Talento, filtrado por su perfil, con postulación por swipe o botón.
- **Motor de selección**: el Creador revisa postulantes por rol y los clasifica en `rechazado` / `en_duda` / `aprobado`.
- **Notificaciones in-app** (campanita + badge) al talento aprobado.
- **Sala de proyecto**: chat grupal en tiempo real creado automáticamente con el elenco aprobado y el director.
- **Deploy continuo gratuito**: Vercel Hobby conectado al repo de GitHub + proyecto Supabase Free.

Fuera de alcance explícito (no se implementa ni se deja andamiaje): pagos o planes premium, funcionalidad B2B, blockchain, perfiles de "grandes ligas", push notifications y notificaciones por email.

## Capabilities

### New Capabilities

- `auth-onboarding`: registro e inicio de sesión por magic link y Google, elección de rol y derivación al alta del perfil correspondiente.
- `perfil-talento`: alta y edición de la ficha del talento, portfolio de fotos, link de videoreel y CV en texto.
- `perfil-creador`: alta y edición del perfil de director o compañía, con historial de obras previas opcional.
- `convocatorias`: creación, publicación, edición y cierre de obras y de los roles que las componen.
- `feed-postulacion`: feed de tarjetas deslizables filtrado por el perfil del talento y registro de postulaciones.
- `seleccion-match`: revisión de postulantes por rol, clasificación en rechazado / en duda / aprobado, y generación del match.
- `notificaciones-in-app`: bandeja de notificaciones con badge de no leídas para eventos de match y de sala de proyecto.
- `sala-proyecto`: chat grupal en tiempo real creado automáticamente a partir de los talentos aprobados de una obra.

### Modified Capabilities

Ninguna. El repositorio no tiene specs previas.

## Impact

**Código afectado**: repositorio completo — es la primera implementación. Se crea la app Next.js, el cliente de Supabase, las migraciones SQL con sus políticas RLS y los componentes de UI.

**Dependencias nuevas**: `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`, una librería de gestos para el swipe, Tailwind CSS y TypeScript.

**Servicios externos**: cuenta de Supabase (plan Free) y cuenta de Vercel (plan Hobby), ambas gratuitas. Google Cloud Console para las credenciales OAuth.

**Riesgos e implicancias operativas**:
- El proyecto Supabase Free **se pausa tras 7 días sin actividad** y requiere reactivación manual desde el dashboard. Antes de una demo agendada hay que abrir la app el día anterior.
- Límites del free tier a monitorear: 500 MB de base, 1 GB de Storage y 200 conexiones Realtime concurrentes. Alcanzan holgadamente para el prototipo porque los videoreels son links externos y no se almacenan.
- Al no haber backend propio, un error en las políticas RLS es directamente una filtración de datos: las políticas necesitan verificación explícita en las tareas.
