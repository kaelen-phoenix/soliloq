import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { fotoDeGoogle } from "./acciones";

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
  const nombreGoogle = [meta?.full_name, meta?.name].find((v): v is string => typeof v === "string" && v.trim().length > 1);
  const conFotoGoogle = (await fotoDeGoogle(meta)) != null;

  return (
    <main className="min-h-screen px-6 py-10 sm:bg-fondo-sutil sm:py-14">
      <div className="mx-auto max-w-lg sm:rounded-2xl sm:border sm:border-borde sm:bg-superficie sm:p-8 sm:shadow-tarjeta">
        <h1 className="text-xl font-bold text-texto">Contanos sobre vos</h1>
        <p className="mb-6 mt-1 text-sm text-texto-tenue">
          Este es tu perfil: tu carta de presentación en Yalope. Más adelante, cuando armes
          un Proyecto o un Equipo, vas a poder convocar Talentos sin tener que crear nada
          más.
        </p>
        <FormularioTalento
          userId={user.id}
          esAlta
          fotosIniciales={[]}
          destinoAlTerminar={next}
          nombreSugerido={nombreGoogle?.trim()}
          conFotoGoogle={conFotoGoogle}
        />
      </div>
    </main>
  );
}
