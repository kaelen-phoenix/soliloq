# Soliloq — Prototipo de Match Teatral

PWA en Next.js que conecta Talento (actores/actrices/técnicos) con Creadores (directores/compañías) mediante una mecánica de swipe. Ver el detalle funcional completo en `openspec/changes/mvp-match-teatral/`.

## Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind, desplegado en **Vercel Hobby** (gratis).
- **Backend**: **Supabase Free** — Postgres, Auth (magic link + Google), Storage y Realtime. Sin servidor propio.
- Toda la autorización vive en políticas **Row Level Security** de Postgres (ver `supabase/migrations/`).

## Instalación local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear un proyecto en [supabase.com](https://supabase.com) (plan Free).
3. En el SQL Editor del proyecto, ejecutar las migraciones de `supabase/migrations/` **en orden numérico** (o usar `supabase db push` si tenés la Supabase CLI instalada y el proyecto vinculado).
4. Copiar `.env.example` a `.env.local` y completar con los valores de *Project Settings → API*:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
5. Configurar los proveedores de auth en el dashboard de Supabase (*Authentication → Providers*):
   - **Email**: activado por defecto (magic link / OTP).
   - **Google**: crear credenciales OAuth en [Google Cloud Console](https://console.cloud.google.com/) y cargar Client ID/Secret. Como URI de redirección autorizada, usar la que Supabase muestra en el proveedor (`https://<tu-proyecto>.supabase.co/auth/v1/callback`).
   - En *Authentication → URL Configuration*, agregar `http://localhost:3000/auth/callback` (y luego la URL de Vercel) a las **Redirect URLs**.
6. Correr la app:
   ```bash
   npm run dev
   ```

## Despliegue gratuito (Vercel + Supabase)

1. Subir el repo a GitHub.
2. En [vercel.com](https://vercel.com), importar el repo (plan Hobby).
3. Cargar las mismas variables de entorno del paso 4 anterior en *Project Settings → Environment Variables* de Vercel, usando como `NEXT_PUBLIC_SITE_URL` la URL pública que asigna Vercel.
4. En Supabase, agregar `https://<tu-app>.vercel.app/auth/callback` a las Redirect URLs de auth.
5. Cada push a la rama principal dispara un deploy automático.

## ⚠️ Importante: pausa automática de Supabase Free

El plan gratuito de Supabase **pausa el proyecto tras 7 días sin actividad**. Reactivarlo es manual, desde el dashboard del proyecto (botón "Restore"/"Resume"), y tarda un par de minutos.

**Antes de cualquier demo agendada, entrá a la app el día anterior** para asegurarte de que el proyecto esté activo.

## Alcance del prototipo

Ver `openspec/changes/mvp-match-teatral/proposal.md` para el detalle completo. Fuera de alcance en esta etapa: pagos/premium, B2B, blockchain, perfiles de "grandes ligas", push notifications y notificaciones por email.

## Estructura relevante

```
src/app/                  Rutas (App Router)
src/components/           Componentes de UI por dominio
src/lib/supabase/         Clientes de Supabase (browser, server, middleware) y tipos
supabase/migrations/      Esquema, RLS, triggers y vistas, en orden de aplicación
openspec/                 Especificación funcional y técnica del prototipo
```
