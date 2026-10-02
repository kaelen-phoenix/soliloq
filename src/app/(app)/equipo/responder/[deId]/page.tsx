import { redirect } from "next/navigation";

/** Responder un «Contactar» ya no existe (#283, sin chat de dos personas): al inicio. */
export default function ResponderPage() {
  redirect("/");
}
