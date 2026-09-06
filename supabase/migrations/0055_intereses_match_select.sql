-- El dueño puede leer sus propios "Me interesa" (para pintar el estado del botón en la
-- ficha del talento). NO ve los que le marcaron a él: el match sigue siendo a ciegas
-- —igual que `intereses_equipo` en 0033—. El resto de `intereses_match` sigue solo por RPC.

create policy "intereses_match_select_propio" on intereses_match
  for select using (de_perfil = auth.uid());
