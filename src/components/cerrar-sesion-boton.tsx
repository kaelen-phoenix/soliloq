"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";

export function CerrarSesionBoton() {
  const router = useRouter();
  const t = useTranslations("cuenta");

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <Boton variante="peligro" onClick={cerrarSesion}>
      {t("cerrarSesion")}
    </Boton>
  );
}
