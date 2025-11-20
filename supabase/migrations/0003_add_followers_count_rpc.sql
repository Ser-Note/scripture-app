-- Supabase migration: Add atomic RPCs to increment/decrement profiles.followers_count
-- 0003_add_followers_count_rpc.sql

-- Create an RPC to increment followers_count atomically
CREATE OR REPLACE FUNCTION public.rpc_increment_followers_count(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.profiles
  SET followers_count = COALESCE(followers_count, 0) + 1
  WHERE id = p_id
  RETURNING followers_count INTO new_count;

  -- If row wasn't found, return NULL
  RETURN new_count;
END;
$$;

-- Create an RPC to decrement followers_count atomically
CREATE OR REPLACE FUNCTION public.rpc_decrement_followers_count(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.profiles
  SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
  WHERE id = p_id
  RETURNING followers_count INTO new_count;

  RETURN new_count;
END;
$$;

-- Note: Run this migration in Supabase SQL editor or via psql. These functions perform an atomic
-- UPDATE and return the new followers_count. Call them from the client with Supabase's .rpc().
