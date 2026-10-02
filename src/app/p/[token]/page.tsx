import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { Logotipo, MarcaYalope } from "@/components/ui/logotipo";
import { VidrieraPublica } from "@/components/perfil/vidriera-publica";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { destinoSegunEstado } from "@/lib/cuenta";

// `cache()` deduplica la RPC entre `generateMetadata` y la página: las dos la piden con el
// mismo token dentro del mismo request.
const obtenerPerfil = cache(async (token: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("perfil_publico", { p_token: token });
  if (error) reportarErrorSupabase(error, { rpc: "perfil_publico", token });
  return data?.[0] ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const perfil = await obtenerPerfil(params.token);
  if (!perfil) return {};

  return {
    title: `${perfil.nombre} · Yalope`,
    description: perfil.texto?.slice(0, 160) || `El perfil de ${perfil.nombre} en Yalope.`,
    // Un enlace pensado para pegar en un chat, no para que lo indexe un buscador.
    // La tarjeta al compartir la arma `opengraph-image.tsx`.
    robots: { index: false, follow: false },
    openGraph: { type: "profile", title: perfil.nombre },
    twitter: { card: "summary_large_image", title: perfil.nombre },
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

  // Con sesión pero la cuenta todavía sin terminar (pendiente, sin Normas o sin perfil):
  // `/p` está fuera de la app y no pasa por esa guarda, así que se mira acá. Solo una cuenta
  // completa ve las redes (las filtra `perfil_publico`, 0097).
  const pendiente = user && !esDueño ? destinoSegunEstado(await leerEstadoCuenta(supabase, user.id)) : "app";
  const volverAca = encodeURIComponent(`/p/${params.token}`);

  const fotos = perfil.fotos.map(
    (f) => supabase.storage.from("fotos-perfil").getPublicUrl(f).data.publicUrl
  );

  return (
    // Tema claro fijo: esto es una hoja de booking, un documento que se comparte. Se ve
    // igual para cualquiera, no según el tema de la app de quien lo abre.
    <div data-tema="light" className="min-h-screen bg-[#fbfaf7] text-ink-900">
      <div className="mx-auto max-w-xl px-5 py-8 sm:py-12">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" aria-label="Ir a Yalope">
            <Logotipo tamano="sm" />
          </Link>
          <span className="text-2xs font-medium uppercase tracking-[0.16em] text-ink-400">
            Booking
          </span>
        </header>

        <VidrieraPublica perfil={{ ...perfil, fotos }} />

        {/* Sin chat de dos personas (#283): quien tiene cuenta completa ya ve todo, con las
            redes, y contacta por donde quiera. Al resto se le dice qué le falta. */}
        {!esDueño && (!user || pendiente !== "app") ? (
          <section className="mt-10 rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">
              ¿Te interesa trabajar con {perfil.nombre.split(" ")[0]}?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              {!user
                ? `Creá tu cuenta gratis en Yalope para ver el perfil completo de ${perfil.nombre.split(" ")[0]}, con sus redes.`
                : pendiente === "solicitud-pendiente"
                  ? "Tu cuenta está esperando aprobación. Cuando te habiliten vas a ver el perfil completo, con sus redes."
                  : "Completá tu perfil en Yalope para ver el perfil completo, con sus redes."}
            </p>
            {!user ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={`/ingresar?modo=registrarme&next=${volverAca}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accion px-4 py-2.5 text-sm font-semibold text-accion-texto transition-colors hover:opacity-90"
                >
                  Crear cuenta
                </Link>
                <Link href={`/ingresar?next=${volverAca}`} className="text-sm font-medium text-ink-700 hover:text-brand-600">
                  Ya tengo cuenta
                </Link>
              </div>
            ) : pendiente !== "solicitud-pendiente" ? (
              <div className="mt-4">
                <Link
                  href={`/${pendiente}?next=${volverAca}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accion px-4 py-2.5 text-sm font-semibold text-accion-texto transition-colors hover:opacity-90"
                >
                  Completar mi perfil
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="mt-12 flex items-center justify-between border-t border-ink-100 pt-5 text-sm text-ink-500">
          {esDueño ? (
            <Link href="/perfil" className="font-medium text-ink-700 hover:text-brand-600">
              Volver a mi perfil
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MarcaYalope className="h-4 w-4 text-ink-400" />
              Perfil en Yalope
            </span>
          )}
          <Link href="/" className="font-medium text-ink-700 hover:text-brand-600">
            yalope.com
          </Link>
        </footer>
      </div>
    </div>
  );
}
