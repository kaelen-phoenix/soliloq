"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { createClient } from "@/lib/supabase/client";

type Tipo = "sugerencia" | "sponsor" | "donacion" | "otro";

export function FormularioContacto({ tipoInicial = "sugerencia" }: { tipoInicial?: Tipo }) {
  const t = useTranslations("apoyar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "ok" | "error">("inicial");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const supabase = createClient();
    const { error } = await supabase.rpc("enviar_mensaje_contacto", {
      p_nombre: nombre,
      p_email: email,
      p_tipo: tipo,
      p_mensaje: mensaje,
    });
    setEstado(error ? "error" : "ok");
  }

  if (estado === "ok") {
    return (
      <p role="status" className="rounded-2xl border border-exito-600/30 bg-exito-50 px-4 py-3 text-sm text-exito-800">
        {t("enviadoOk")}
      </p>
    );
  }

  const tipos: Tipo[] = ["sugerencia", "sponsor", "donacion", "otro"];

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <CampoTexto id="c-nombre" etiqueta={t("nombre")} value={nombre} required maxLength={120} onChange={(e) => setNombre(e.target.value)} />
        <CampoTexto id="c-email" etiqueta={t("email")} type="email" value={email} required maxLength={200} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-texto">{t("tipo")}</span>
        <div className="flex flex-wrap gap-2">
          {tipos.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={tipo === x}
              onClick={() => setTipo(x)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                tipo === x ? "border-accion bg-accion text-accion-texto" : "border-borde text-texto-tenue"
              }`}
            >
              {t(`tipo_${x}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-mensaje" className="text-sm font-medium text-texto">
          {t("mensaje")}
        </label>
        <textarea
          id="c-mensaje"
          required
          rows={5}
          maxLength={4000}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        />
      </div>

      {estado === "error" && <p className="text-xs text-error-600">{t("enviadoError")}</p>}

      <div>
        <Boton type="submit" cargando={estado === "enviando"} textoCargando={t("enviando")}>
          {t("enviar")}
        </Boton>
      </div>
    </form>
  );
}
