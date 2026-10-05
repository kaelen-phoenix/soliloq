"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Boton } from "./boton";

/**
 * Confirmación de una acción irreversible: hace falta tipear una palabra exacta (por
 * defecto BORRAR) para habilitar el botón. Un `window.confirm` se cierra con un click sin
 * leer; esto obliga a parar un segundo y escribir, para estar 100% seguro.
 */
export function ConfirmarBorrado({
  mensaje,
  textoBoton,
  textoCargando,
  textoCancelar,
  palabra = "BORRAR",
  onConfirmar,
  onCancelar,
  cargando = false,
  className = "",
}: {
  mensaje: string;
  textoBoton: string;
  textoCargando?: string;
  textoCancelar?: string;
  palabra?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando?: boolean;
  className?: string;
}) {
  const t = useTranslations("cuenta.ui");
  const [texto, setTexto] = useState("");
  const habilitado = texto.trim().toUpperCase() === palabra;

  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-error-600 p-3 ${className}`}>
      <p className="text-sm text-texto">{mensaje}</p>
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={palabra}
        autoComplete="off"
        autoFocus
        aria-label={t("escribiParaConfirmar", { palabra })}
        className="w-32 rounded-lg border border-borde bg-superficie px-3 py-2 text-sm text-texto outline-none focus:border-error-600"
      />
      <div className="flex gap-2">
        <Boton
          type="button"
          variante="peligro"
          className="border border-error-600"
          disabled={!habilitado || cargando}
          cargando={cargando}
          textoCargando={textoCargando ?? t("borrando")}
          onClick={onConfirmar}
        >
          {textoBoton}
        </Boton>
        <Boton type="button" variante="secundario" disabled={cargando} onClick={onCancelar}>
          {textoCancelar ?? t("cancelar")}
        </Boton>
      </div>
    </div>
  );
}
