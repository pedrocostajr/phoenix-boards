-- Atualiza o nome do usuário para 'Pedro'
UPDATE public.profiles
SET full_name = 'Pedro'
WHERE email = 'contato@leadsign.com.br';

-- Garante que está aprovado também, só pra garantir
UPDATE public.profiles
SET approved = true
WHERE email = 'contato@leadsign.com.br';

-- Verifica o resultado
SELECT * FROM public.profiles WHERE email = 'contato@leadsign.com.br';
