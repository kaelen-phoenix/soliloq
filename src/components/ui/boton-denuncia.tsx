"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "./boton";
import { Icono } from "./icono";
import type { MotivoDenuncia } from "@/lib/supabase/types";

/** Valores del enum de la base; la etiqueta de cada uno está en `cuenta.denuncia.motivos`. */
const MOTIVOS: MotivoDenuncia[] = [
  "acoso",
  "discriminacion",
  "perfil_falso",
  "estafa",
  "convocatoria_enganosa",
  "contenido_inapropiado",
  "otro",
];

/**
 * Denunciar una persona, una convocatoria o una sala.
 *
 * Va discreto y en gris: tiene que estar siempre disponible y no invitar al uso. Un botón
 * de denuncia llamativo se aprieta por enojo, no por daño.
 *
 * No bloquea ni esconde nada por su cuenta: registra el caso para que lo revise una persona.
 * La moderación automática por cantidad de denuncias es un vector de abuso — alcanza con
 * que varios se pongan de acuerdo para silenciar a alguien.
 */
export function BotonDenuncia({
  perfilDenunciadoId,
  obraId,
  salaId,
  queSeDenuncia,
}: {
  perfilDenunciadoId?: string;
  obraId?: string;
  salaId?: string;
  /** Cómo nombrar lo denunciado en el encabezado, ya traducido. Ej: "a Natalia", "esta convocatoria". */
  queSeDenuncia: string;
}) {
  const t = useTranslations("cuenta.denuncia");
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) return;

    setEnviando(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnviando(false);
      setError(t("sinSesion"));
      return;
    }

    const { error: errorBd } = await supabase.from("denuncias").insert({
      denunciante_id: user.id,
      perfil_denunciado_id: perfilDenunciadoId ?? null,
      obra_id: obraId ?? null,
      sala_id: salaId ?? null,
      motivo,
      detalle: detalle.trim() || null,
    });

    setEnviando(false);

    if (errorBd) {
      // El índice único deja pasar una sola denuncia abierta por objeto y denunciante.
      setError(
        errorBd.code === "23505"
          ? t("yaEnviada")
          : t("error")
      );
      return;
    }

    setEnviada(true);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 text-xs text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        <Icono nombre="bandera" className="h-3.5 w-3.5" />
        {t("denunciar")}
      </button>
    );
  }

  if (enviada) {
    return (
      <div className="rounded-xl border border-borde bg-fondo-sutil p-4">
        <p className="text-base font-medium text-texto">{t("recibidaTitulo")}</p>
        <p className="mt-1 text-sm leading-relaxed text-texto-tenue">
          {t("recibidaTexto")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-xl border border-borde p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium text-texto">{t("titulo", { que: queSeDenuncia })}</p>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="shrink-0 text-texto-tenue hover:text-texto"
          aria-label={t("cerrar")}
        >
          <Icono nombre="cruz" className="h-4 w-4" />
        </button>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">{t("motivo")}</legend>
        {MOTIVOS.map((m) => (
          <label
            key={m}
            className="flex cursor-pointer items-center gap-2.5 text-sm text-texto"
          >
            <input
              type="radio"
              name="motivo"
              value={m}
              checked={motivo === m}
              onChange={() => setMotivo(m)}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            {t(`motivos.${m}`)}
          </label>
        ))}
      </fieldset>

      <textarea
        rows={3}
        maxLength={1000}
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        placeholder={t("placeholder")}
        className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
      />

      {error && <p className="text-xs text-error-600">{error}</p>}

      <Boton type="submit" disabled={!motivo} cargando={enviando} textoCargando={t("enviando")}>
        {t("enviar")}
      </Boton>
    </form>
  );
}
