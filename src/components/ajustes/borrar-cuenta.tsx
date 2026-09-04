"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { borrarCuenta } from "@/app/acciones-ajustes";
import { Boton } from "@/components/ui/boton";
import { ConfirmarBorrado } from "@/components/ui/confirmar-borrado";

export function BorrarCuenta() {
  const t = useTranslations("ajustes");
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    await borrarCuenta();
    // Sin `setEnviando(false)`: si llega hasta acá, ya redirigió a /bienvenida.
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-error-600">{t("zonaPeligro")}</h2>
      <p className="mb-3 mt-0.5 text-xs text-texto-tenue">{t("borrarCuentaAyuda")}</p>

      {!abierto ? (
        <Boton
          variante="fantasma"
          className="!px-0 text-error-600 hover:!bg-transparent hover:underline"
          onClick={() => setAbierto(true)}
        >
          {t("borrarCuenta")}
        </Boton>
      ) : (
        <ConfirmarBorrado
          mensaje={t("borrarCuentaConfirmar", { palabra: "BORRAR" })}
          textoBoton={t("borrarCuentaDefinitivo")}
          textoCargando={t("borrarCuentaEnCurso")}
          textoCancelar={t("cancelar")}
          cargando={enviando}
          onConfirmar={confirmar}
          onCancelar={() => setAbierto(false)}
        />
      )}
    </section>
  );
}
