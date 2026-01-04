-- Create enum types for the platform
CREATE TYPE sport_type AS ENUM ('cricket', 'football', 'basketball', 'volleyball', 'badminton', 'tennis', 'kabaddi', 'hockey', 'athletics', 'esports', 'custom');
CREATE TYPE tournament_format AS ENUM ('knockout', 'league', 'round_robin', 'swiss', 'group_knockout', 'custom');
CREATE TYPE tournament_status AS ENUM ('draft', 'registration', 'active', 'completed', 'cancelled');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed', 'abandoned', 'postponed');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  sport sport_type NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  role TEXT,
  batting_style TEXT,
  bowling_style TEXT,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sport sport_type NOT NULL,
  format tournament_format NOT NULL DEFAULT 'knockout',
  status tournament_status NOT NULL DEFAULT 'draft',
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  venue TEXT,
  max_teams INTEGER DEFAULT 16,
  prize_pool TEXT,
  rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament teams (many-to-many relationship)
CREATE TABLE public.tournament_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  seed INTEGER,
  group_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team1_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team2_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status match_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  round TEXT,
  match_number INTEGER,
  team1_score JSONB DEFAULT '{}',
  team2_score JSONB DEFAULT '{}',
  toss_winner_id UUID REFERENCES public.teams(id),
  toss_decision TEXT,
  winner_id UUID REFERENCES public.teams(id),
  result_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ball-by-ball scoring for cricket
CREATE TABLE public.ball_by_ball (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batsman_id UUID REFERENCES public.players(id),
  bowler_id UUID REFERENCES public.players(id),
  runs INTEGER DEFAULT 0,
  extras INTEGER DEFAULT 0,
  extra_type TEXT,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type TEXT,
  dismissed_player_id UUID REFERENCES public.players(id),
  fielder_id UUID REFERENCES public.players(id),
  commentary TEXT,
  ai_commentary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_by_ball ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Teams policies
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Team owners can update" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Team owners can delete" ON public.teams FOR DELETE USING (auth.uid() = owner_id);

-- Players policies
CREATE POLICY "Players are viewable by everyone" ON public.players FOR SELECT USING (true);
CREATE POLICY "Team owners can manage players" ON public.players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
CREATE POLICY "Team owners can update players" ON public.players FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
CREATE POLICY "Team owners can delete players" ON public.players FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- Tournaments policies
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = organizer_id);

-- Tournament teams policies
CREATE POLICY "Tournament teams are viewable by everyone" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Organizers can manage tournament teams" ON public.tournament_teams FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);
CREATE POLICY "Organizers can update tournament teams" ON public.tournament_teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);
CREATE POLICY "Organizers can delete tournament teams" ON public.tournament_teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);

-- Matches policies
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Organizers can manage matches" ON public.matches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);
CREATE POLICY "Organizers can update matches" ON public.matches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);
CREATE POLICY "Organizers can delete matches" ON public.matches FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);

-- Ball by ball policies
CREATE POLICY "Ball by ball is viewable by everyone" ON public.ball_by_ball FOR SELECT USING (true);
CREATE POLICY "Match organizers can add ball by ball" ON public.ball_by_ball FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches m 
    JOIN public.tournaments t ON m.tournament_id = t.id 
    WHERE m.id = match_id AND t.organizer_id = auth.uid()
  )
);

-- Enable realtime for live scoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_by_ball;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();