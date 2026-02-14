-- 1. Cria/Atualiza a função que cria o perfil automaticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, role, approved)
  values (new.id, new.raw_user_meta_data->>'full_name', 'client', false)
  on conflict (user_id) do nothing; -- Evita erro se já existir
  return new;
end;
$$ language plpgsql security definer;

-- 2. Recria o "Gatilho" (Trigger) para garantir que funcione
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. CORREÇÃO IMEDIATA: Cria perfis para quem se cadastrou e ficou sem
insert into public.profiles (user_id, full_name, role, approved)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', email), 
  'client', 
  false
from auth.users
where id not in (select user_id from public.profiles);

-- 4. Confirmação
select count(*) as perfis_criados from public.profiles;
