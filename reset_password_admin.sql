-- ==============================================================================
-- SCRIPT DE EMERGÊNCIA: RESETAR SENHA DE ADMIN
-- ==============================================================================
-- Substitua 'contato@leadsign.com.br' pelo email do seu admin se for diferente.

BEGIN;

UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'contato@leadsign.com.br';

COMMIT;

-- Verifica se o usuário existe
SELECT id, email, last_sign_in_at FROM auth.users WHERE email = 'contato@leadsign.com.br';
