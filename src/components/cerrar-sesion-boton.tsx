"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";

export function CerrarSesionBoton() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <Boton variante="peligro" onClick={cerrarSesion}>
      Cerrar sesión
    </Boton>
  );
}
