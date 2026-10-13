import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { fotoDeGoogle } from "./acciones";
import { nombreDeGoogle } from "@/lib/foto-google";

export default async function CompletarPerfilPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  // Solo destinos internos: sin esto, `next` sería un redirect abierto.
  const next =
    searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
      ? searchParams.next
      : undefined;

  // #303: con Google ya sabemos el nombre (y quizá la foto): se precargan.
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const nombreGoogle = nombreDeGoogle(meta);
  // #383: si ya había empezado (en este u otro dispositivo), sigue donde quedó.
  const [conFotoGoogle, { data: borrador }, t] = await Promise.all([
    fotoDeGoogle(meta).then((f) => f != null),
    supabase.from("borradores_perfil").select("paso, datos, actualizado_en").eq("perfil_id", user.id).maybeSingle(),
    getTranslations("perfil.completar"),
  ]);

  return (
    <main className="min-h-screen px-6 py-10 sm:bg-fondo-sutil sm:py-14">
      <div className="mx-auto max-w-lg sm:rounded-2xl sm:border sm:border-borde sm:bg-superficie sm:p-8 sm:shadow-tarjeta">
        <h1 className="text-xl font-bold text-texto">{t("titulo")}</h1>
        <p className="mb-6 mt-1 text-sm text-texto-tenue">
          {t("bajada")}
        </p>
        <FormularioTalento
          userId={user.id}
          esAlta
          fotosIniciales={[]}
          destinoAlTerminar={next}
          nombreSugerido={nombreGoogle}
          conFotoGoogle={conFotoGoogle}
          borrador={
            borrador ? { paso: borrador.paso, datos: borrador.datos, actualizadoEn: borrador.actualizado_en } : null
          }
        />
      </div>
    </main>
  );
}
