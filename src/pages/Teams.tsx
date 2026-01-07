import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, Plus, ArrowLeft, Trash2, Edit2, UserPlus,
  Trophy, Target, Dribbble, CircleDot, Volleyball, Swords, Gamepad2
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

interface Team {
  id: string;
  name: string;
  sport: string;
  logo_url: string | null;
  created_at: string;
  players?: Player[];
}

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
}

const sportIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cricket: Target,
  football: Dribbble,
  basketball: CircleDot,
  volleyball: Volleyball,
  badminton: Swords,
  esports: Gamepad2,
};

const sports = [
  { id: 'cricket', name: 'Cricket' },
  { id: 'football', name: 'Football' },
  { id: 'basketball', name: 'Basketball' },
  { id: 'volleyball', name: 'Volleyball' },
  { id: 'badminton', name: 'Badminton' },
  { id: 'esports', name: 'Esports' },
];

const playerRoles = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper', 'Captain'];
const battingStyles = ['Right-handed', 'Left-handed'];
const bowlingStyles = ['Right-arm Fast', 'Right-arm Medium', 'Right-arm Spin', 'Left-arm Fast', 'Left-arm Medium', 'Left-arm Spin'];

const Teams = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', sport: 'cricket' });
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    jersey_number: '',
    role: '',
    batting_style: '',
    bowling_style: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          players (*)
        `)
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching teams',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!user || !newTeam.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name,
          sport: newTeam.sport as any,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTeams([{ ...data, players: [] }, ...teams]);
      setShowCreateTeam(false);
      setNewTeam({ name: '', sport: 'cricket' });
      toast({ title: 'Team created!', description: `${data.name} has been created.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating team',
        description: error.message,
      });
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      setTeams(teams.filter(t => t.id !== teamId));
      setSelectedTeam(null);
      toast({ title: 'Team deleted', description: 'Team has been removed.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting team',
        description: error.message,
      });
    }
  };

  const addPlayer = async () => {
    if (!selectedTeam || !newPlayer.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('players')
        .insert({
          name: newPlayer.name,
          jersey_number: newPlayer.jersey_number ? parseInt(newPlayer.jersey_number) : null,
          role: newPlayer.role || null,
          batting_style: newPlayer.batting_style || null,
          bowling_style: newPlayer.bowling_style || null,
          team_id: selectedTeam.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTeams(teams.map(t => 
        t.id === selectedTeam.id 
          ? { ...t, players: [...(t.players || []), data] }
          : t
      ));
      setSelectedTeam(prev => prev ? { ...prev, players: [...(prev.players || []), data] } : null);
      setShowAddPlayer(false);
      setNewPlayer({ name: '', jersey_number: '', role: '', batting_style: '', bowling_style: '' });
      toast({ title: 'Player added!', description: `${data.name} has been added to the team.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding player',
        description: error.message,
      });
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      setTeams(teams.map(t => ({
        ...t,
        players: t.players?.filter(p => p.id !== playerId)
      })));
      setSelectedTeam(prev => prev ? { ...prev, players: prev.players?.filter(p => p.id !== playerId) } : null);
      toast({ title: 'Player removed', description: 'Player has been removed from the team.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error removing player',
        description: error.message,
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Team Management</h1>
            <p className="text-sm text-muted-foreground">Create and manage your teams and players</p>
          </div>
          <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>Add a new team to your roster</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input
                    placeholder="Enter team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Select value={newTeam.sport} onValueChange={(v) => setNewTeam({ ...newTeam, sport: v })}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sports.map(sport => (
                        <SelectItem key={sport.id} value={sport.id}>{sport.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="hero" className="w-full" onClick={createTeam}>
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="lg:col-span-1">
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Your Teams ({teams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">No teams yet</p>
                    <Button variant="ghost" className="mt-4" onClick={() => setShowCreateTeam(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create your first team
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team) => {
                      const SportIcon = sportIcons[team.sport] || Trophy;
                      return (
                        <motion.button
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className={`w-full p-4 rounded-xl text-left transition-all ${
                            selectedTeam?.id === team.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-secondary/30 hover:bg-secondary/50'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedTeam?.id === team.id ? 'bg-primary/20' : 'bg-secondary'
                            }`}>
                              <SportIcon className={`w-5 h-5 ${selectedTeam?.id === team.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{team.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {team.sport} • {team.players?.length || 0} players
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <Card variant="gradient">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedTeam.name}</CardTitle>
                      <CardDescription className="capitalize">{selectedTeam.sport}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
                        <DialogTrigger asChild>
                          <Button variant="hero" size="sm">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Player
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle>Add Player to {selectedTeam.name}</DialogTitle>
                            <DialogDescription>Enter player details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Player Name *</Label>
                              <Input
                                placeholder="Enter player name"
                                value={newPlayer.name}
                                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                className="bg-secondary/50"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Jersey Number</Label>
                                <Input
                                  type="number"
                                  placeholder="99"
                                  value={newPlayer.jersey_number}
                                  onChange={(e) => setNewPlayer({ ...newPlayer, jersey_number: e.target.value })}
                                  className="bg-secondary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={newPlayer.role} onValueChange={(v) => setNewPlayer({ ...newPlayer, role: v })}>
                                  <SelectTrigger className="bg-secondary/50">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {playerRoles.map(role => (
                                      <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {selectedTeam.sport === 'cricket' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Batting Style</Label>
                                  <Select value={newPlayer.batting_style} onValueChange={(v) => setNewPlayer({ ...newPlayer, batting_style: v })}>
                                    <SelectTrigger className="bg-secondary/50">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {battingStyles.map(style => (
                                        <SelectItem key={style} value={style}>{style}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Bowling Style</Label>
                                  <Select value={newPlayer.bowling_style} onValueChange={(v) => setNewPlayer({ ...newPlayer, bowling_style: v })}>
                                    <SelectTrigger className="bg-secondary/50">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {bowlingStyles.map(style => (
                                        <SelectItem key={style} value={style}>{style}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            <Button variant="hero" className="w-full" onClick={addPlayer}>
                              Add Player
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteTeam(selectedTeam.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTeam.players && selectedTeam.players.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTeam.players.map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary">
                              {player.jersey_number || '?'}
                            </div>
                            <div>
                              <p className="font-medium">{player.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {player.role || 'Player'}
                                {player.batting_style && ` • ${player.batting_style}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deletePlayer(player.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">No players in this team yet</p>
                      <Button variant="ghost" onClick={() => setShowAddPlayer(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add your first player
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card variant="gradient" className="h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Select a team to view details</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Or create a new team to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;
