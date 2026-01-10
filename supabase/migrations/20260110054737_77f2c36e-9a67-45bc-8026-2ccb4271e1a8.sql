-- Create storage bucket for player images
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-images', 'player-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their player images
CREATE POLICY "Authenticated users can upload player images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-images' AND auth.role() = 'authenticated');

-- Create policy to allow public read access
CREATE POLICY "Player images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-images');

-- Create policy to allow users to update their player images
CREATE POLICY "Authenticated users can update player images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-images' AND auth.role() = 'authenticated');

-- Create policy to allow users to delete their player images
CREATE POLICY "Authenticated users can delete player images"
ON storage.objects FOR DELETE
USING (bucket_id = 'player-images' AND auth.role() = 'authenticated');

-- Add image_url column to players table if not exists
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create match_summaries table to store completed match summaries
CREATE TABLE IF NOT EXISTS public.match_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings1_batting JSONB DEFAULT '[]'::jsonb,
  innings1_bowling JSONB DEFAULT '[]'::jsonb,
  innings2_batting JSONB DEFAULT '[]'::jsonb,
  innings2_bowling JSONB DEFAULT '[]'::jsonb,
  innings1_fow JSONB DEFAULT '[]'::jsonb,
  innings2_fow JSONB DEFAULT '[]'::jsonb,
  innings1_score JSONB DEFAULT '{}'::jsonb,
  innings2_score JSONB DEFAULT '{}'::jsonb,
  best_batter_id UUID REFERENCES public.players(id),
  best_bowler_id UUID REFERENCES public.players(id),
  best_fielder_id UUID REFERENCES public.players(id),
  player_of_match_id UUID REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id)
);

-- Enable RLS on match_summaries
ALTER TABLE public.match_summaries ENABLE ROW LEVEL SECURITY;

-- Match summaries are viewable by everyone
CREATE POLICY "Match summaries are viewable by everyone"
ON public.match_summaries FOR SELECT
USING (true);

-- Organizers can manage match summaries
CREATE POLICY "Organizers can manage match summaries"
ON public.match_summaries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.id = match_summaries.match_id AND t.organizer_id = auth.uid()
  )
);

CREATE POLICY "Organizers can update match summaries"
ON public.match_summaries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.id = match_summaries.match_id AND t.organizer_id = auth.uid()
  )
);

-- Create player_team_history for tracking player transfers
CREATE TABLE IF NOT EXISTS public.player_team_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on player_team_history
ALTER TABLE public.player_team_history ENABLE ROW LEVEL SECURITY;

-- Player history is viewable by everyone
CREATE POLICY "Player team history is viewable by everyone"
ON public.player_team_history FOR SELECT
USING (true);

-- Team owners can manage player history
CREATE POLICY "Team owners can manage player history"
ON public.player_team_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_history.team_id AND teams.owner_id = auth.uid()
  )
);

CREATE POLICY "Team owners can update player history"
ON public.player_team_history FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = player_team_history.team_id AND teams.owner_id = auth.uid()
  )
);