import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Calendar, ArrowLeft, Plus, Clock, MapPin,
  ChevronLeft, ChevronRight, AlertTriangle, Wand2, Users, Pencil
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';

interface Tournament {
  id: string;
  name: string;
  sport: string;
  format: string;
  max_teams: number;
}

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string;
  team2_id: string;
  scheduled_at: string | null;
  venue: string | null;
  status: string;
  round: string | null;
  match_number: number | null;
  team1?: Team;
  team2?: Team;
  tournament?: Tournament;
}

interface TournamentTeam {
  id: string;
  team_id: string;
  tournament_id: string;
  team: Team;
}

const MatchSchedule = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const [newMatch, setNewMatch] = useState({
    team1_id: '',
    team2_id: '',
    scheduled_at: '',
    venue: '',
    round: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTournaments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentData();
    }
  }, [selectedTournament]);

  useEffect(() => {
    // Check for scheduling conflicts
    checkConflicts();
  }, [matches]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, sport, format, max_teams')
        .eq('organizer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);

      const tourneyId = searchParams.get('tournament');
      if (tourneyId) {
        setSelectedTournament(tourneyId);
      } else if (data && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('tournament_teams')
        .select(`
          id,
          team_id,
          tournament_id,
          team:teams(id, name)
        `)
        .eq('tournament_id', selectedTournament);

      if (teamsError) throw teamsError;
      setTournamentTeams(teamsData as TournamentTeam[] || []);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name)
        `)
        .eq('tournament_id', selectedTournament)
        .order('scheduled_at', { ascending: true });

      if (matchesError) throw matchesError;
      const fetchedMatches = matchesData as Match[] || [];
      setMatches(fetchedMatches);

      // Handle URL-based edit trigger
      const editId = searchParams.get('edit');
      if (editId) {
        const matchToEdit = fetchedMatches.find(m => m.id === editId);
        if (matchToEdit && matchToEdit.status === 'scheduled') {
          handleEditMatch(matchToEdit);
          // Clean up URL
          navigate('/schedule', { replace: true });
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const checkConflicts = () => {
    const conflictList: string[] = [];

    matches.forEach((match, i) => {
      if (!match.scheduled_at) return;

      matches.forEach((otherMatch, j) => {
        if (i >= j || !otherMatch.scheduled_at) return;

        // Check if same time
        if (match.scheduled_at === otherMatch.scheduled_at) {
          // Check if same venue
          if (match.venue && match.venue === otherMatch.venue) {
            conflictList.push(`Venue conflict: ${match.venue} at ${format(parseISO(match.scheduled_at), 'PPp')}`);
          }
          // Check if same team
          if (match.team1_id === otherMatch.team1_id ||
            match.team1_id === otherMatch.team2_id ||
            match.team2_id === otherMatch.team1_id ||
            match.team2_id === otherMatch.team2_id) {
            conflictList.push(`Team conflict: Same team scheduled at ${format(parseISO(match.scheduled_at), 'PPp')}`);
          }
        }
      });
    });

    setConflicts([...new Set(conflictList)]);
  };

  const createMatch = async () => {
    if (!selectedTournament || !newMatch.team1_id || !newMatch.team2_id) return;

    if (newMatch.team1_id === newMatch.team2_id) {
      toast({ variant: 'destructive', title: 'Error', description: 'A team cannot play against itself' });
      return;
    }

    try {
      if (editingMatchId) {
        // Update existing match
        const { data, error } = await supabase
          .from('matches')
          .update({
            team1_id: newMatch.team1_id,
            team2_id: newMatch.team2_id,
            scheduled_at: newMatch.scheduled_at || null,
            venue: newMatch.venue || null,
            round: newMatch.round || null,
          })
          .eq('id', editingMatchId)
          .select(`
            *,
            team1:teams!matches_team1_id_fkey(id, name),
            team2:teams!matches_team2_id_fkey(id, name)
          `)
          .single();

        if (error) throw error;

        setMatches(matches.map(m => m.id === editingMatchId ? (data as Match) : m));
        toast({ title: 'Match updated!', description: 'The schedule has been updated.' });
      } else {
        // Create new match
        const { data, error } = await supabase
          .from('matches')
          .insert({
            tournament_id: selectedTournament,
            team1_id: newMatch.team1_id,
            team2_id: newMatch.team2_id,
            scheduled_at: newMatch.scheduled_at || null,
            venue: newMatch.venue || null,
            round: newMatch.round || null,
            match_number: matches.length + 1,
            status: 'scheduled',
          })
          .select(`
            *,
            team1:teams!matches_team1_id_fkey(id, name),
            team2:teams!matches_team2_id_fkey(id, name)
          `)
          .single();

        if (error) throw error;

        setMatches([...matches, data as Match]);
        toast({ title: 'Match created!', description: 'The match has been scheduled.' });
      }

      setShowCreateMatch(false);
      setEditingMatchId(null);
      setNewMatch({ team1_id: '', team2_id: '', scheduled_at: '', venue: '', round: '' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setNewMatch({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      scheduled_at: match.scheduled_at ? match.scheduled_at.slice(0, 16) : '',
      venue: match.venue || '',
      round: match.round || '',
    });
    setShowCreateMatch(true);
  };

  const generateFixtures = async () => {
    if (tournamentTeams.length < 2) {
      toast({ variant: 'destructive', title: 'Error', description: 'Need at least 2 teams to generate fixtures' });
      return;
    }

    setGenerating(true);
    try {
      const tournament = tournaments.find(t => t.id === selectedTournament);
      const teams = tournamentTeams.map(tt => tt.team);
      const newMatches: any[] = [];

      if (tournament?.format === 'knockout') {
        // Generate knockout fixtures
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
          if (shuffledTeams[i + 1]) {
            newMatches.push({
              tournament_id: selectedTournament,
              team1_id: shuffledTeams[i].id,
              team2_id: shuffledTeams[i + 1].id,
              round: 'Round 1',
              match_number: Math.floor(i / 2) + 1,
              status: 'scheduled',
            });
          }
        }
      } else {
        // Generate round-robin fixtures
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            newMatches.push({
              tournament_id: selectedTournament,
              team1_id: teams[i].id,
              team2_id: teams[j].id,
              round: 'League Stage',
              match_number: newMatches.length + 1,
              status: 'scheduled',
            });
          }
        }
      }

      const { data, error } = await supabase
        .from('matches')
        .insert(newMatches)
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name)
        `);

      if (error) throw error;

      setMatches([...matches, ...(data as Match[])]);
      toast({ title: 'Fixtures generated!', description: `${newMatches.length} matches created automatically.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setGenerating(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
      setMatches(matches.filter(m => m.id !== matchId));
      toast({ title: 'Match deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMatchesForDay = (day: Date) => {
    return matches.filter(m =>
      m.scheduled_at && isSameDay(parseISO(m.scheduled_at), day)
    );
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Match Scheduling</h1>
            <p className="text-sm text-muted-foreground">Calendar view with conflict detection</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="w-48 bg-secondary/50">
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tournamentTeams.length >= 2 && (
              <Button variant="outline" onClick={generateFixtures} disabled={generating}>
                <Wand2 className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Auto Generate'}
              </Button>
            )}
            <Dialog open={showCreateMatch} onOpenChange={setShowCreateMatch}>
              <DialogTrigger asChild>
                <Button variant="hero" disabled={tournamentTeams.length < 2}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Match
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>{editingMatchId ? 'Edit Scheduled Match' : 'Schedule New Match'}</DialogTitle>
                  <DialogDescription>{editingMatchId ? 'Update match details' : 'Add a match to the tournament'}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Team 1</Label>
                      <Select value={newMatch.team1_id} onValueChange={(v) => setNewMatch({ ...newMatch, team1_id: v })}>
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {tournamentTeams.map(tt => (
                            <SelectItem key={tt.team_id} value={tt.team_id}>{tt.team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Team 2</Label>
                      <Select value={newMatch.team2_id} onValueChange={(v) => setNewMatch({ ...newMatch, team2_id: v })}>
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {tournamentTeams.filter(tt => tt.team_id !== newMatch.team1_id).map(tt => (
                            <SelectItem key={tt.team_id} value={tt.team_id}>{tt.team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={newMatch.scheduled_at}
                      onChange={(e) => setNewMatch({ ...newMatch, scheduled_at: e.target.value })}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Venue</Label>
                      <Input
                        placeholder="Stadium name"
                        value={newMatch.venue}
                        onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Round</Label>
                      <Input
                        placeholder="e.g., Semi-final"
                        value={newMatch.round}
                        onChange={(e) => setNewMatch({ ...newMatch, round: e.target.value })}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                  <Button variant="hero" className="w-full" onClick={createMatch}>
                    {editingMatchId ? 'Update Match' : 'Schedule Match'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Conflicts Warning */}
        {conflicts.length > 0 && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-400">Scheduling Conflicts Detected</p>
                  <ul className="text-sm text-yellow-400/80 mt-1 space-y-1">
                    {conflicts.map((conflict, i) => (
                      <li key={i}>• {conflict}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tournaments.length === 0 ? (
          <Card variant="gradient">
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No tournaments found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create a tournament first to schedule matches</p>
              <Button variant="hero" className="mt-6" onClick={() => navigate('/create-tournament')}>
                Create Tournament
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card variant="gradient">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      {format(currentMonth, 'MMMM yyyy')}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Days header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {days.map(day => {
                      const dayMatches = getMatchesForDay(day);
                      const hasMatches = dayMatches.length > 0;
                      const isToday = isSameDay(day, new Date());

                      return (
                        <motion.div
                          key={day.toISOString()}
                          className={`aspect-square p-1 rounded-lg border transition-colors cursor-pointer ${isToday
                            ? 'border-primary bg-primary/10'
                            : hasMatches
                              ? 'border-accent/50 bg-accent/10'
                              : 'border-border/50 hover:border-border'
                            }`}
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="h-full flex flex-col">
                            <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                              {format(day, 'd')}
                            </span>
                            {hasMatches && (
                              <div className="flex-1 flex items-end">
                                <span className="w-full text-[10px] text-center bg-accent/20 text-accent rounded px-1 truncate">
                                  {dayMatches.length} match{dayMatches.length > 1 ? 'es' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Match List */}
            <div>
              <Card variant="gradient" className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Scheduled Matches ({matches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tournamentTeams.length < 2 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground">Add teams to the tournament first</p>
                      <Button variant="ghost" className="mt-4" onClick={() => navigate('/teams')}>
                        Manage Teams
                      </Button>
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground">No matches scheduled</p>
                      <Button variant="ghost" className="mt-4" onClick={() => setShowCreateMatch(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add first match
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {matches.map((match, index) => (
                        <motion.div
                          key={match.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              {match.round || `Match ${match.match_number}`}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => handleEditMatch(match)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteMatch(match.id)}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                          <p className="font-medium text-sm">
                            {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
                          </p>
                          {match.scheduled_at && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(match.scheduled_at), 'PPp')}
                            </p>
                          )}
                          {match.venue && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {match.venue}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchSchedule;
