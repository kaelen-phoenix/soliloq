import { FondoTelon } from "@/components/ui/fondo-telon";
import { Logotipo } from "@/components/ui/logotipo";
import { IngresarFormulario } from "./ingresar-formulario";

export default function IngresarPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <FondoTelon />

      <div className="mb-10">
        <Logotipo tamano="lg" />
        <p className="mt-4 text-[15px] leading-snug text-ink-500">
          Match teatral para talento y creadores.
        </p>
      </div>

      {searchParams.error === "enlace_invalido" && (
        <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Ese enlace venció o ya fue usado. Pedí uno nuevo.
        </p>
      )}

      <IngresarFormulario />
    </main>
  );
}
