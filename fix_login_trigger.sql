-- Drop the problematic trigger that fires on UPDATE (login)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger ONLY for INSERT (New users)
-- effectively disabling it for login events (UPDATE last_sign_in_at)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Optional: Verify no other triggers exist (for debugging, if this doesn't fix it)
-- but this action alone should unblock login.
