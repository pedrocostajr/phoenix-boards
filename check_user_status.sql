-- ==============================================================================
-- DIAGNÓSTICO COMPLETO DE USUÁRIO
-- ==============================================================================

-- 1. Verifica se a extensão de criptografia está ativa
SELECTname, default_version, installed_version 
FROM pg_available_extensions 
WHERE name = 'pgcrypto';

-- 2. Verifica detalhes do usuário (Confirmação de email, banimento, etc)
SELECT 
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    last_sign_in_at, 
    raw_app_meta_data, 
    raw_user_meta_data,
    is_sso_user,
    banned_until
FROM auth.users 
WHERE email = 'contato@leadsign.com.br';

-- 3. Verifica se o perfil existe e está aprovado
SELECT * FROM public.profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contato@leadsign.com.br');

-- 4. (Opcional) Tenta confirmar o email manualmente se estiver nulo
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'contato@leadsign.com.br' AND email_confirmed_at IS NULL;
