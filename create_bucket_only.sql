-- Tenta criar APENAS o balde 'avatars'
-- Se já existir, não faz nada.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Verifica se foi criado
SELECT * FROM storage.buckets WHERE id = 'avatars';
