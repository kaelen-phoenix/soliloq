import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BarraNavegacion } from "@/components/layout/barra-navegacion";
import { Encabezado } from "@/components/layout/encabezado";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, onboarding_completo")
    .eq("id", user.id)
    .single();

  if (!perfil?.rol) redirect("/elegir-rol");
  if (!perfil.onboarding_completo) redirect("/completar-perfil");

  const titulo = perfil.rol === "talento" ? "Convocatorias" : "Tu tablero";

  return (
    <div className="pb-20">
      <Encabezado titulo={titulo} userId={user.id} />
      <div className="mx-auto max-w-lg">{children}</div>
      <BarraNavegacion rol={perfil.rol} />
    </div>
  );
}
