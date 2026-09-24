import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { ResponderInteres, type PersonaParaResponder } from "@/components/equipo/responder-interes";

export default async function ResponderInteresPage({ params }: { params: { deId: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("perfil_para_responder", { p_de: params.deId });
  if (error) reportarErrorSupabase(error, { rpc: "perfil_para_responder", de: params.deId });
  const persona = data?.[0];

  // `perfil_para_responder` ya filtra por "le mandaste un interés a quien pregunta": si no
  // hay fila, o el token no corresponde a nadie, o no te contactó — mismo 404 para los dos.
  if (!persona) notFound();

  return (
    <main className="px-5 py-5">
      <ResponderInteres persona={persona as PersonaParaResponder} />
    </main>
  );
}
