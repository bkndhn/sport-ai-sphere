-- Migration: Add live_state column to matches table
-- Purpose: Enable full match state persistence for seamless resume functionality
-- Run this in Supabase Dashboard -> SQL Editor

-- Add live_state column to store full match state as JSONB
ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN matches.live_state IS 'Stores full match state for resuming: striker, non-striker, bowler, scorecards, FOW, over history, etc.';

-- Optional: Create an index for faster lookups on live matches
CREATE INDEX IF NOT EXISTS idx_matches_live_state_not_null ON matches (id) WHERE live_state IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matches' AND column_name = 'live_state';
