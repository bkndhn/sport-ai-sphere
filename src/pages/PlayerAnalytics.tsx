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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  stats: any;
  team: {
    id: string;
    name: string;
    sport: string;
  };
}

// Mock performance data (in real app, this would come from ball_by_ball analysis)
const generateMockStats = (role: string | null) => {
  const isBatsman = role === 'Batsman' || role === 'All-Rounder' || role === 'Wicket-Keeper';
  const isBowler = role === 'Bowler' || role === 'All-Rounder';
  
  return {
    batting: isBatsman ? {
      matches: Math.floor(Math.random() * 50) + 10,
      innings: Math.floor(Math.random() * 45) + 8,
      runs: Math.floor(Math.random() * 2000) + 200,
      highestScore: Math.floor(Math.random() * 150) + 50,
      average: (Math.random() * 40 + 15).toFixed(2),
      strikeRate: (Math.random() * 60 + 100).toFixed(2),
      fifties: Math.floor(Math.random() * 15),
      hundreds: Math.floor(Math.random() * 5),
      fours: Math.floor(Math.random() * 200) + 50,
      sixes: Math.floor(Math.random() * 80) + 10,
    } : null,
    bowling: isBowler ? {
      matches: Math.floor(Math.random() * 50) + 10,
      overs: Math.floor(Math.random() * 300) + 50,
      wickets: Math.floor(Math.random() * 100) + 10,
      runs: Math.floor(Math.random() * 1500) + 200,
      bestBowling: `${Math.floor(Math.random() * 6) + 2}/${Math.floor(Math.random() * 30) + 10}`,
      average: (Math.random() * 25 + 15).toFixed(2),
      economy: (Math.random() * 4 + 5).toFixed(2),
      strikeRate: (Math.random() * 20 + 15).toFixed(2),
      fiveWickets: Math.floor(Math.random() * 3),
    } : null,
  };
};

// Mock performance trends
const generateTrendData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(month => ({
    month,
    runs: Math.floor(Math.random() * 200) + 50,
    average: Math.floor(Math.random() * 40) + 20,
    wickets: Math.floor(Math.random() * 10) + 1,
  }));
};

const generateRunDistribution = () => [
  { name: 'Singles', value: Math.floor(Math.random() * 40) + 30, color: 'hsl(var(--primary))' },
  { name: 'Doubles', value: Math.floor(Math.random() * 20) + 10, color: 'hsl(var(--accent))' },
  { name: 'Threes', value: Math.floor(Math.random() * 10) + 2, color: 'hsl(var(--energy))' },
  { name: 'Fours', value: Math.floor(Math.random() * 20) + 15, color: 'hsl(var(--success))' },
  { name: 'Sixes', value: Math.floor(Math.random() * 10) + 5, color: 'hsl(var(--live))' },
];

const PlayerAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
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
      setStats(generateMockStats(selectedPlayer.role));
      setTrendData(generateTrendData());
      setRunDistribution(generateRunDistribution());
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
            <p className="text-sm text-muted-foreground">Detailed performance statistics and trends</p>
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
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-display font-bold text-primary-foreground">
                    {selectedPlayer.jersey_number || '?'}
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
