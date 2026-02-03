-- 1. Create the function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, role, approved)
  values (new.id, new.raw_user_meta_data->>'full_name', 'client', false);
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger (safely)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Backfill: Create profiles for any existing users that don't have one
insert into public.profiles (user_id, full_name, role, approved)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', email), 
  'client', 
  false
from auth.users
where id not in (select user_id from public.profiles);
