import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, TrendingUp, Target, Zap, Award,
  BarChart3, Activity, CircleDot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  stats: any;
  image_url: string | null;
  team: {
    id: string;
    name: string;
    sport: string;
  };
}

interface BallByBall {
  runs: number | null;
  extras: number | null;
  is_wicket: boolean | null;
  wicket_type: string | null;
  batsman_id: string | null;
  bowler_id: string | null;
  fielder_id: string | null;
  over_number: number;
  ball_number: number;
  match: {
    id: string;
    scheduled_at: string | null;
  };
}

interface CalculatedStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    highestScore: number;
    average: string;
    strikeRate: string;
    fifties: number;
    hundreds: number;
    fours: number;
    sixes: number;
  } | null;
  bowling: {
    matches: number;
    overs: number;
    wickets: number;
    runs: number;
    bestBowling: string;
    average: string;
    economy: string;
    strikeRate: string;
    fiveWickets: number;
  } | null;
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}

const PlayerAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CalculatedStats | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [runDistribution, setRunDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPlayers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerStats(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  const fetchPlayers = async () => {
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, sport')
        .eq('owner_id', user?.id);

      if (teamsError) throw teamsError;

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .in('team_id', teamIds);

        if (playersError) throw playersError;

        const playersWithTeams = (playersData || []).map(player => ({
          ...player,
          team: teams.find(t => t.id === player.team_id) || { id: '', name: 'Unknown', sport: 'cricket' }
        }));

        setPlayers(playersWithTeams);
        
        // Auto-select first player or from URL param
        const playerId = searchParams.get('player');
        if (playerId) {
          const player = playersWithTeams.find(p => p.id === playerId);
          if (player) setSelectedPlayer(player);
        } else if (playersWithTeams.length > 0) {
          setSelectedPlayer(playersWithTeams[0]);
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching players',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async (playerId: string) => {
    try {
      // Fetch all ball-by-ball data for this player
      const { data: ballData, error } = await supabase
        .from('ball_by_ball')
        .select(`
          runs,
          extras,
          is_wicket,
          wicket_type,
          batsman_id,
          bowler_id,
          fielder_id,
          over_number,
          ball_number,
          match:matches(id, scheduled_at)
        `)
        .or(`batsman_id.eq.${playerId},bowler_id.eq.${playerId},fielder_id.eq.${playerId}`);

      if (error) throw error;

      const balls = (ballData || []) as unknown as BallByBall[];
      
      // Calculate batting stats
      const battingBalls = balls.filter(b => b.batsman_id === playerId);
      const battingMatches = new Set(battingBalls.map(b => b.match?.id)).size;
      const battingRuns = battingBalls.reduce((sum, b) => sum + (b.runs || 0), 0);
      const ballsFaced = battingBalls.length;
      const fours = battingBalls.filter(b => b.runs === 4).length;
      const sixes = battingBalls.filter(b => b.runs === 6).length;
      
      // Calculate innings and scores per innings
      const inningScores: Record<string, number> = {};
      battingBalls.forEach(b => {
        const key = b.match?.id || 'unknown';
        inningScores[key] = (inningScores[key] || 0) + (b.runs || 0);
      });
      const scores = Object.values(inningScores);
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const fifties = scores.filter(s => s >= 50 && s < 100).length;
      const hundreds = scores.filter(s => s >= 100).length;
      const dismissals = battingBalls.filter(b => b.is_wicket).length;
      
      // Calculate bowling stats
      const bowlingBalls = balls.filter(b => b.bowler_id === playerId);
      const bowlingMatches = new Set(bowlingBalls.map(b => b.match?.id)).size;
      const bowlingRuns = bowlingBalls.reduce((sum, b) => sum + (b.runs || 0) + (b.extras || 0), 0);
      const bowlingOvers = Math.floor(bowlingBalls.length / 6);
      const wickets = bowlingBalls.filter(b => b.is_wicket && b.wicket_type !== 'run_out').length;
      
      // Best bowling figures per match
      const matchWickets: Record<string, { wickets: number; runs: number }> = {};
      bowlingBalls.forEach(b => {
        const key = b.match?.id || 'unknown';
        if (!matchWickets[key]) matchWickets[key] = { wickets: 0, runs: 0 };
        if (b.is_wicket && b.wicket_type !== 'run_out') matchWickets[key].wickets++;
        matchWickets[key].runs += (b.runs || 0) + (b.extras || 0);
      });
      const bestBowling = Object.values(matchWickets).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];
      const fiveWickets = Object.values(matchWickets).filter(m => m.wickets >= 5).length;
      
      // Calculate fielding stats
      const catches = balls.filter(b => b.fielder_id === playerId && (b.wicket_type === 'caught' || b.wicket_type === 'caught_behind')).length;
      const runOuts = balls.filter(b => b.fielder_id === playerId && b.wicket_type === 'run_out').length;
      const stumpings = balls.filter(b => b.fielder_id === playerId && b.wicket_type === 'stumped').length;

      const player = players.find(p => p.id === playerId);
      const isBatsman = player?.role === 'Batsman' || player?.role === 'All-Rounder' || player?.role === 'Wicket-Keeper';
      const isBowler = player?.role === 'Bowler' || player?.role === 'All-Rounder';

      setStats({
        batting: isBatsman || battingBalls.length > 0 ? {
          matches: battingMatches,
          innings: scores.length,
          runs: battingRuns,
          balls: ballsFaced,
          highestScore,
          average: dismissals > 0 ? (battingRuns / dismissals).toFixed(2) : battingRuns.toFixed(2),
          strikeRate: ballsFaced > 0 ? ((battingRuns / ballsFaced) * 100).toFixed(2) : '0.00',
          fifties,
          hundreds,
          fours,
          sixes,
        } : null,
        bowling: isBowler || bowlingBalls.length > 0 ? {
          matches: bowlingMatches,
          overs: bowlingOvers,
          wickets,
          runs: bowlingRuns,
          bestBowling: bestBowling ? `${bestBowling.wickets}/${bestBowling.runs}` : '-',
          average: wickets > 0 ? (bowlingRuns / wickets).toFixed(2) : '-',
          economy: bowlingOvers > 0 ? (bowlingRuns / bowlingOvers).toFixed(2) : '-',
          strikeRate: wickets > 0 ? (bowlingBalls.length / wickets).toFixed(2) : '-',
          fiveWickets,
        } : null,
        fielding: { catches, runOuts, stumpings },
      });

      // Generate trend data from actual match data
      const matchDates = [...new Set(battingBalls.map(b => b.match?.scheduled_at).filter(Boolean))];
      const trendByMonth: Record<string, { runs: number; wickets: number; count: number }> = {};
      
      matchDates.forEach(date => {
        if (!date) return;
        const month = new Date(date).toLocaleString('en-US', { month: 'short' });
        if (!trendByMonth[month]) trendByMonth[month] = { runs: 0, wickets: 0, count: 0 };
        
        battingBalls.filter(b => b.match?.scheduled_at === date).forEach(b => {
          trendByMonth[month].runs += b.runs || 0;
        });
        bowlingBalls.filter(b => b.match?.scheduled_at === date).forEach(b => {
          if (b.is_wicket && b.wicket_type !== 'run_out') trendByMonth[month].wickets++;
        });
        trendByMonth[month].count++;
      });

      const trend = Object.entries(trendByMonth).map(([month, data]) => ({
        month,
        runs: data.runs,
        average: data.count > 0 ? Math.round(data.runs / data.count) : 0,
        wickets: data.wickets,
      }));
      setTrendData(trend.length > 0 ? trend : [{ month: 'No Data', runs: 0, average: 0, wickets: 0 }]);

      // Generate run distribution
      const distribution = [
        { name: 'Dots', value: battingBalls.filter(b => b.runs === 0).length, color: 'hsl(var(--muted-foreground))' },
        { name: 'Singles', value: battingBalls.filter(b => b.runs === 1).length, color: 'hsl(var(--primary))' },
        { name: 'Doubles', value: battingBalls.filter(b => b.runs === 2).length, color: 'hsl(var(--accent))' },
        { name: 'Threes', value: battingBalls.filter(b => b.runs === 3).length, color: 'hsl(var(--energy))' },
        { name: 'Fours', value: fours, color: 'hsl(var(--success))' },
        { name: 'Sixes', value: sixes, color: 'hsl(var(--live))' },
      ];
      setRunDistribution(distribution);
    } catch (error: any) {
      console.error('Error fetching player stats:', error);
      setStats(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Player Analytics</h1>
            <p className="text-sm text-muted-foreground">Detailed performance statistics from real match data</p>
          </div>
          <div className="w-64">
            <Select 
              value={selectedPlayer?.id || ''} 
              onValueChange={(id) => setSelectedPlayer(players.find(p => p.id === id) || null)}
            >
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} ({player.team.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {players.length === 0 ? (
          <Card variant="gradient">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No players found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create a team and add players to see analytics</p>
              <Button variant="hero" className="mt-6" onClick={() => navigate('/teams')}>
                Go to Teams
              </Button>
            </CardContent>
          </Card>
        ) : selectedPlayer && stats ? (
          <>
            {/* Player Header */}
            <Card variant="glow" className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                    {selectedPlayer.image_url ? (
                      <img src={selectedPlayer.image_url} alt={selectedPlayer.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-display font-bold text-primary-foreground">
                        {selectedPlayer.jersey_number || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display font-bold">{selectedPlayer.name}</h2>
                    <p className="text-muted-foreground">
                      {selectedPlayer.role || 'Player'} • {selectedPlayer.team.name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPlayer.batting_style && (
                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                          {selectedPlayer.batting_style}
                        </span>
                      )}
                      {selectedPlayer.bowling_style && (
                        <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs">
                          {selectedPlayer.bowling_style}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            {stats.batting && (
              <>
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Batting Statistics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                  {[
                    { label: 'Matches', value: stats.batting.matches, icon: Activity },
                    { label: 'Runs', value: stats.batting.runs, icon: TrendingUp },
                    { label: 'Average', value: stats.batting.average, icon: BarChart3 },
                    { label: 'Strike Rate', value: stats.batting.strikeRate, icon: Zap },
                    { label: '50s/100s', value: `${stats.batting.fifties}/${stats.batting.hundreds}`, icon: Award },
                    { label: 'High Score', value: stats.batting.highestScore, icon: Target },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card variant="gradient" className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {stats.bowling && (
              <>
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-accent" />
                  Bowling Statistics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                  {[
                    { label: 'Wickets', value: stats.bowling.wickets, icon: Target },
                    { label: 'Overs', value: stats.bowling.overs, icon: Activity },
                    { label: 'Average', value: stats.bowling.average, icon: BarChart3 },
                    { label: 'Economy', value: stats.bowling.economy, icon: TrendingUp },
                    { label: 'Strike Rate', value: stats.bowling.strikeRate, icon: Zap },
                    { label: 'Best', value: stats.bowling.bestBowling, icon: Award },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card variant="gradient" className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className="w-4 h-4 text-accent" />
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Fielding Stats */}
            {(stats.fielding.catches > 0 || stats.fielding.runOuts > 0 || stats.fielding.stumpings > 0) && (
              <>
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-success" />
                  Fielding Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <Card variant="gradient" className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Catches</div>
                    <p className="text-2xl font-display font-bold">{stats.fielding.catches}</p>
                  </Card>
                  <Card variant="gradient" className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Run Outs</div>
                    <p className="text-2xl font-display font-bold">{stats.fielding.runOuts}</p>
                  </Card>
                  <Card variant="gradient" className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Stumpings</div>
                    <p className="text-2xl font-display font-bold">{stats.fielding.stumpings}</p>
                  </Card>
                </div>
              </>
            )}

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Performance Trend */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Performance Trend
                  </CardTitle>
                  <CardDescription>Monthly performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="runs" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary) / 0.2)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Run Distribution */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    Run Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of scoring patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={runDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {runDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card variant="gradient">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Select a player to view analytics</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlayerAnalytics;
