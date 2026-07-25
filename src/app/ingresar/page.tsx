import { IngresarFormulario } from "./ingresar-formulario";

export default function IngresarPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <p className="text-4xl">🎭</p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Soliloq</h1>
        <p className="mt-1 text-sm text-ink-500">Match teatral para talento y creadores.</p>
      </div>
      {searchParams.error === "enlace_invalido" && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          Ese enlace venció o ya fue usado. Pedí uno nuevo.
        </p>
      )}
      <IngresarFormulario />
    </main>
  );
}
