/** La URL de vuelta tiene que coincidir exacto con la registrada en el portal de Discord. */
export function redirectDiscord() {
  return `${process.env.NEXT_PUBLIC_SITE_URL || "https://yalope.com"}/api/discord/callback`;
}
