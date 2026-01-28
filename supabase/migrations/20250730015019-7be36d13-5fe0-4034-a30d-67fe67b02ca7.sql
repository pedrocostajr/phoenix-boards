-- Adicionar campo de aprovação na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN approved BOOLEAN NOT NULL DEFAULT false;

-- Aprovar automaticamente o usuário administrador
UPDATE public.profiles 
SET approved = true 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'contato@leadsign.com.br'
);