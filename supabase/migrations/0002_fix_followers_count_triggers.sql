-- supabase/migrations/0002_fix_followers_count_triggers.sql
-- Fix broken triggers that reference `follower_count` (singular) and replace them
-- with triggers that maintain `profiles.followers_count` (plural).

-- 1) Drop old triggers and functions if present (these referenced follower_count)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_follower_count') THEN
    RAISE NOTICE 'Dropping function increment_follower_count()';
    DROP FUNCTION IF EXISTS increment_follower_count() CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrement_follower_count') THEN
    RAISE NOTICE 'Dropping function decrement_follower_count()';
    DROP FUNCTION IF EXISTS decrement_follower_count() CASCADE;
  END IF;

  -- Old triggers created by earlier migration
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'follows_insert_trigger') THEN
    RAISE NOTICE 'Dropping trigger follows_insert_trigger';
    DROP TRIGGER IF EXISTS follows_insert_trigger ON public.follows;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'follows_delete_trigger') THEN
    RAISE NOTICE 'Dropping trigger follows_delete_trigger';
    DROP TRIGGER IF EXISTS follows_delete_trigger ON public.follows;
  END IF;
END
$$;

-- 2) Create correct functions that update profiles.followers_count
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

-- 3) Create triggers (idempotent if names don't already exist)
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

-- 4) Optional backfill: uncomment and run once to populate followers_count for existing profiles
-- UPDATE public.profiles
-- SET followers_count = COALESCE((SELECT COUNT(*) FROM public.follows WHERE followed_id = public.profiles.id), 0);

-- Notes:
-- Run this file in the Supabase SQL Editor or via psql using your DB credentials.
-- The DO blocks protect against errors if the old functions or triggers don't exist.
