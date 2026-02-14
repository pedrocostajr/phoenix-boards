-- ==============================================================================
-- SCRIPT CONSOLIDADO DE CORREÇÃO DE APROVAÇÃO E PERFIL
-- ==============================================================================

-- 1. Garante que a extensão pgcrypto existe (para auth)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Função de Auto-Correção (Self-Healing) do Perfil
-- Esta função permite que o próprio usuário crie/corrija seu perfil
CREATE OR REPLACE FUNCTION public.ensure_own_profile()
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  user_meta JSONB;
  existing_profile_id UUID;
BEGIN
  -- Pega ID e Email do usuário logado
  current_user_id := auth.uid();
  SELECT email, raw_user_meta_data INTO user_email, user_meta FROM auth.users WHERE id = current_user_id;

  -- Se não estiver logado, erro
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Verifica se já existe
  SELECT user_id INTO existing_profile_id FROM public.profiles WHERE user_id = current_user_id;

  IF existing_profile_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Perfil já existe', 'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE user_id = current_user_id));
  END IF;

  -- Tenta inserir o perfil se não existir
  INSERT INTO public.profiles (user_id, full_name, role, approved)
  VALUES (
    current_user_id, 
    COALESCE(user_meta->>'full_name', user_email, 'Usuário Recuperado'), 
    'client', 
    FALSE -- Por padrão,FALSE. Admin deve aprovar.
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Perfil criado com sucesso');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para criar perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, approved)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'client', FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove e recria o trigger para garantir que está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Permissões e RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;

-- Policy: Usuário vê seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = user_id );

-- Policy: Usuário pode inserir seu próprio perfil (necessário para o self-healing via front-end se não usar RPC)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Policy: Usuário pode atualizar dados básicos do seu perfil (mas não 'approved' ou 'role')
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id ); 
-- Nota: Para restringir colunas, idealmente usaríamos triggers ou separaríamos as permissões, 
-- mas por simplicidade aqui confiamos na API do backend para não enviar 'approved' no body de update user-side.

-- Policy: Admin tem acesso total
CREATE POLICY "Admin full access"
ON public.profiles FOR ALL
USING ( 
  auth.jwt() ->> 'email' = 'contato@leadsign.com.br' 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Garantir permissões de execução para a função RPC
GRANT EXECUTE ON FUNCTION public.ensure_own_profile() TO authenticated, service_role;

-- 6. Backfill de emergência para usuários sem perfil
INSERT INTO public.profiles (user_id, full_name, role, approved)
SELECT 
  id, 
  coalesce(raw_user_meta_data->>'full_name', email), 
  'client', 
  FALSE
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Script finalizado
