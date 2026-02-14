-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE LOGIN E APROVAÇÃO (VERSÃO FINAL 3)
-- ==============================================================================
-- Este script força a atualização da senha e aprovação
-- para o usuário 'contatomoisesrodrigues@gmail.com'.
-- Senha definida: 'Phoenix120126#'

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_email TEXT := 'contatomoisesrodrigues@gmail.com';
    v_password TEXT := 'Phoenix120126#';
    v_user_id UUID;
BEGIN
    -- 1. Busca o ID do usuário
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NOT NULL THEN
        -- 2. Atualiza a senha na tabela de autenticação
        -- Nota: confirm_at é gerado, email_confirmed_at pode ser atualizado
        UPDATE auth.users
        SET encrypted_password = crypt(v_password, gen_salt('bf')),
            email_confirmed_at = NOW(),
            raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{provider}', '"email"'),
            updated_at = NOW()
        WHERE id = v_user_id;

        RAISE NOTICE 'Senha e confirmação de email atualizados para ID %', v_user_id;

        -- 3. Garante que o perfil existe e está APROVADO
        -- REMOVIDO: coluna email (não existe na tabela profiles)
        INSERT INTO public.profiles (user_id, full_name, approved)
        VALUES (v_user_id, 'Moises Rodrigues', true)
        ON CONFLICT (user_id) DO UPDATE
        SET approved = true,
            updated_at = NOW();

        RAISE NOTICE 'Perfil atualizado e aprovado com sucesso.';
    ELSE
        RAISE NOTICE 'Usuário % não encontrado em auth.users.', v_email;
    END IF;
END $$;

-- 4. Verificação final e Reforço de RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
CREATE POLICY "Admin full access"
ON public.profiles FOR ALL
USING ( auth.jwt() ->> 'email' = 'contato@leadsign.com.br' );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
