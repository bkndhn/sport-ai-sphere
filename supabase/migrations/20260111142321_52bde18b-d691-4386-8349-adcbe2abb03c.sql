-- Add live_state column to matches table for storing real-time match state
ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT NULL;