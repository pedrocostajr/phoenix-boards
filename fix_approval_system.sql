-- ==========================================
-- SCRIPT DE CORREÇÃO TOTAL DO SISTEMA DE APROVAÇÃO
-- ==========================================

-- 1. Garante que qualquer usuário possa ler seu próprio status de aprovação
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = user_id );

-- 2. Cria uma função segura (SECURITY DEFINER) para aprovar usuários
-- Essa função roda com permissões de "superusuário" do banco,
-- ignorando bloqueios de RLS para quem executa.
CREATE OR REPLACE FUNCTION public.approve_user_fully(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- A. Atualiza o perfil para aprovado
  UPDATE public.profiles
  SET approved = true
  WHERE user_id = target_user_id;

  -- B. Tenta confirmar o email automaticamente (hack do banco)
  -- Nota: Isso altera a tabela interna do Supabase Auth.
  -- Funciona se o usuário do banco tiver permissão (postgres costuma ter).
  UPDATE auth.users
  SET email_confirmed_at = now(),
      confirmed_at = now()
  WHERE id = target_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para excluir usuário (Fallback poderoso)
CREATE OR REPLACE FUNCTION public.delete_user_fully(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- A. Remove perfil
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- B. Remove usuário da autenticação
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garante que apenas o Admin possa executar essas funções
REVOKE EXECUTE ON FUNCTION public.approve_user_fully FROM public;
REVOKE EXECUTE ON FUNCTION public.delete_user_fully FROM public;

-- Cria um role 'admin' se não existir (opcional, mas bom pra organizar)
-- Mas vamos simplificar: Permissão baseada no email do chamador não funciona bem em funções RPC
-- Então vamos deixar público mas validar o email DENTRO da função por segurança extra.

CREATE OR REPLACE FUNCTION public.approve_user_secure(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_email TEXT;
BEGIN
  -- Pega o email de quem está chamando a função
  SELECT auth.jwt() ->> 'email' INTO caller_email;

  -- Valida se é o admin
  IF caller_email <> 'contato@leadsign.com.br' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão negada');
  END IF;

  -- Executa aprovação
  PERFORM public.approve_user_fully(target_user_id);
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_user_secure(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  caller_email TEXT;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO caller_email;

  IF caller_email <> 'contato@leadsign.com.br' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão negada');
  END IF;

  PERFORM public.delete_user_fully(target_user_id);
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
