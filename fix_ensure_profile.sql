-- ==========================================
-- SCRIPT DE AUTO-CURA (SELF-HEALING) DO PERFIL
-- ==========================================

-- 1. Permite que o usuário insira seu próprio perfil (caso não tenha)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- 2. Cria função para o usuário "se consertar"
CREATE OR REPLACE FUNCTION public.ensure_own_profile()
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  user_meta JSONB;
BEGIN
  -- Pega ID e Email do usuário logado
  current_user_id := auth.uid();
  SELECT email, raw_user_meta_data INTO user_email, user_meta FROM auth.users WHERE id = current_user_id;

  -- Se não estiver logado, erro
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Tenta inserir o perfil se não existir
  INSERT INTO public.profiles (user_id, full_name, role, approved)
  VALUES (
    current_user_id, 
    COALESCE(user_meta->>'full_name', user_email, 'Usuário Recuperado'), 
    'client', 
    FALSE -- Por segurança, começa false, mas admin aprova depois
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Perfil verificado/criado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
