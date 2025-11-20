-- supabase/migrations/0004_notify_user_rpc.sql
-- Create a SECURITY DEFINER RPC to insert notifications despite RLS.
-- Run this as a project owner in Supabase SQL Editor.

-- 1) Add actor_id column if missing
ALTER TABLE IF EXISTS public.notifications
ADD COLUMN IF NOT EXISTS actor_id uuid;

-- 2) Create secure function
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type text,
  p_data jsonb,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, data, read, actor_id, created_at)
  VALUES (p_user_id, p_type, COALESCE(p_data, '{}'::jsonb), false, p_actor, now());
END;
$$;

-- 3) Grant execute to authenticated so logged-in users can call rpc
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, jsonb, uuid) TO authenticated;

-- Notes:
-- Run this in Supabase SQL Editor as the project owner account. SECURITY DEFINER
-- functions run with the function owner's privileges. Keep the function minimal.
