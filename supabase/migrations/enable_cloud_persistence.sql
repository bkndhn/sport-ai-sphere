-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)
-- To enable cloud-based match resumption, we need a column to store the match state.

-- 1. Add the live_state column
ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT NULL;

-- 2. Verify the column exists
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'live_state';

-- Note: Once you run this, matches will save their full state (batting/bowling scorecards, over history, etc.) 
-- to the cloud, allowing you to resume on any device.
