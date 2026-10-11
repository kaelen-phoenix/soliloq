"use client";

import { useTranslations } from "next-intl";

/**
 * El alta del perfil como asistente por pasos (#383). Lo obligatorio va primero (datos
 * básicos y fotos); lo demás es opcional y no frena el avance; el último paso es revisar y
 * confirmar. Los campos y sus reglas son los mismos del perfil: acá solo se reparten.
 */
export const TOTAL_PASOS = 6;

/** Qué errores de `validar()` corresponden a cada paso (la clave del campo). */
const CAMPOS_POR_PASO: Record<number, (clave: string) => boolean> = {
  1: (c) => ["nombre", "fecha_nacimiento", "ubicacion", "genero", "genero_descripcion"].includes(c),
  2: (c) => c === "fotos",
  3: (c) => c === "experiencia" || c === "formacion",
  4: (c) => c === "videoreel_url" || c.startsWith("redes_"),
  5: (c) => c.startsWith("creador_"),
};

export const PASOS_OPCIONALES = new Set([3, 4, 5]);

export function erroresDelPaso(errores: Record<string, string>, paso: number): Record<string, string> {
  const pertenece = CAMPOS_POR_PASO[paso];
  if (!pertenece) return errores;
  return Object.fromEntries(Object.entries(errores).filter(([clave]) => pertenece(clave)));
}

/** El primer paso con algún error, para volver ahí si algo falla al confirmar. */
export function primerPasoConError(errores: Record<string, string>): number | null {
  for (let paso = 1; paso < TOTAL_PASOS; paso++) {
    if (Object.keys(erroresDelPaso(errores, paso)).length > 0) return paso;
  }
  return null;
}

export function IndicadorPasos({ paso }: { paso: number }) {
  const t = useTranslations("perfil.wizard");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-xs text-texto-tenue">
        <span>{t("pasoDe", { n: paso, total: TOTAL_PASOS })}</span>
        {PASOS_OPCIONALES.has(paso) && (
          <span className="rounded-full border border-borde px-2 py-0.5 font-medium">{t("opcional")}</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_PASOS}
        aria-valuenow={paso}
        aria-label={t("pasoDe", { n: paso, total: TOTAL_PASOS })}
        className="flex gap-1"
      >
        {Array.from({ length: TOTAL_PASOS }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < paso ? "bg-accion" : "bg-borde"}`}
          />
        ))}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-texto">{t(`pasos.${paso}.titulo`)}</h2>
      <p className="text-sm text-texto-tenue">{t(`pasos.${paso}.instruccion`)}</p>
    </div>
  );
}

/** Un bloque del resumen del último paso, con «Editar» para volver a ese paso. */
export function BloqueResumen({
  titulo,
  onEditar,
  children,
}: {
  titulo: string;
  onEditar: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("perfil.wizard");
  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-borde p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-texto">{titulo}</h3>
        <button
          type="button"
          onClick={onEditar}
          className="text-sm font-medium text-texto-tenue underline underline-offset-4 hover:text-texto"
        >
          {t("editar")}
        </button>
      </div>
      <div className="flex flex-col gap-1 text-sm text-texto">{children}</div>
    </section>
  );
}
