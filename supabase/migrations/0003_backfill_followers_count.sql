-- supabase/migrations/0003_backfill_followers_count.sql
-- Backfill `profiles.followers_count` from the `follows` table. Run once.

BEGIN;

UPDATE public.profiles
SET followers_count = COALESCE((SELECT COUNT(*) FROM public.follows WHERE followed_id = public.profiles.id), 0);

COMMIT;
