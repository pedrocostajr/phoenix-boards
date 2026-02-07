-- Permite que o ADMIN exclua QUALQUER perfil (fallback para caso a função falhe)
CREATE POLICY "Admin can delete any profile"
ON public.profiles FOR DELETE
USING ( auth.jwt() ->> 'email' = 'contato@leadsign.com.br' );
