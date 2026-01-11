import { useState, useEffect, useRef } from 'react';
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
  Trophy, Target, Dribbble, CircleDot, Volleyball, Swords, Gamepad2,
  Upload, ArrowRightLeft, Camera
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
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  image_url?: string | null;
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

// PlayerForm as a standalone component to prevent focus loss
interface PlayerFormProps {
  newPlayer: { name: string; jersey_number: string; role: string; batting_style: string; bowling_style: string };
  setNewPlayer: React.Dispatch<React.SetStateAction<{ name: string; jersey_number: string; role: string; batting_style: string; bowling_style: string }>>;
  playerImagePreview: string | null;
  selectedTeamSport: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  submitLabel: string;
  uploadingImage: boolean;
}

const PlayerForm = ({
  newPlayer,
  setNewPlayer,
  playerImagePreview,
  selectedTeamSport,
  fileInputRef,
  handleImageChange,
  onSubmit,
  submitLabel,
  uploadingImage
}: PlayerFormProps) => (
  <div className="space-y-4 pt-4">
    {/* Image Upload */}
    <div className="flex justify-center">
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {playerImagePreview ? (
            <img src={playerImagePreview} alt="Player" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label>Player Name *</Label>
      <Input
        placeholder="Enter player name"
        value={newPlayer.name}
        onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
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
          onChange={(e) => setNewPlayer(prev => ({ ...prev, jersey_number: e.target.value }))}
          className="bg-secondary/50"
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={newPlayer.role} onValueChange={(v) => setNewPlayer(prev => ({ ...prev, role: v }))}>
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
    {selectedTeamSport === 'cricket' && (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Batting Style</Label>
          <Select value={newPlayer.batting_style} onValueChange={(v) => setNewPlayer(prev => ({ ...prev, batting_style: v }))}>
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
          <Select value={newPlayer.bowling_style} onValueChange={(v) => setNewPlayer(prev => ({ ...prev, bowling_style: v }))}>
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
    <Button variant="hero" className="w-full" onClick={onSubmit} disabled={uploadingImage}>
      {uploadingImage ? 'Uploading...' : submitLabel}
    </Button>
  </div>
);

const Teams = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<{ id: string; name: string; sport: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [showTransferPlayer, setShowTransferPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [transferringPlayer, setTransferringPlayer] = useState<Player | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '', sport: 'cricket' });
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    jersey_number: '',
    role: '',
    batting_style: '',
    bowling_style: '',
  });
  const [playerImage, setPlayerImage] = useState<File | null>(null);
  const [playerImagePreview, setPlayerImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('');

  // Bulk player add
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkPlayers, setBulkPlayers] = useState<{ name: string; jersey_number: string; role: string }[]>([
    { name: '', jersey_number: '', role: '' }
  ]);
  const [addingBulkPlayers, setAddingBulkPlayers] = useState(false);

  // Confirmation dialogs
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<{ open: boolean; teamId: string | null }>({ open: false, teamId: null });
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<{ open: boolean; playerId: string | null }>({ open: false, playerId: null });

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

      // Also fetch all teams for transfer functionality
      const { data: allTeamsData } = await supabase
        .from('teams')
        .select('id, name, sport')
        .eq('owner_id', user?.id);
      setAllTeams(allTeamsData || []);
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
      setAllTeams([...allTeams, { id: data.id, name: data.name, sport: data.sport }]);
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

  const deleteTeam = async () => {
    if (!confirmDeleteTeam.teamId) return;
    const teamId = confirmDeleteTeam.teamId;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      setTeams(teams.filter(t => t.id !== teamId));
      setAllTeams(allTeams.filter(t => t.id !== teamId));
      setSelectedTeam(null);
      setConfirmDeleteTeam({ open: false, teamId: null });
      toast({ title: 'Team deleted', description: 'Team has been removed.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting team',
        description: error.message,
      });
    }
  };

  const uploadPlayerImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('player-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('player-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addPlayer = async () => {
    if (!selectedTeam || !newPlayer.name.trim()) return;

    // Check for duplicate name in the same team
    const playerNameLower = newPlayer.name.trim().toLowerCase();
    const existingPlayer = selectedTeam.players?.find(
      p => p.name.toLowerCase() === playerNameLower
    );
    if (existingPlayer) {
      toast({
        variant: 'destructive',
        title: 'Duplicate player name',
        description: `A player named "${existingPlayer.name}" already exists in this team.`,
      });
      return;
    }

    try {
      setUploadingImage(true);
      let imageUrl = null;

      if (playerImage) {
        imageUrl = await uploadPlayerImage(playerImage);
      }

      const { data, error } = await supabase
        .from('players')
        .insert({
          name: newPlayer.name,
          jersey_number: newPlayer.jersey_number ? parseInt(newPlayer.jersey_number) : null,
          role: newPlayer.role || null,
          batting_style: newPlayer.batting_style || null,
          bowling_style: newPlayer.bowling_style || null,
          team_id: selectedTeam.id,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to player_team_history
      await supabase.from('player_team_history').insert({
        player_id: data.id,
        team_id: selectedTeam.id,
      });

      setTeams(teams.map(t =>
        t.id === selectedTeam.id
          ? { ...t, players: [...(t.players || []), data] }
          : t
      ));
      setSelectedTeam(prev => prev ? { ...prev, players: [...(prev.players || []), data] } : null);
      setShowAddPlayer(false);
      resetPlayerForm();
      toast({ title: 'Player added!', description: `${data.name} has been added to the team.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding player',
        description: error.message,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const updatePlayer = async () => {
    if (!editingPlayer || !newPlayer.name.trim()) return;

    try {
      setUploadingImage(true);
      let imageUrl = editingPlayer.image_url;

      if (playerImage) {
        imageUrl = await uploadPlayerImage(playerImage);
      }

      const { data, error } = await supabase
        .from('players')
        .update({
          name: newPlayer.name,
          jersey_number: newPlayer.jersey_number ? parseInt(newPlayer.jersey_number) : null,
          role: newPlayer.role || null,
          batting_style: newPlayer.batting_style || null,
          bowling_style: newPlayer.bowling_style || null,
          image_url: imageUrl,
        })
        .eq('id', editingPlayer.id)
        .select()
        .single();

      if (error) throw error;

      setTeams(teams.map(t => ({
        ...t,
        players: t.players?.map(p => p.id === editingPlayer.id ? data : p)
      })));
      setSelectedTeam(prev => prev ? {
        ...prev,
        players: prev.players?.map(p => p.id === editingPlayer.id ? data : p)
      } : null);
      setShowEditPlayer(false);
      setEditingPlayer(null);
      resetPlayerForm();
      toast({ title: 'Player updated!', description: `${data.name} has been updated.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating player',
        description: error.message,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const deletePlayer = async () => {
    if (!confirmDeletePlayer.playerId) return;
    const playerId = confirmDeletePlayer.playerId;

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
      setConfirmDeletePlayer({ open: false, playerId: null });
      toast({ title: 'Player removed', description: 'Player has been removed from the team.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error removing player',
        description: error.message,
      });
    }
  };

  const transferPlayer = async () => {
    if (!transferringPlayer || !targetTeamId || !selectedTeam) return;
    if (targetTeamId === selectedTeam.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot transfer to the same team' });
      return;
    }

    try {
      // Update the player's team
      const { error: updateError } = await supabase
        .from('players')
        .update({ team_id: targetTeamId })
        .eq('id', transferringPlayer.id);

      if (updateError) throw updateError;

      // Mark old team history as ended
      await supabase
        .from('player_team_history')
        .update({ left_at: new Date().toISOString() })
        .eq('player_id', transferringPlayer.id)
        .eq('team_id', selectedTeam.id)
        .is('left_at', null);

      // Create new team history entry
      await supabase.from('player_team_history').insert({
        player_id: transferringPlayer.id,
        team_id: targetTeamId,
      });

      // Update local state
      const player = transferringPlayer;
      setTeams(teams.map(t => {
        if (t.id === selectedTeam.id) {
          return { ...t, players: t.players?.filter(p => p.id !== player.id) };
        }
        if (t.id === targetTeamId) {
          return { ...t, players: [...(t.players || []), player] };
        }
        return t;
      }));
      setSelectedTeam(prev => prev ? { ...prev, players: prev.players?.filter(p => p.id !== player.id) } : null);

      setShowTransferPlayer(false);
      setTransferringPlayer(null);
      setTargetTeamId('');

      const targetTeam = allTeams.find(t => t.id === targetTeamId);
      toast({ title: 'Player transferred!', description: `${player.name} has been transferred to ${targetTeam?.name || 'the new team'}.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error transferring player',
        description: error.message,
      });
    }
  };

  const resetPlayerForm = () => {
    setNewPlayer({ name: '', jersey_number: '', role: '', batting_style: '', bowling_style: '' });
    setPlayerImage(null);
    setPlayerImagePreview(null);
  };

  // Bulk player functions
  const addBulkPlayerRow = () => {
    setBulkPlayers([...bulkPlayers, { name: '', jersey_number: '', role: '' }]);
  };

  const removeBulkPlayerRow = (index: number) => {
    if (bulkPlayers.length > 1) {
      setBulkPlayers(bulkPlayers.filter((_, i) => i !== index));
    }
  };

  const updateBulkPlayer = (index: number, field: string, value: string) => {
    setBulkPlayers(bulkPlayers.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const resetBulkPlayerForm = () => {
    setBulkPlayers([{ name: '', jersey_number: '', role: '' }]);
  };

  const addBulkPlayers = async () => {
    if (!selectedTeam) return;

    const validPlayers = bulkPlayers.filter(p => p.name.trim());
    if (validPlayers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No players to add',
        description: 'Please enter at least one player name.',
      });
      return;
    }

    // Check for duplicates with existing team players
    const existingNames = new Set(
      (selectedTeam.players || []).map(p => p.name.toLowerCase())
    );
    const duplicates = validPlayers.filter(p => existingNames.has(p.name.trim().toLowerCase()));

    if (duplicates.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Duplicate player names',
        description: `These players already exist: ${duplicates.map(p => p.name).join(', ')}`,
      });
      return;
    }

    // Check for duplicates within the bulk list itself
    const bulkNames = validPlayers.map(p => p.name.trim().toLowerCase());
    const hasBulkDuplicates = bulkNames.length !== new Set(bulkNames).size;
    if (hasBulkDuplicates) {
      toast({
        variant: 'destructive',
        title: 'Duplicate names in list',
        description: 'You have entered the same name more than once.',
      });
      return;
    }

    try {
      setAddingBulkPlayers(true);

      // Insert all players
      const playersToInsert = validPlayers.map(p => ({
        name: p.name.trim(),
        jersey_number: p.jersey_number ? parseInt(p.jersey_number) : null,
        role: p.role || null,
        team_id: selectedTeam.id,
      }));

      const { data, error } = await supabase
        .from('players')
        .insert(playersToInsert)
        .select();

      if (error) throw error;

      // Add to player_team_history
      if (data) {
        await Promise.all(data.map(player =>
          supabase.from('player_team_history').insert({
            player_id: player.id,
            team_id: selectedTeam.id,
          })
        ));
      }

      // Update local state
      setTeams(teams.map(t =>
        t.id === selectedTeam.id
          ? { ...t, players: [...(t.players || []), ...(data || [])] }
          : t
      ));
      setSelectedTeam(prev => prev ? { ...prev, players: [...(prev.players || []), ...(data || [])] } : null);

      setShowBulkAdd(false);
      resetBulkPlayerForm();
      toast({
        title: `${data?.length || 0} players added!`,
        description: `Players have been added to ${selectedTeam.name}.`
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding players',
        description: error.message,
      });
    } finally {
      setAddingBulkPlayers(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPlayerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlayerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setNewPlayer({
      name: player.name,
      jersey_number: player.jersey_number?.toString() || '',
      role: player.role || '',
      batting_style: player.batting_style || '',
      bowling_style: player.bowling_style || '',
    });
    setPlayerImagePreview(player.image_url || null);
    setShowEditPlayer(true);
  };

  const openTransferPlayer = (player: Player) => {
    setTransferringPlayer(player);
    setShowTransferPlayer(true);
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
                          className={`w-full p-4 rounded-xl text-left transition-all ${selectedTeam?.id === team.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'bg-secondary/30 hover:bg-secondary/50'
                            }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTeam?.id === team.id ? 'bg-primary/20' : 'bg-secondary'
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
                      <Dialog open={showAddPlayer} onOpenChange={(open) => {
                        setShowAddPlayer(open);
                        if (!open) resetPlayerForm();
                      }}>
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
                          <PlayerForm
                            newPlayer={newPlayer}
                            setNewPlayer={setNewPlayer}
                            playerImagePreview={playerImagePreview}
                            selectedTeamSport={selectedTeam?.sport || 'cricket'}
                            fileInputRef={fileInputRef}
                            handleImageChange={handleImageChange}
                            onSubmit={addPlayer}
                            submitLabel="Add Player"
                            uploadingImage={uploadingImage}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkAdd(true)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Bulk Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeleteTeam({ open: true, teamId: selectedTeam.id })}
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
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${player.role === 'Captain' ? 'bg-yellow-500/20 ring-2 ring-yellow-500/50' : 'bg-primary/10'
                              }`}>
                              {player.image_url ? (
                                <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className={`font-display font-bold ${player.role === 'Captain' ? 'text-yellow-500' : 'text-primary'}`}>
                                  {player.jersey_number || '?'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {player.name}
                                {player.role === 'Captain' && (
                                  <span className="text-yellow-500 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20">
                                    👑 Captain
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {player.role && player.role !== 'Captain' ? player.role : 'Player'}
                                {player.batting_style && ` • ${player.batting_style}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditPlayer(player)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTransferPlayer(player)}
                              disabled={allTeams.length < 2}
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeletePlayer({ open: true, playerId: player.id })}
                            >
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

      {/* Edit Player Dialog */}
      <Dialog open={showEditPlayer} onOpenChange={(open) => {
        setShowEditPlayer(open);
        if (!open) {
          setEditingPlayer(null);
          resetPlayerForm();
        }
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>Update player details</DialogDescription>
          </DialogHeader>
          <PlayerForm
            newPlayer={newPlayer}
            setNewPlayer={setNewPlayer}
            playerImagePreview={playerImagePreview}
            selectedTeamSport={selectedTeam?.sport || 'cricket'}
            fileInputRef={fileInputRef}
            handleImageChange={handleImageChange}
            onSubmit={updatePlayer}
            submitLabel="Update Player"
            uploadingImage={uploadingImage}
          />
        </DialogContent>
      </Dialog>

      {/* Transfer Player Dialog */}
      <Dialog open={showTransferPlayer} onOpenChange={(open) => {
        setShowTransferPlayer(open);
        if (!open) {
          setTransferringPlayer(null);
          setTargetTeamId('');
        }
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Transfer Player</DialogTitle>
            <DialogDescription>
              Transfer {transferringPlayer?.name} to another team. Performance history will be preserved for each team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Transfer To</Label>
              <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select target team" />
                </SelectTrigger>
                <SelectContent>
                  {allTeams.filter(t => t.id !== selectedTeam?.id).map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="hero" className="w-full" onClick={transferPlayer} disabled={!targetTeamId}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Players Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={(open) => {
        setShowBulkAdd(open);
        if (!open) resetBulkPlayerForm();
      }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Multiple Players to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>Add multiple players at once. Fill in names and optionally jersey numbers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {bulkPlayers.map((player, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                <Input
                  placeholder="Player name *"
                  value={player.name}
                  onChange={(e) => updateBulkPlayer(idx, 'name', e.target.value)}
                  className="flex-1 h-9"
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={player.jersey_number}
                  onChange={(e) => updateBulkPlayer(idx, 'jersey_number', e.target.value)}
                  className="w-16 h-9"
                />
                <Select value={player.role} onValueChange={(v) => updateBulkPlayer(idx, 'role', v)}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {playerRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBulkPlayerRow(idx)}
                  disabled={bulkPlayers.length === 1}
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addBulkPlayerRow} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
            <Button
              variant="hero"
              onClick={addBulkPlayers}
              disabled={addingBulkPlayers || bulkPlayers.every(p => !p.name.trim())}
              className="flex-1"
            >
              {addingBulkPlayers ? 'Adding...' : `Add ${bulkPlayers.filter(p => p.name.trim()).length} Players`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmDeleteTeam.open}
        onOpenChange={(open) => setConfirmDeleteTeam({ ...confirmDeleteTeam, open })}
        title="Delete Team?"
        description="This will permanently delete the team and all its players. This action cannot be undone."
        confirmText="Delete Team"
        variant="destructive"
        onConfirm={deleteTeam}
      />

      <ConfirmDialog
        open={confirmDeletePlayer.open}
        onOpenChange={(open) => setConfirmDeletePlayer({ ...confirmDeletePlayer, open })}
        title="Remove Player?"
        description="This will permanently remove the player from the team. This action cannot be undone."
        confirmText="Remove Player"
        variant="destructive"
        onConfirm={deletePlayer}
      />
    </div>
  );
};

export default Teams;
