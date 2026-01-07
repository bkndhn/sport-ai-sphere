import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, ArrowLeft, Mic, RefreshCw, Share2, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Match {
  id: string;
  status: string;
  team1_id: string;
  team2_id: string;
  team1_score: any;
  team2_score: any;
  venue: string | null;
  round: string | null;
  team1?: { id: string; name: string };
  team2?: { id: string; name: string };
  tournament?: { id: string; name: string; sport: string };
}

interface BallData {
  id: string;
  over_number: number;
  ball_number: number;
  runs: number;
  extras: number;
  extra_type: string | null;
  is_wicket: boolean;
  ai_commentary: string | null;
}

const SpectatorView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [recentBalls, setRecentBalls] = useState<BallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchLiveMatches();
  }, []);

  useEffect(() => {
    const matchId = searchParams.get('match');
    if (matchId && matches.length > 0) {
      const match = matches.find(m => m.id === matchId);
      if (match) setSelectedMatch(match);
    } else if (matches.length > 0 && !selectedMatch) {
      setSelectedMatch(matches[0]);
    }
  }, [matches, searchParams]);

  useEffect(() => {
    if (!selectedMatch) return;

    // Subscribe to real-time updates for the selected match
    const matchChannel = supabase
      .channel(`match-${selectedMatch.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${selectedMatch.id}`,
        },
        (payload) => {
          console.log('Match update:', payload);
          setSelectedMatch(prev => prev ? { ...prev, ...payload.new } as Match : null);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to ball-by-ball updates
    const ballChannel = supabase
      .channel(`balls-${selectedMatch.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ball_by_ball',
          filter: `match_id=eq.${selectedMatch.id}`,
        },
        (payload) => {
          console.log('New ball:', payload);
          setRecentBalls(prev => [payload.new as BallData, ...prev.slice(0, 11)]);
        }
      )
      .subscribe();

    // Fetch recent balls
    fetchRecentBalls(selectedMatch.id);

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(ballChannel);
    };
  }, [selectedMatch?.id]);

  const fetchLiveMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name),
          tournament:tournaments(id, name, sport)
        `)
        .in('status', ['live', 'scheduled'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setMatches(data as Match[] || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBalls = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from('ball_by_ball')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setRecentBalls(data || []);
    } catch (error: any) {
      console.error('Error fetching balls:', error);
    }
  };

  const shareMatch = async () => {
    if (!selectedMatch) return;
    
    const url = `${window.location.origin}/spectator?match=${selectedMatch.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedMatch.team1?.name} vs ${selectedMatch.team2?.name} - Live Score`,
          text: 'Watch the live score!',
          url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!', description: 'Share this link with others' });
    }
  };

  const parseScore = (score: any) => {
    if (!score) return { runs: 0, wickets: 0, overs: 0, balls: 0 };
    if (typeof score === 'string') {
      try {
        return JSON.parse(score);
      } catch {
        return { runs: 0, wickets: 0, overs: 0, balls: 0 };
      }
    }
    return score;
  };

  const formatOvers = (overs: number, balls: number) => `${overs}.${balls}`;

  const getBallColor = (ball: BallData) => {
    if (ball.is_wicket) return 'bg-live text-live-foreground';
    if (ball.extra_type === 'wide') return 'bg-yellow-500/20 text-yellow-400';
    if (ball.extra_type === 'no_ball') return 'bg-orange-500/20 text-orange-400';
    if (ball.runs === 6) return 'bg-energy text-energy-foreground';
    if (ball.runs === 4) return 'bg-accent text-accent-foreground';
    if (ball.runs === 0) return 'bg-secondary text-secondary-foreground';
    return 'bg-primary/20 text-primary';
  };

  const getBallLabel = (ball: BallData) => {
    if (ball.is_wicket) return 'W';
    if (ball.extra_type === 'wide') return 'Wd';
    if (ball.extra_type === 'no_ball') return 'Nb';
    return ball.runs.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Live Scores</h1>
            <p className="text-sm text-muted-foreground">Real-time match updates</p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                LIVE
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={fetchLiveMatches}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Match Selector */}
        {matches.length > 1 && (
          <div className="mb-6">
            <Select 
              value={selectedMatch?.id || ''} 
              onValueChange={(id) => setSelectedMatch(matches.find(m => m.id === id) || null)}
            >
              <SelectTrigger className="w-full bg-secondary/50">
                <SelectValue placeholder="Select a match" />
              </SelectTrigger>
              <SelectContent>
                {matches.map(match => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.team1?.name} vs {match.team2?.name} 
                    {match.status === 'live' && ' (LIVE)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {matches.length === 0 ? (
          <Card variant="gradient">
            <CardContent className="py-12 text-center">
              <Activity className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No live matches</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Check back later for live updates</p>
            </CardContent>
          </Card>
        ) : selectedMatch ? (
          <>
            {/* Main Scoreboard */}
            <Card variant="glow" className="mb-6">
              <CardContent className="p-6">
                {/* Tournament info */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{selectedMatch.tournament?.name}</p>
                    {selectedMatch.round && (
                      <p className="text-xs text-muted-foreground">{selectedMatch.round}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={shareMatch}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
                    <p className="text-sm text-muted-foreground mb-1">{selectedMatch.team1?.name}</p>
                    <p className="text-4xl font-display font-bold">
                      {parseScore(selectedMatch.team1_score).runs}
                      <span className="text-muted-foreground">/{parseScore(selectedMatch.team1_score).wickets}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatOvers(parseScore(selectedMatch.team1_score).overs, parseScore(selectedMatch.team1_score).balls)} overs
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-secondary/30">
                    <p className="text-sm text-muted-foreground mb-1">{selectedMatch.team2?.name}</p>
                    <p className="text-4xl font-display font-bold">
                      {parseScore(selectedMatch.team2_score).runs}
                      <span className="text-muted-foreground">/{parseScore(selectedMatch.team2_score).wickets}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatOvers(parseScore(selectedMatch.team2_score).overs, parseScore(selectedMatch.team2_score).balls)} overs
                    </p>
                  </div>
                </div>

                {/* Recent Balls */}
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">Recent Deliveries</p>
                  <div className="flex gap-2 flex-wrap">
                    {recentBalls.slice(0, 12).map((ball, index) => (
                      <motion.div
                        key={ball.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={`min-w-10 h-10 px-2 rounded-full flex items-center justify-center font-bold text-sm ${getBallColor(ball)}`}
                      >
                        {getBallLabel(ball)}
                      </motion.div>
                    ))}
                    {recentBalls.length === 0 && (
                      <p className="text-muted-foreground text-sm">Waiting for ball updates...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Commentary */}
            {recentBalls.length > 0 && recentBalls[0].ai_commentary && (
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-primary" />
                    AI Commentary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBalls.filter(b => b.ai_commentary).slice(0, 5).map((ball, index) => (
                      <motion.div
                        key={ball.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-xl ${index === 0 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          Over {ball.over_number}.{ball.ball_number}
                        </p>
                        <p className="text-sm">{ball.ai_commentary}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SpectatorView;
