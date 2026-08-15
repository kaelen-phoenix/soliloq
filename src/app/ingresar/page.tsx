import { IngresarFormulario } from "./ingresar-formulario";

export default function IngresarPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <h1 className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink-900">
          Yalope
        </h1>
        <p className="mt-2.5 text-[15px] leading-snug text-ink-500">
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
