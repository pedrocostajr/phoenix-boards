-- ==============================================================================
-- SCRIPT DE DIAGNÓSTICO E CORREÇÃO DE RLS
-- ==============================================================================
-- Execute este script para verificar o estado atual e corrigir as políticas de acesso.

-- 1. Verifica os dados do usuário (bypass RLS)
DO $$
DECLARE
    v_email TEXT := 'contatomoisesrodrigues@gmail.com';
    v_user_record RECORD;
    v_profile_record RECORD;
BEGIN
    RAISE NOTICE '--- INICIANDO DIAGNÓSTICO ---';
    
    SELECT * INTO v_user_record FROM auth.users WHERE email = v_email;
    SELECT * INTO v_profile_record FROM public.profiles WHERE user_id = v_user_record.id;
    
    RAISE NOTICE 'Auth User Found: % (ID: %)', (v_user_record.id IS NOT NULL), v_user_record.id;
    RAISE NOTICE 'Profile Found: %', (v_profile_record.user_id IS NOT NULL);
    RAISE NOTICE 'Profile Approved Status: %', v_profile_record.approved;
    
    IF v_profile_record.approved IS NOT TRUE THEN
        RAISE NOTICE 'CORRIGINDO STATUS DE APROVAÇÃO...';
        UPDATE public.profiles SET approved = true WHERE user_id = v_user_record.id;
    END IF;
END $$;

-- 2. REFORÇA AS POLÍTICAS DE SEGURANÇA (RLS)
-- Garante que o usuário consiga LER o próprio status de aprovação
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = user_id );

-- 3. TESTE DE VISIBILIDADE (Simulação)
-- Tenta selecionar como se fosse o usuário (não funciona perfeitamente no SQL Editor normal, mas ajuda a validar a sintaxe)
SELECT 
    p.user_id,
    p.approved,
    u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'contatomoisesrodrigues@gmail.com';

-- Se retornar uma linha com 'true', o banco está correto.
-- Se o frontend ainda mostrar 'Pendente', o problema é cache ou sessão do navegador.
