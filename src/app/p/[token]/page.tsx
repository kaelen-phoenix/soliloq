import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Logotipo } from "@/components/ui/logotipo";
import { VidrieraPublica } from "@/components/perfil/vidriera-publica";
import { BotonContactarPublico } from "@/components/perfil/boton-contactar-publico";

// `cache()` deduplica la RPC entre `generateMetadata` y la página: las dos la piden con el
// mismo token dentro del mismo request.
const obtenerPerfil = cache(async (token: string) => {
  const supabase = createClient();
  const { data } = await supabase.rpc("perfil_publico", { p_token: token });
  return data?.[0] ?? null;
});

function urlPrimeraFoto(
  perfil: NonNullable<Awaited<ReturnType<typeof obtenerPerfil>>>
): string {
  if (!perfil.fotos[0]) return "/og.png";
  if (perfil.tipo === "creador") return perfil.fotos[0];
  const supabase = createClient();
  return supabase.storage.from("fotos-perfil").getPublicUrl(perfil.fotos[0]).data.publicUrl;
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const perfil = await obtenerPerfil(params.token);
  if (!perfil) return {};

  const imagen = urlPrimeraFoto(perfil);

  return {
    title: perfil.nombre,
    // Un enlace pensado para pegar en un chat, no para que lo indexe un buscador.
    robots: { index: false, follow: false },
    openGraph: {
      type: "profile",
      title: perfil.nombre,
      images: [imagen],
    },
    twitter: {
      card: "summary_large_image",
      title: perfil.nombre,
      images: [imagen],
    },
  };
}

export default async function PerfilPublicoPage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const perfil = await obtenerPerfil(params.token);
  if (!perfil) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se compara el token propio, no un id: `perfil_publico` no devuelve identidad, a
  // propósito, así que esta es la única forma de saber si quien mira es el dueño.
  let esDueño = false;
  if (user) {
    const { data: miPerfil } = await supabase
      .from("perfiles")
      .select("enlace_token")
      .eq("id", user.id)
      .maybeSingle();
    esDueño = miPerfil?.enlace_token === params.token;
  }

  const fotos = perfil.fotos.map((f) =>
    perfil.tipo === "talento"
      ? supabase.storage.from("fotos-perfil").getPublicUrl(f).data.publicUrl
      : f
  );

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <Link href="/" aria-label="Ir a Yalope" className="mb-8 inline-block">
        <Logotipo tamano="sm" />
      </Link>

      <VidrieraPublica perfil={{ ...perfil, fotos }} />

      {!esDueño && (
        <div className="mt-6">
          <BotonContactarPublico token={params.token} haySesion={!!user} />
        </div>
      )}

      {esDueño ? (
        <footer className="mt-12 border-t border-borde pt-5 text-sm">
          <Link href="/perfil" className="font-medium text-ink-700 hover:text-texto">
            Volver a mi perfil
          </Link>
        </footer>
      ) : user ? (
        <div className="mt-10">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-borde py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-fondo-sutil"
          >
            Ir a Yalope
          </Link>
        </div>
      ) : (
        <section className="mt-10 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 text-center">
          <p className="font-display text-lg font-semibold tracking-[-0.02em] text-texto">
            ¿Casteás o sos artista?
          </p>
          <p className="mx-auto mt-1.5 max-w-[38ch] text-sm leading-relaxed text-texto-tenue">
            Armá tu perfil en Yalope y compartilo como este: fotos, experiencia y un enlace
            para pasarle a cualquier casting.
          </p>
          <Link
            href="/ingresar"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Crear mi cuenta gratis
          </Link>
        </section>
      )}
    </main>
  );
}
