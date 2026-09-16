"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";
import { aceptarNormas } from "@/app/acciones-normas";
import { Boton } from "@/components/ui/boton";

export function FormularioAceptarNormas({ next }: { next?: string }) {
  const t = useTranslations("aceptarNormas");
  const [marcado, setMarcado] = useState(false);
  const [mostrarError, setMostrarError] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!marcado) {
          setMostrarError(true);
          return;
        }
        iniciarTransicion(() => aceptarNormas(next));
      }}
    >
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => {
            setMarcado(e.target.checked);
            setMostrarError(false);
          }}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-texto focus:ring-accion"
        />
        <span className="text-sm text-texto">
          {t("checkbox")}{" "}
          <Link href="/normas" target="_blank" className="font-medium text-brand-600 hover:underline">
            {t("enlace")}
          </Link>
        </span>
      </label>

      {mostrarError && <p className="mt-2 text-sm text-error-600">{t("error")}</p>}

      <Boton type="submit" cargando={pendiente} textoCargando={t("enviando")} className="mt-6 w-full">
        {t("boton")}
      </Boton>
    </form>
  );
}
