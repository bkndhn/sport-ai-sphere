import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, TrendingUp, Target, Award, Activity,
  BarChart3, User, Users, Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  stats: any;
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  sport: string;
}

interface MatchPerformance {
  matchId: string;
  date: string;
  opponent: string;
  teamName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs: string;
  runsConceded: number;
  catches: number;
}

const PlayerProfile = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [performances, setPerformances] = useState<MatchPerformance[]>([]);
  const [teamHistory, setTeamHistory] = useState<{ team: Team; performances: MatchPerformance[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchPlayerData();
    }
  }, [user, id]);

  const fetchPlayerData = async () => {
    try {
      // Fetch player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single();

      if (playerError) throw playerError;
      setPlayer(playerData);

      // Fetch current team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name, sport')
        .eq('id', playerData.team_id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch performances from ball_by_ball
      const { data: battingData } = await supabase
        .from('ball_by_ball')
        .select(`
          *,
          match:matches(
            id,
            scheduled_at,
            team1:teams!matches_team1_id_fkey(id, name),
            team2:teams!matches_team2_id_fkey(id, name)
          )
        `)
        .eq('batsman_id', id);

      const { data: bowlingData } = await supabase
        .from('ball_by_ball')
        .select(`
          *,
          match:matches(
            id,
            scheduled_at,
            team1:teams!matches_team1_id_fkey(id, name),
            team2:teams!matches_team2_id_fkey(id, name)
          )
        `)
        .eq('bowler_id', id);

      // Aggregate performances by match
      const matchPerformances = new Map<string, MatchPerformance>();

      (battingData || []).forEach(ball => {
        const matchId = ball.match_id;
        if (!matchPerformances.has(matchId)) {
          matchPerformances.set(matchId, {
            matchId,
            date: ball.match?.scheduled_at || '',
            opponent: '',
            teamName: teamData.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            wickets: 0,
            overs: '0.0',
            runsConceded: 0,
            catches: 0,
          });
        }
        const perf = matchPerformances.get(matchId)!;
        perf.runs += ball.runs || 0;
        perf.balls += 1;
        if (ball.runs === 4) perf.fours += 1;
        if (ball.runs === 6) perf.sixes += 1;
      });

      (bowlingData || []).forEach(ball => {
        const matchId = ball.match_id;
        if (!matchPerformances.has(matchId)) {
          matchPerformances.set(matchId, {
            matchId,
            date: ball.match?.scheduled_at || '',
            opponent: '',
            teamName: teamData.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            wickets: 0,
            overs: '0.0',
            runsConceded: 0,
            catches: 0,
          });
        }
        const perf = matchPerformances.get(matchId)!;
        perf.runsConceded += (ball.runs || 0) + (ball.extras || 0);
        if (ball.is_wicket) perf.wickets += 1;
      });

      setPerformances(Array.from(matchPerformances.values()));

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      navigate('/analytics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate career stats
  const careerStats = {
    batting: {
      matches: performances.length,
      runs: performances.reduce((acc, p) => acc + p.runs, 0),
      balls: performances.reduce((acc, p) => acc + p.balls, 0),
      fours: performances.reduce((acc, p) => acc + p.fours, 0),
      sixes: performances.reduce((acc, p) => acc + p.sixes, 0),
      average: performances.length > 0 
        ? (performances.reduce((acc, p) => acc + p.runs, 0) / performances.length).toFixed(2)
        : '0.00',
      strikeRate: performances.reduce((acc, p) => acc + p.balls, 0) > 0
        ? ((performances.reduce((acc, p) => acc + p.runs, 0) / performances.reduce((acc, p) => acc + p.balls, 0)) * 100).toFixed(2)
        : '0.00',
      highestScore: Math.max(...performances.map(p => p.runs), 0),
    },
    bowling: {
      wickets: performances.reduce((acc, p) => acc + p.wickets, 0),
      runsConceded: performances.reduce((acc, p) => acc + p.runsConceded, 0),
    }
  };

  // Recent form (last 5 matches)
  const recentForm = performances.slice(-5).map(p => ({
    match: p.opponent || 'Match',
    runs: p.runs,
    wickets: p.wickets,
  }));

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!player || !team) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Player not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Player Profile</h1>
            <p className="text-sm text-muted-foreground">Career statistics and performance history</p>
          </div>
        </div>

        {/* Player Header */}
        <Card variant="glow" className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-display font-bold text-primary-foreground">
                {player.jersey_number || <User className="w-10 h-10" />}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-display font-bold">{player.name}</h2>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4" />
                  {team.name}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {player.role && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                      {player.role}
                    </span>
                  )}
                  {player.batting_style && (
                    <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm">
                      {player.batting_style}
                    </span>
                  )}
                  {player.bowling_style && (
                    <span className="px-3 py-1 rounded-full bg-energy/10 text-energy text-sm">
                      {player.bowling_style}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="career" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="career">Career Stats</TabsTrigger>
            <TabsTrigger value="matches">Match History</TabsTrigger>
            <TabsTrigger value="form">Recent Form</TabsTrigger>
          </TabsList>

          {/* Career Stats Tab */}
          <TabsContent value="career">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Batting Stats */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Batting Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Matches', value: careerStats.batting.matches },
                      { label: 'Total Runs', value: careerStats.batting.runs },
                      { label: 'Average', value: careerStats.batting.average },
                      { label: 'Strike Rate', value: careerStats.batting.strikeRate },
                      { label: 'Highest Score', value: careerStats.batting.highestScore },
                      { label: 'Fours', value: careerStats.batting.fours },
                      { label: 'Sixes', value: careerStats.batting.sixes },
                      { label: 'Balls Faced', value: careerStats.batting.balls },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-xl font-display font-bold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bowling Stats */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-accent" />
                    Bowling Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Wickets', value: careerStats.bowling.wickets },
                      { label: 'Runs Conceded', value: careerStats.bowling.runsConceded },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-xl font-display font-bold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  {performances.length === 0 && (
                    <p className="text-center text-muted-foreground mt-4">
                      No match data available yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="matches">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Match History
                </CardTitle>
                <CardDescription>Performance in individual matches</CardDescription>
              </CardHeader>
              <CardContent>
                {performances.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No match history available</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Start scoring matches to track player performance
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {performances.map((perf, index) => (
                      <motion.div
                        key={perf.matchId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-secondary/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">
                            {perf.date ? new Date(perf.date).toLocaleDateString() : 'Unknown date'}
                          </p>
                          <p className="text-sm font-medium">{perf.teamName}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Runs</p>
                            <p className="text-lg font-bold">{perf.runs}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Balls</p>
                            <p className="text-lg font-bold">{perf.balls}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">4s/6s</p>
                            <p className="text-lg font-bold">{perf.fours}/{perf.sixes}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Wickets</p>
                            <p className="text-lg font-bold">{perf.wickets}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Form Tab */}
          <TabsContent value="form">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Form
                </CardTitle>
                <CardDescription>Performance trend over last 5 matches</CardDescription>
              </CardHeader>
              <CardContent>
                {recentForm.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No recent matches to display</p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recentForm}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="match" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="runs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlayerProfile;
