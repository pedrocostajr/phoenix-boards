-- Remover política restritiva de UPDATE na tabela profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Criar nova política que permite ao admin atualizar qualquer perfil
CREATE POLICY "Admin can update any profile or users can update own profile"
ON public.profiles
FOR UPDATE
USING (
  auth.email() = 'contato@leadsign.com.br' OR auth.uid() = user_id
);

-- Criar política que permite ao admin visualizar dados administrativos
CREATE POLICY "Admin has full access to profiles"
ON public.profiles
FOR ALL
USING (auth.email() = 'contato@leadsign.com.br');