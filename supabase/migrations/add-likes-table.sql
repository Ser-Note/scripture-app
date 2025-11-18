-- Migration: Add likes table for upvote system
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- 'question', 'answer', 'post', etc.
  item_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_likes_item ON likes(item_type, item_id);
