-- ==============================================================================
-- SCRIPT DE EMERGÊNCIA: APROVAÇÃO GLOBAL E REPARO DE PERFIL
-- ==============================================================================
-- Use este script APENAS se você não consegue entrar no sistema nem como admin.
-- Ele vai forçar a aprovação de TODOS os usuários existentes.

BEGIN;

-- 1. Garante que todos os usuários da tabela auth.users tenham um perfil em public.profiles
INSERT INTO public.profiles (user_id, full_name, role, approved)
SELECT 
  id, 
  coalesce(raw_user_meta_data->>'full_name', email), 
  'client', 
  TRUE -- Força TRUE aqui
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO UPDATE
SET approved = TRUE; -- Se já existe, atualiza para TRUE

-- 2. Atualiza todos os perfis existentes para APROVADO
UPDATE public.profiles
SET approved = TRUE;

-- 3. (Opcional) Define o usuário admin especificamente se necessário
-- Substitua pelo email correto se for diferente
UPDATE public.profiles
SET role = 'admin', approved = TRUE
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'contato@leadsign.com.br');

COMMIT;

-- Verifica o resultado
SELECT email, role, approved, full_name 
FROM auth.users 
JOIN public.profiles ON auth.users.id = public.profiles.user_id;
