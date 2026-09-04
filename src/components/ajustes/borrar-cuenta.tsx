"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { borrarCuenta } from "@/app/acciones-ajustes";
import { Boton } from "@/components/ui/boton";

/** Palabra que hay que tipear para habilitar el borrado. La misma en los dos idiomas. */
const CONFIRMACION = "BORRAR";

export function BorrarCuenta() {
  const t = useTranslations("ajustes");
  const [abierto, setAbierto] = useState(false);
  const [palabra, setPalabra] = useState("");
  const [enviando, setEnviando] = useState(false);

  const habilitado = palabra.trim().toUpperCase() === CONFIRMACION;

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
        <form
          action={async () => {
            setEnviando(true);
            await borrarCuenta();
          }}
          className="flex flex-col gap-3 rounded-xl border border-error-600 p-4"
        >
          <p className="text-sm text-texto">{t("borrarCuentaConfirmar", { palabra: CONFIRMACION })}</p>
          <input
            type="text"
            value={palabra}
            onChange={(e) => setPalabra(e.target.value)}
            autoComplete="off"
            aria-label={t("borrarCuentaConfirmar", { palabra: CONFIRMACION })}
            className="w-40 rounded-lg border border-borde bg-superficie px-3 py-2 text-sm text-texto outline-none focus:border-error-600"
          />
          <div className="flex gap-2">
            <Boton
              type="submit"
              variante="peligro"
              className="border border-error-600"
              disabled={!habilitado}
              cargando={enviando}
              textoCargando={t("borrarCuentaEnCurso")}
            >
              {t("borrarCuentaDefinitivo")}
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              disabled={enviando}
              onClick={() => {
                setAbierto(false);
                setPalabra("");
              }}
            >
              {t("cancelar")}
            </Boton>
          </div>
        </form>
      )}
    </section>
  );
}
