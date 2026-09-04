"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { guardarIdioma, guardarTema } from "@/app/acciones-ajustes";
import { BotonInstalar } from "@/components/pwa/boton-instalar";
import { BotonNotificaciones } from "@/components/pwa/boton-notificaciones";
import { BorrarCuenta } from "@/components/ajustes/borrar-cuenta";

type Idioma = "es" | "en";
type Tema = "sistema" | "claro" | "oscuro";

function Opciones<T extends string>({
  valor,
  opciones,
  onElegir,
  pendiente,
}: {
  valor: T;
  opciones: { valor: T; etiqueta: string }[];
  onElegir: (v: T) => void;
  pendiente: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          disabled={pendiente}
          aria-pressed={valor === o.valor}
          onClick={() => onElegir(o.valor)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            valor === o.valor
              ? "border-accion bg-accion text-accion-texto"
              : "border-borde text-texto-tenue hover:border-ink-300"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function FormularioAjustes({
  idiomaInicial,
  temaInicial,
}: {
  idiomaInicial: Idioma;
  temaInicial: Tema;
}) {
  const t = useTranslations("ajustes");
  const [pendiente, iniciar] = useTransition();

  // Sin estado local: la fuente de verdad es la cookie/DB y el `revalidatePath` del server
  // action re-renderiza esta pantalla con el valor nuevo.
  function aplicarTema(tema: Tema) {
    // El data-attr se refleja al toque para que el cambio de tema no espere al round-trip.
    if (tema === "sistema") delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = tema === "oscuro" ? "dark" : "light";
    iniciar(() => guardarTema(tema));
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <section>
        <h2 className="text-sm font-medium text-texto">{t("idioma")}</h2>
        <p className="mb-3 mt-0.5 text-xs text-texto-tenue">{t("idiomaAyuda")}</p>
        <Opciones<Idioma>
          valor={idiomaInicial}
          pendiente={pendiente}
          onElegir={(v) => iniciar(() => guardarIdioma(v))}
          opciones={[
            { valor: "es", etiqueta: t("español") },
            { valor: "en", etiqueta: t("ingles") },
          ]}
        />
      </section>

      <section>
        <h2 className="text-sm font-medium text-texto">{t("tema")}</h2>
        <p className="mb-3 mt-0.5 text-xs text-texto-tenue">{t("temaAyuda")}</p>
        <Opciones<Tema>
          valor={temaInicial}
          pendiente={pendiente}
          onElegir={aplicarTema}
          opciones={[
            { valor: "sistema", etiqueta: t("sistema") },
            { valor: "claro", etiqueta: t("claro") },
            { valor: "oscuro", etiqueta: t("oscuro") },
          ]}
        />
      </section>

      <BotonInstalar conSeccion />

      <BotonNotificaciones />

      <BorrarCuenta />
    </div>
  );
}
