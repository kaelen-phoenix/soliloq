import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { Logotipo, MarcaYalope } from "@/components/ui/logotipo";
import { VidrieraPublica } from "@/components/perfil/vidriera-publica";
import { ContarVisita } from "@/components/perfil/contar-visita";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { destinoSegunEstado } from "@/lib/cuenta";
import { redesDeJson } from "@/lib/redes";

// `cache()` deduplica la RPC entre `generateMetadata` y la página: las dos la piden con el
// mismo token dentro del mismo request. #384: el «token» es el código o el nombre elegido.
const obtenerPerfil = cache(async (token: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("perfil_publico", { p_clave: token });
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
  const t = await getTranslations("perfil.publico");

  return {
    title: t("tituloMeta", { nombre: perfil.nombre }),
    description: perfil.texto?.slice(0, 160) || t("descripcionMeta", { nombre: perfil.nombre }),
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
  const t = await getTranslations("perfil.publico");
  const primerNombre = perfil.nombre.split(" ")[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se compara el enlace propio (código o nombre), no un id: `perfil_publico` no devuelve
  // identidad, a propósito, así que esta es la única forma de saber si quien mira es el dueño.
  let esDueño = false;
  if (user) {
    const { data: miPerfil } = await supabase
      .from("perfiles")
      .select("enlace_token, enlace_alias")
      .eq("id", user.id)
      .maybeSingle();
    const clave = params.token.toLowerCase();
    esDueño = miPerfil?.enlace_token === clave || (!!miPerfil?.enlace_alias && miPerfil.enlace_alias === clave);
  }

  // Con sesión pero la cuenta todavía sin terminar (pendiente, sin Normas o sin perfil):
  // `/p` está fuera de la app y no pasa por esa guarda, así que se mira acá. El perfil se ve
  // completo igual, con las redes (#384); lo que cambia es la invitación de abajo.
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
          <Link href="/" aria-label={t("irAYalope")}>
            <Logotipo tamano="sm" />
          </Link>
          <span className="text-2xs font-medium uppercase tracking-[0.16em] text-ink-400">
            {t("booking")}
          </span>
        </header>

        <VidrieraPublica perfil={{ ...perfil, redes: redesDeJson(perfil.redes), fotos }} />
        {!esDueño && <ContarVisita clave={params.token} />}

        {/* Sin chat de dos personas (#283): el perfil se ve completo, con las redes, y se
            contacta por ahí. A quien todavía no está en Yalope se lo invita a sumarse (#384). */}
        {!esDueño && (!user || pendiente !== "app") ? (
          <section className="mt-10 rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">
              {!user ? t("noEstasTitulo") : t("terminaTitulo")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              {!user
                ? t("invitacion")
                : pendiente === "solicitud-pendiente"
                  ? t("esperandoAprobacion")
                  : t("completaTuPerfil")}
            </p>
            {!user ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={`/ingresar?modo=registrarme&next=${volverAca}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accion px-4 py-2.5 text-sm font-semibold text-accion-texto transition-colors hover:opacity-90"
                >
                  {t("crearPerfil")}
                </Link>
                <Link href={`/ingresar?next=${volverAca}`} className="text-sm font-medium text-ink-700 hover:text-brand-600">
                  {t("yaTengoCuenta")}
                </Link>
              </div>
            ) : pendiente !== "solicitud-pendiente" ? (
              <div className="mt-4">
                <Link
                  href={`/${pendiente}?next=${volverAca}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accion px-4 py-2.5 text-sm font-semibold text-accion-texto transition-colors hover:opacity-90"
                >
                  {t("completarMiPerfil")}
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="mt-12 flex items-center justify-between border-t border-ink-100 pt-5 text-sm text-ink-500">
          {esDueño ? (
            <Link href="/perfil" className="font-medium text-ink-700 hover:text-brand-600">
              {t("volverAMiPerfil")}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MarcaYalope className="h-4 w-4 text-ink-400" />
              {t("perfilEnYalope")}
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
