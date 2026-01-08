import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, Plus, Calendar, Users, Activity, Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileNav from '@/components/MobileNav';

interface Tournament {
  id: string;
  name: string;
  sport: string;
  status: string;
  format: string;
  start_date: string | null;
  max_teams: number;
}

interface Match {
  id: string;
  status: string;
  team1?: { name: string };
  team2?: { name: string };
  tournament?: { name: string };
}

interface Team {
  id: string;
  name: string;
  sport: string;
  players?: any[];
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch tournaments
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setTournaments(tournamentsData || []);

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*, players(*)')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setTeams(teamsData || []);

      // Fetch matches from user's tournaments
      if (tournamentsData && tournamentsData.length > 0) {
        const tournamentIds = tournamentsData.map(t => t.id);
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            *,
            tournament:tournaments(name),
            team1:teams!matches_team1_id_fkey(name),
            team2:teams!matches_team2_id_fkey(name)
          `)
          .in('tournament_id', tournamentIds)
          .order('scheduled_at', { ascending: true })
          .limit(5);

        setMatches(matchesData || []);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching data',
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Tournaments', value: tournaments.length, icon: Trophy, color: 'text-primary', path: '/tournaments' },
    { label: 'Teams', value: teams.length, icon: Users, color: 'text-accent', path: '/teams' },
    { label: 'Live Matches', value: matches.filter(m => m.status === 'live').length, icon: Activity, color: 'text-live', path: '/matches' },
    { label: 'Total Players', value: teams.reduce((acc, t) => acc + (t.players?.length || 0), 0), icon: Target, color: 'text-energy', path: '/analytics' },
  ];

  const liveMatches = matches.filter(m => m.status === 'live');

  return (
    <div className="min-h-screen bg-gradient-dark">
      <DashboardSidebar onSignOut={handleSignOut} />
      <MobileNav onSignOut={handleSignOut} />

      <main className="lg:pl-64 pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">
                Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-1">Manage your tournaments and track live matches</p>
            </div>
            <Button variant="hero" className="mt-4 sm:mt-0" onClick={() => navigate('/create-tournament')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(stat.path)}
                className="cursor-pointer"
              >
                <Card variant="gradient" className="p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Live Matches Alert */}
          {liveMatches.length > 0 && (
            <Card variant="glow" className="mb-8 border-live/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-live">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-live"></span>
                  </span>
                  Live Now
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {liveMatches.map((match) => (
                    <div 
                      key={match.id}
                      onClick={() => navigate(`/live-scoring/${match.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-medium">{match.team1?.name} vs {match.team2?.name}</p>
                        <p className="text-sm text-muted-foreground">{match.tournament?.name}</p>
                      </div>
                      <Button variant="hero" size="sm">
                        Continue Scoring
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Tournaments */}
            <Card variant="gradient">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Recent Tournaments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tournaments')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : tournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No tournaments yet</p>
                    <Button variant="hero" size="sm" onClick={() => navigate('/create-tournament')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Create First
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        onClick={() => navigate(`/tournament/${tournament.id}`)}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-medium">{tournament.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {tournament.sport} • {tournament.format}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tournament.status === 'active' 
                            ? 'bg-accent/20 text-accent' 
                            : tournament.status === 'registration'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {tournament.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Teams */}
            <Card variant="gradient">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Your Teams
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/teams')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No teams yet</p>
                    <Button variant="hero" size="sm" onClick={() => navigate('/teams')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Create First
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        onClick={() => navigate('/teams')}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {team.sport} • {team.players?.length || 0} players
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/create-tournament')}
              >
                <Trophy className="w-6 h-6 text-primary" />
                <span>New Tournament</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/teams')}
              >
                <Users className="w-6 h-6 text-accent" />
                <span>Manage Teams</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/live-scoring')}
              >
                <Activity className="w-6 h-6 text-live" />
                <span>Quick Scoring</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/schedule')}
              >
                <Calendar className="w-6 h-6 text-energy" />
                <span>Schedule Match</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
