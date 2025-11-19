-- supabase/triggers/0001_followers_count.sql
-- Keep profiles.followers_count in sync with follows table

-- 1) Function: increment followers_count on insert
CREATE OR REPLACE FUNCTION public.increment_followers_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET followers_count = COALESCE(followers_count, 0) + 1
  WHERE id = NEW.followed_id;
  RETURN NEW;
END;
$$;

-- 2) Function: decrement followers_count on delete
CREATE OR REPLACE FUNCTION public.decrement_followers_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
  WHERE id = OLD.followed_id;
  RETURN OLD;
END;
$$;

-- 3) Create triggers only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'follows_after_insert'
  ) THEN
    CREATE TRIGGER follows_after_insert
    AFTER INSERT ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_followers_count();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'follows_after_delete'
  ) THEN
    CREATE TRIGGER follows_after_delete
    AFTER DELETE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_followers_count();
  END IF;
END
$$;

-- 4) Optional: backfill current follower counts (run once)
-- This will recalculate followers_count for all existing profiles.
-- Uncomment and run when you want to backfill:
--
-- UPDATE public.profiles
-- SET followers_count = COALESCE((SELECT COUNT(*) FROM public.follows WHERE followed_id = public.profiles.id), 0);

-- Notes:
-- - Run this file in the Supabase SQL Editor or via psql using your DB credentials.
-- - The trigger functions are safe to CREATE OR REPLACE; triggers are only created if not present.
-- - If you use row-level security or schemas other than `public`, adjust table/schema names accordingly.
