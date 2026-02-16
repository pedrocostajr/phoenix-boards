-- ==============================================================================
-- FIX RLS INFINITE RECURSION
-- ==============================================================================
-- Este script corrige o erro "infinite recursion detected in policy for relation profiles".
-- O erro ocorre porque a policy "Admin full access" tentava ler a tabela profiles
-- para verificar se o usuário é admin, o que disparava a própria policy novamente.

BEGIN;

-- 1. Cria uma função segura para verificar se é admin
-- SECURITY DEFINER: roda com permissões do dono (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remove as policies antigas problemáticas
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Recria as policies usando a nova função

-- Policy: Admin tem acesso total (Email hardcoded OU role admin via função segura)
CREATE POLICY "Admin full access"
ON public.profiles FOR ALL
USING (
  auth.jwt() ->> 'email' = 'contato@leadsign.com.br'
  OR
  public.is_admin()
);

-- Policy: Usuário vê seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = user_id );

-- Policy: Usuário pode inserir seu próprio perfil
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Policy: Usuário pode atualizar dados básicos do seu perfil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = user_id );

COMMIT;
