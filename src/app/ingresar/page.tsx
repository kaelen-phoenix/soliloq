import { MarcoAcceso } from "@/components/layout/marco-acceso";
import { IngresarFormulario } from "./ingresar-formulario";

export default function IngresarPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <MarcoAcceso>
      {/* En móvil el logotipo lo pone el marco justo arriba de esto; en escritorio el nombre
          ya está en el panel de al lado, así que acá va el título de la acción y no la marca
          repetida dos veces en la misma pantalla. */}
      <div className="mb-8 mt-4 lg:mt-0">
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
          Entrá a Yalope
        </h1>
        <p className="mt-1.5 text-base leading-snug text-ink-500">
          Match teatral para talento y creadores.
        </p>
      </div>

      {searchParams.error === "enlace_invalido" && (
        <p className="mb-5 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-800">
          Ese enlace venció o ya fue usado. Pedí uno nuevo.
        </p>
      )}

      <IngresarFormulario />
    </MarcoAcceso>
  );
}
