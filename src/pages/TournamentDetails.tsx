import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, ArrowLeft, Plus, Users, Calendar, Play, Award, 
  TrendingUp, Target, BarChart3, GitBranch, Trash2, Settings,
  ChevronRight, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Tournament {
  id: string;
  name: string;
  sport: string;
  status: string;
  format: string;
  start_date: string | null;
  end_date: string | null;
  max_teams: number;
  venue: string | null;
  description: string | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface TournamentTeam {
  id: string;
  team_id: string;
  tournament_id: string;
  seed: number | null;
  group_name: string | null;
  team: Team;
}

interface Match {
  id: string;
  status: string;
  scheduled_at: string | null;
  venue: string | null;
  round: string | null;
  match_number: number | null;
  team1_score: any;
  team2_score: any;
  winner_id: string | null;
  result_summary: string | null;
  team1: Team;
  team2: Team;
}

interface PlayerPerformance {
  playerId: string;
  playerName: string;
  teamName: string;
  runs: number;
  wickets: number;
  catches: number;
  matches: number;
}

const TournamentDetails = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerPerformance[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchTournamentData();
    }
  }, [user, id]);

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch tournament teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('tournament_teams')
        .select(`
          *,
          team:teams(id, name, logo_url)
        `)
        .eq('tournament_id', id);

      if (teamsError) throw teamsError;
      setTournamentTeams(teamsData as TournamentTeam[] || []);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, logo_url)
        `)
        .eq('tournament_id', id)
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData as Match[] || []);

      // Fetch available teams to add
      const { data: userTeams } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .eq('owner_id', user?.id);

      const addedTeamIds = new Set((teamsData || []).map(tt => tt.team_id));
      setAvailableTeams((userTeams || []).filter(t => !addedTeamIds.has(t.id)));

      // Calculate leaderboard from completed matches
      calculateLeaderboard(matchesData as Match[] || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaderboard = (matchesData: Match[]) => {
    // In real app, this would aggregate from ball_by_ball data
    // For now, showing placeholder
    const performances: PlayerPerformance[] = [];
    setLeaderboard(performances);
  };

  const addTeamToTournament = async () => {
    if (!selectedTeamId || !id) return;

    try {
      const { error } = await supabase
        .from('tournament_teams')
        .insert({
          tournament_id: id,
          team_id: selectedTeamId,
          seed: tournamentTeams.length + 1,
        });

      if (error) throw error;

      toast({ title: 'Team added to tournament' });
      fetchTournamentData();
      setShowAddTeam(false);
      setSelectedTeamId('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const removeTeamFromTournament = async () => {
    if (!teamToRemove) return;

    try {
      const { error } = await supabase
        .from('tournament_teams')
        .delete()
        .eq('id', teamToRemove);

      if (error) throw error;

      toast({ title: 'Team removed from tournament' });
      fetchTournamentData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setTeamToRemove(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent/20 text-accent';
      case 'registration': return 'bg-warning/20 text-warning';
      case 'completed': return 'bg-success/20 text-success';
      case 'live': return 'bg-live/20 text-live';
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

  const completedMatches = matches.filter(m => m.status === 'completed');
  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'scheduled');

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Tournament not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/tournaments')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">{tournament.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                {tournament.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {tournament.sport} • {tournament.format} • {tournament.max_teams} teams max
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/schedule')}>
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="teams">Teams ({tournamentTeams.length})</TabsTrigger>
            <TabsTrigger value="matches">Matches ({matches.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Stats */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Teams', value: tournamentTeams.length, icon: Users },
                    { label: 'Matches', value: matches.length, icon: Calendar },
                    { label: 'Completed', value: completedMatches.length, icon: Trophy },
                    { label: 'Live', value: liveMatches.length, icon: Play },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
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

                {/* Live Matches */}
                {liveMatches.length > 0 && (
                  <Card variant="glow" className="border-live/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-live">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-live"></span>
                        </span>
                        Live Now
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {liveMatches.map(match => (
                        <div
                          key={match.id}
                          onClick={() => navigate(`/live-scoring/${match.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-medium">{match.team1.name}</p>
                              <p className="text-xl font-display font-bold text-primary">
                                {formatScore(match.team1_score)}
                              </p>
                            </div>
                            <span className="text-muted-foreground">vs</span>
                            <div className="text-left">
                              <p className="font-medium">{match.team2.name}</p>
                              <p className="text-xl font-display font-bold text-primary">
                                {formatScore(match.team2_score)}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recent Completed Matches */}
                {completedMatches.length > 0 && (
                  <Card variant="gradient">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        Completed Matches
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {completedMatches.slice(0, 5).map(match => (
                        <div
                          key={match.id}
                          onClick={() => navigate(`/spectator/${match.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${match.winner_id === match.team1.id ? 'text-accent' : ''}`}>
                                {match.team1.name}
                                {match.winner_id === match.team1.id && <Star className="w-3 h-3 inline ml-1 text-accent" />}
                              </p>
                              <span className="text-muted-foreground">vs</span>
                              <p className={`font-medium ${match.winner_id === match.team2.id ? 'text-accent' : ''}`}>
                                {match.team2.name}
                                {match.winner_id === match.team2.id && <Star className="w-3 h-3 inline ml-1 text-accent" />}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatScore(match.team1_score)} - {formatScore(match.team2_score)}
                            </p>
                            {match.result_summary && (
                              <p className="text-xs text-accent mt-1">{match.result_summary}</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tournament Info */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle>Tournament Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tournament.venue && (
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-medium">📍 {tournament.venue}</p>
                    </div>
                  )}
                  {tournament.start_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{new Date(tournament.start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {tournament.end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{new Date(tournament.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Format</p>
                    <p className="font-medium capitalize">{tournament.format.replace('_', ' ')}</p>
                  </div>
                  {tournament.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{tournament.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bracket Tab */}
          <TabsContent value="bracket">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-primary" />
                  Tournament Bracket
                </CardTitle>
                <CardDescription>
                  {tournament.format === 'knockout' 
                    ? 'Knockout tournament progression'
                    : 'League standings and match results'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <GitBranch className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No matches scheduled yet</p>
                    <Button variant="hero" className="mt-4" onClick={() => navigate('/schedule')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Matches
                    </Button>
                  </div>
                ) : tournament.format === 'knockout' ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px] py-8">
                      {/* Group matches by round */}
                      {(() => {
                        const rounds = [...new Set(matches.map(m => m.round || 'Round 1'))];
                        return (
                          <div className="flex justify-around items-center gap-4">
                            {rounds.map((round, roundIndex) => {
                              const roundMatches = matches.filter(m => (m.round || 'Round 1') === round);
                              return (
                                <div key={round} className="flex flex-col gap-4">
                                  <h3 className="text-sm font-medium text-center text-muted-foreground mb-2">
                                    {round}
                                  </h3>
                                  {roundMatches.map(match => (
                                    <motion.div
                                      key={match.id}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className={`w-48 border rounded-lg p-3 ${
                                        match.status === 'completed' 
                                          ? 'border-accent/30 bg-accent/5'
                                          : match.status === 'live'
                                          ? 'border-live/50 bg-live/5'
                                          : 'border-border bg-card/50'
                                      }`}
                                      onClick={() => match.status === 'live' 
                                        ? navigate(`/live-scoring/${match.id}`)
                                        : navigate(`/spectator/${match.id}`)
                                      }
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div className={`flex justify-between items-center py-1 ${
                                        match.winner_id === match.team1.id ? 'text-accent font-semibold' : ''
                                      }`}>
                                        <span className="text-sm truncate">{match.team1.name}</span>
                                        <span className="text-sm">{formatScore(match.team1_score)}</span>
                                      </div>
                                      <div className={`flex justify-between items-center py-1 ${
                                        match.winner_id === match.team2.id ? 'text-accent font-semibold' : ''
                                      }`}>
                                        <span className="text-sm truncate">{match.team2.name}</span>
                                        <span className="text-sm">{formatScore(match.team2_score)}</span>
                                      </div>
                                      {match.status === 'live' && (
                                        <div className="flex items-center gap-1 mt-2 text-live text-xs">
                                          <span className="w-1.5 h-1.5 bg-live rounded-full animate-pulse" />
                                          LIVE
                                        </div>
                                      )}
                                    </motion.div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  // League standings
                  <div className="space-y-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-muted-foreground border-b border-border">
                          <th className="pb-3">#</th>
                          <th className="pb-3">Team</th>
                          <th className="pb-3 text-center">P</th>
                          <th className="pb-3 text-center">W</th>
                          <th className="pb-3 text-center">L</th>
                          <th className="pb-3 text-center">NRR</th>
                          <th className="pb-3 text-center">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentTeams.map((tt, index) => {
                          const teamMatches = matches.filter(
                            m => m.status === 'completed' && 
                            (m.team1.id === tt.team_id || m.team2.id === tt.team_id)
                          );
                          const wins = teamMatches.filter(m => m.winner_id === tt.team_id).length;
                          const losses = teamMatches.length - wins;

                          return (
                            <tr key={tt.id} className="border-b border-border/50">
                              <td className="py-3">{index + 1}</td>
                              <td className="py-3 font-medium">{tt.team.name}</td>
                              <td className="py-3 text-center">{teamMatches.length}</td>
                              <td className="py-3 text-center text-accent">{wins}</td>
                              <td className="py-3 text-center text-destructive">{losses}</td>
                              <td className="py-3 text-center">-</td>
                              <td className="py-3 text-center font-bold">{wins * 2}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card variant="gradient">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Participating Teams
                </CardTitle>
                <Button variant="hero" size="sm" onClick={() => setShowAddTeam(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team
                </Button>
              </CardHeader>
              <CardContent>
                {tournamentTeams.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No teams added yet</p>
                    <Button variant="hero" className="mt-4" onClick={() => setShowAddTeam(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Team
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournamentTeams.map((tt, index) => (
                      <motion.div
                        key={tt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-secondary/30 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary">
                            {tt.seed || index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{tt.team.name}</p>
                            {tt.group_name && (
                              <p className="text-xs text-muted-foreground">Group {tt.group_name}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => {
                            setTeamToRemove(tt.id);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card variant="gradient">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  All Matches
                </CardTitle>
                <Button variant="hero" size="sm" onClick={() => navigate('/schedule')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Match
                </Button>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No matches scheduled</p>
                    <Button variant="hero" className="mt-4" onClick={() => navigate('/schedule')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Matches
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match, index) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => match.status === 'live' 
                          ? navigate(`/live-scoring/${match.id}`)
                          : match.status === 'scheduled'
                          ? navigate(`/live-scoring/${match.id}`)
                          : navigate(`/spectator/${match.id}`)
                        }
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground w-20">
                            Match {match.match_number || index + 1}
                            {match.round && <p className="text-xs">{match.round}</p>}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`text-right ${match.winner_id === match.team1.id ? 'text-accent font-semibold' : ''}`}>
                              <p>{match.team1.name}</p>
                              <p className="text-lg font-display font-bold">{formatScore(match.team1_score)}</p>
                            </div>
                            <span className="text-muted-foreground">vs</span>
                            <div className={`text-left ${match.winner_id === match.team2.id ? 'text-accent font-semibold' : ''}`}>
                              <p>{match.team2.name}</p>
                              <p className="text-lg font-display font-bold">{formatScore(match.team2_score)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(match.status)}`}>
                            {match.status === 'live' && <span className="w-1.5 h-1.5 bg-live rounded-full inline-block mr-1 animate-pulse" />}
                            {match.status}
                          </span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Scorers */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Top Scorers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completedMatches.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Complete some matches to see statistics
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            i === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            i === 2 ? 'bg-gray-400/20 text-gray-400' :
                            i === 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {i}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">No data yet</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Wicket Takers */}
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    Top Wicket Takers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completedMatches.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Complete some matches to see statistics
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            i === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            i === 2 ? 'bg-gray-400/20 text-gray-400' :
                            i === 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {i}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">No data yet</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Team Dialog */}
      <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Team to Tournament</DialogTitle>
            <DialogDescription>Select a team to participate in this tournament</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {availableTeams.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No teams available. Create teams first or all your teams are already added.
              </p>
            )}
            <Button 
              variant="hero" 
              className="w-full" 
              onClick={addTeamToTournament}
              disabled={!selectedTeamId}
            >
              Add Team
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remove Team"
        description="Are you sure you want to remove this team from the tournament? This action cannot be undone."
        confirmText="Remove"
        variant="destructive"
        onConfirm={removeTeamFromTournament}
      />
    </div>
  );
};

export default TournamentDetails;
