-- 1. Add email column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill existing emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
AND p.email IS NULL;

-- 3. Create or replace the function to sync email on user creation/update
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'client',
    new.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = new.email,
      full_name = COALESCE(new.raw_user_meta_data->>'full_name', profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure trigger handles updates too (optional but good)
-- First drop to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Verification
SELECT COUNT(*) as profiles_with_email FROM public.profiles WHERE email IS NOT NULL;
