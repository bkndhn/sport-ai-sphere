import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, Plus, Calendar, Play, Eye, Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileNav from '@/components/MobileNav';

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string;
  team2_id: string;
  status: string;
  scheduled_at: string | null;
  venue: string | null;
  team1_score: any;
  team2_score: any;
  round: string | null;
  match_number: number | null;
  tournament?: { name: string };
  team1?: { name: string };
  team2?: { name: string };
}

const Matches = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournament');
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user, tournamentId]);

  const fetchMatches = async () => {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments(name),
          team1:teams!matches_team1_id_fkey(name),
          team2:teams!matches_team2_id_fkey(name)
        `)
        .order('scheduled_at', { ascending: true });

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter to only show matches from user's tournaments
      const userTournaments = await supabase
        .from('tournaments')
        .select('id')
        .eq('organizer_id', user?.id);
      
      const userTournamentIds = new Set(userTournaments.data?.map(t => t.id) || []);
      const userMatches = data?.filter(m => userTournamentIds.has(m.tournament_id)) || [];
      
      setMatches(userMatches);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching matches',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-live/20 text-live';
      case 'completed': return 'bg-success/20 text-success';
      case 'scheduled': return 'bg-primary/20 text-primary';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const formatScore = (score: any) => {
    if (!score) return '-';
    if (typeof score === 'object' && 'runs' in score) {
      return `${score.runs}/${score.wickets || 0}`;
    }
    return '-';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <DashboardSidebar onSignOut={handleSignOut} />
      <MobileNav onSignOut={handleSignOut} />

      <main className="lg:pl-64 pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">Matches</h1>
              <p className="text-muted-foreground mt-1">View and manage match fixtures</p>
            </div>
            <Button variant="hero" className="mt-4 sm:mt-0" onClick={() => navigate('/schedule')}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Match
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', 'scheduled', 'live', 'completed'].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className="capitalize"
              >
                {status === 'live' && <span className="w-2 h-2 bg-live rounded-full mr-2 animate-pulse" />}
                {status}
              </Button>
            ))}
          </div>

          {/* Matches List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="py-12 text-center">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No matches found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {filter !== 'all' ? 'Try changing the filter' : 'Schedule your first match to get started'}
                </p>
                <Button variant="hero" onClick={() => navigate('/schedule')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Match
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="gradient" className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Match Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(match.status)}`}>
                              {match.status === 'live' && <span className="inline-block w-1.5 h-1.5 bg-live rounded-full mr-1 animate-pulse" />}
                              {match.status}
                            </span>
                            {match.round && (
                              <span className="text-xs text-muted-foreground">
                                {match.round}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              • {match.tournament?.name}
                            </span>
                          </div>
                          
                          {/* Teams */}
                          <div className="flex items-center gap-4">
                            <div className="flex-1 text-center lg:text-right">
                              <p className="font-semibold">{match.team1?.name || 'TBD'}</p>
                              <p className="text-2xl font-display font-bold text-primary">
                                {formatScore(match.team1_score)}
                              </p>
                            </div>
                            <div className="text-muted-foreground text-sm font-medium">VS</div>
                            <div className="flex-1 text-center lg:text-left">
                              <p className="font-semibold">{match.team2?.name || 'TBD'}</p>
                              <p className="text-2xl font-display font-bold text-primary">
                                {formatScore(match.team2_score)}
                              </p>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            {match.scheduled_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(match.scheduled_at).toLocaleDateString()} at {new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {match.venue && <span>📍 {match.venue}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {match.status === 'scheduled' && (
                            <Button 
                              variant="hero" 
                              size="sm"
                              onClick={() => navigate(`/live-scoring/${match.id}`)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Scoring
                            </Button>
                          )}
                          {match.status === 'live' && (
                            <Button 
                              variant="hero" 
                              size="sm"
                              onClick={() => navigate(`/live-scoring/${match.id}`)}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Continue
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/spectator/${match.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Matches;
