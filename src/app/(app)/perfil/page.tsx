import Link from "next/link";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";
import { FormularioCreador } from "@/components/perfil/formulario-creador";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { ObrasPrevias } from "@/components/perfil/obras-previas";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

function AccionesCuenta() {
  return (
    <section className="mt-8 flex flex-col items-start gap-3">
      <Link
        href="/cambiar-clave?volver=/perfil"
        className="text-[13px] text-ink-500 underline underline-offset-4 hover:text-ink-900"
      >
        Cambiar contraseña
      </Link>
      <CerrarSesionBoton />
    </section>
  );
}

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Se edita el perfil del modo activo; el otro se edita conmutando de modo.
  const estado = await leerEstadoCuenta(supabase, user.id);

  if (estado.modoActivo === "talento") {
    const [{ data: perfilTalento }, { data: fotos }] = await Promise.all([
      supabase.from("perfiles_talento").select("*").eq("id", user.id).single(),
      supabase.from("fotos_talento").select("*").eq("talento_id", user.id).order("orden"),
    ]);

    const fotosConUrl = (fotos ?? []).map((f) => ({
      id: f.id,
      storage_path: f.storage_path,
      orden: f.orden,
      url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
      enBd: true,
    }));

    return (
      <main className="px-5 py-5">
        <FormularioTalento
          userId={user.id}
          esAlta={false}
          datosIniciales={perfilTalento ?? undefined}
          fotosIniciales={fotosConUrl}
        />
        <AccionesCuenta />
      </main>
    );
  }

  const [{ data: perfilCreador }, { data: obrasPrevias }] = await Promise.all([
    supabase.from("perfiles_creador").select("*").eq("id", user.id).single(),
    supabase.from("obras_previas").select("*").eq("creador_id", user.id),
  ]);

  return (
    <main className="px-5 py-5">
      <FormularioCreador userId={user.id} esAlta={false} datosIniciales={perfilCreador ?? undefined} />
      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Historial de obras previas</h2>
        <ObrasPrevias creadorId={user.id} obras={obrasPrevias ?? []} />
      </section>
      <AccionesCuenta />
    </main>
  );
}
