-- ==========================================
-- SCRIPT DE CORREÇÃO DEFINITIVA DE PERMISSÕES
-- ==========================================

-- 1. Habilita RLS na tabela (garantia)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Limpa TODAS as políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Recria as políticas limpas e corretas

-- A. Usuário pode VER APENAS seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = user_id );

-- B. Usuário pode ATUALIZAR APENAS seu próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = user_id );

-- C. Admin (contato@leadsign.com.br) pode fazer TUDO
CREATE POLICY "Admin full access"
ON public.profiles FOR ALL
USING ( auth.jwt() ->> 'email' = 'contato@leadsign.com.br' );

-- 4. FORÇA a aprovação do usuário específico via SQL (ignora RLS)
UPDATE public.profiles 
SET approved = true 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'contatomoisesrodrigues@gmail.com');

-- 5. Consulta de verificação
SELECT email, updated_at 
FROM auth.users 
WHERE email = 'contatomoisesrodrigues@gmail.com';
