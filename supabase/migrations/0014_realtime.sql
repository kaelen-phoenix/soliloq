-- Habilita la réplica lógica de mensajes para que la suscripción Realtime del
-- cliente reciba los INSERT de la sala (ver sala-chat.tsx).
alter publication supabase_realtime add table mensajes;
