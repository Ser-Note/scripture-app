-- Add is_pinned column to community table
ALTER TABLE community 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on pinned posts
CREATE INDEX IF NOT EXISTS idx_community_pinned ON community(is_pinned) WHERE is_pinned = true;

-- RLS Policy: Only admins can pin/unpin posts
CREATE POLICY "Only admins can pin posts"
  ON community FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
