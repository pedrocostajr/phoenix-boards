-- Forçar atualização do status de aprovação para usuário específico
UPDATE profiles 
SET approved = true, updated_at = now() 
WHERE user_id = '837fa026-16bb-4874-bca7-ce1c822c1f09';

-- Atualizar também para garantir que o trigger de real-time funcionou
UPDATE profiles 
SET updated_at = now() 
WHERE user_id = '837fa026-16bb-4874-bca7-ce1c822c1f09';