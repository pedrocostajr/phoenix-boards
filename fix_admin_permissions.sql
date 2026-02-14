-- Drop existing policies on profiles to be clean
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Admin can do everything" on public.profiles;
drop policy if exists "Profiles are viewable by users" on public.profiles;
drop policy if exists "Admin can update profiles" on public.profiles;

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy 1: Users can view their own profile (Critical for login check)
create policy "Users can view own profile"
on public.profiles for select
using ( auth.uid() = user_id );

-- Policy 2: Admin can view ALL profiles
-- We use the specific email check as per project convention
create policy "Admin can view all profiles"
on public.profiles for select
using ( auth.jwt() ->> 'email' = 'contato@leadsign.com.br' );

-- Policy 3: Admin can update ANY profile (To approve users)
create policy "Admin can update any profile"
on public.profiles for update
using ( auth.jwt() ->> 'email' = 'contato@leadsign.com.br' );

-- Policy 4: Users can insert their own profile (triggered by auth signup usually, or trigger)
-- The trigger uses security definer so this might not be strictly needed for the trigger, 
-- but good for client-side creation if ever used.
create policy "Users can insert own profile"
on public.profiles for insert
with check ( auth.uid() = user_id );

-- Policy 5: Users can update their own profile (optional, for avatar/name)
create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = user_id );

-- Verify policies
select * from pg_policies where tablename = 'profiles';
