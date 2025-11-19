-- Migration: Add follower_count to profiles
ALTER TABLE profiles ADD COLUMN follower_count integer DEFAULT 0;

-- Update follower_count for existing users
UPDATE profiles SET follower_count = (
  SELECT COUNT(*) FROM follows WHERE followed_id = profiles.id
);

-- Optionally, you can use a trigger to keep follower_count updated automatically
-- Example trigger (PostgreSQL):

-- Create function to increment follower_count
CREATE OR REPLACE FUNCTION increment_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.followed_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement follower_count
CREATE OR REPLACE FUNCTION decrement_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET follower_count = follower_count - 1 WHERE id = OLD.followed_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for insert
CREATE TRIGGER follows_insert_trigger
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION increment_follower_count();

-- Trigger for delete
CREATE TRIGGER follows_delete_trigger
AFTER DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION decrement_follower_count();
