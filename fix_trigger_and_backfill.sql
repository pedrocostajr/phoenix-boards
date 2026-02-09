-- ==========================================
-- SCRIPT DE CORREÇÃO DO "GATILHO" DE NOVOS USUÁRIOS
-- ==========================================

-- 1. Remove versões antigas para garantir limpeza
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Cria a função que gera o perfil automaticamente
-- Usa SECURITY DEFINER para ter permissão total ao criar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, approved)
  VALUES (
    NEW.id,
    -- Garante que sempre tenha um nome, mesmo que não venha no cadastro
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Novo Usuário'),
    'client',
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING; -- Evita erro se já existir
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconecta o Gatilho na tabela de usuários
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. FORÇA BRUTA: Cria perfis para quem se cadastrou e não apareceu
INSERT INTO public.profiles (user_id, full_name, role, approved)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email, 'Novo Usuário'), 
  'client', 
  FALSE
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- 5. Confirmação (mostra quantos perfis existem agora)
SELECT count(*) as total_perfis FROM public.profiles;
