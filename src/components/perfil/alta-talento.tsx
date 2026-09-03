"use client";

import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { FormularioTalento } from "./formulario-talento";

type Fase = "elegir" | "subiendo" | "form";

// Solo los campos que puede precargar la extracción (ver `lib/extraccion-cv`).
interface CamposCV {
  nombre?: string;
  ubicacion_texto?: string;
  experiencia?: string;
  habilidades?: string[];
  redes?: Record<string, string>;
}

/**
 * Alta del perfil de Talento (issue #5). Antes del formulario ofrece subir un CV
 * (PDF o Word) para precargarlo. Nada de lo extraído se guarda: alimenta el formulario,
 * que la persona revisa y confirma. Si la extracción falla, cae al formulario vacío.
 */
export function AltaTalento({ userId }: { userId: string }) {
  const [fase, setFase] = useState<Fase>("elegir");
  const [datos, setDatos] = useState<CamposCV | undefined>(undefined);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setAviso(null);
    setFase("subiendo");

    const fd = new FormData();
    fd.append("file", file);

    let json: { ok?: boolean; error?: string; campos?: CamposCV; marcados?: string[] };
    try {
      const r = await fetch("/perfil/nuevo/extraer", { method: "POST", body: fd });
      json = await r.json();
    } catch {
      json = { ok: false };
    }

    if (json.error === "formato") {
      setError("Por ahora solo aceptamos PDF o Word (.docx).");
      setFase("elegir");
      return;
    }
    if (json.error === "tamaño") {
      setError("El archivo es muy grande. El máximo es 8 MB.");
      setFase("elegir");
      return;
    }

    if (json.ok && json.campos) {
      setDatos(json.campos);
      setMarcados(json.marcados ?? []);
    } else {
      setDatos(undefined);
      setMarcados([]);
      setAviso("No pudimos leer datos de ese archivo. Completá el perfil a mano.");
    }
    setFase("form");
  }

  if (fase === "form") {
    return (
      <>
        {aviso && (
          <p className="mb-4 rounded-xl border border-alerta-600/30 bg-alerta-50 px-3.5 py-2.5 text-sm text-alerta-800">
            {aviso}
          </p>
        )}
        <FormularioTalento
          userId={userId}
          esAlta
          fotosIniciales={[]}
          datosIniciales={datos}
          camposDelArchivo={marcados}
        />
      </>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <button
        type="button"
        onClick={() => setFase("form")}
        className="flex items-center justify-between rounded-xl border border-borde bg-superficie px-4 py-3.5 text-left text-sm font-medium text-texto transition-colors hover:border-ink-300"
      >
        Completar a mano
        <Icono nombre="flecha-derecha" className="h-4 w-4 text-texto-tenue" />
      </button>

      <label
        className={`flex items-center justify-between rounded-xl border border-borde bg-superficie px-4 py-3.5 text-sm font-medium text-texto transition-colors ${
          fase === "subiendo" ? "opacity-60" : "cursor-pointer hover:border-ink-300"
        }`}
      >
        {fase === "subiendo" ? "Leyendo el archivo…" : "Subir un CV (PDF o Word)"}
        <Icono nombre="mas" className="h-4 w-4 text-texto-tenue" />
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={subir}
          disabled={fase === "subiendo"}
        />
      </label>

      {error && <p className="text-sm text-error-600">{error}</p>}

      <p className="text-xs leading-relaxed text-texto-tenue">
        Extraemos lo que podamos —nombre, experiencia, habilidades, redes— y lo revisás
        vos antes de guardar. La fecha de nacimiento y las fotos van a mano. El archivo no
        se guarda.
      </p>
    </div>
  );
}
