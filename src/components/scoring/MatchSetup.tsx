import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, ChevronRight, ChevronLeft, Trophy, Target, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  players: Player[];
}

interface Player {
  id: string;
  name: string;
  jersey_number?: number | null;
  role?: string | null;
}

interface MatchConfig {
  team1: Team;
  team2: Team;
  team1PlayingXI: Player[];
  team2PlayingXI: Player[];
  totalOvers: number;
  maxOversPerBowler: number | null;
  tossWinner: 'team1' | 'team2';
  tossDecision: 'bat' | 'bowl';
  battingTeam: Team;
  bowlingTeam: Team;
  openingBatsman1: Player | null;
  openingBatsman2: Player | null;
  openingBowler: Player | null;
  wicketKeeper: Player | null;
  matchId?: string; // Database match ID for persistence
}

interface MatchSetupProps {
  onComplete: (config: MatchConfig, matchId?: string) => void;
  onCancel: () => void;
}

const MatchSetup = ({ onComplete, onCancel }: MatchSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1: Team Selection
  const [selectedTeam1Id, setSelectedTeam1Id] = useState<string>('');
  const [selectedTeam2Id, setSelectedTeam2Id] = useState<string>('');

  // Step 2: Playing XI
  const [team1PlayingXI, setTeam1PlayingXI] = useState<string[]>([]);
  const [team2PlayingXI, setTeam2PlayingXI] = useState<string[]>([]);

  // Step 3: Match Config
  const [totalOvers, setTotalOvers] = useState(20);
  const [maxOversPerBowler, setMaxOversPerBowler] = useState<number | null>(4);

  // Step 4: Toss
  const [tossWinner, setTossWinner] = useState<'team1' | 'team2'>('team1');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  // Step 5: Opening Players
  const [openingBatsman1Id, setOpeningBatsman1Id] = useState<string>('');
  const [openingBatsman2Id, setOpeningBatsman2Id] = useState<string>('');
  const [openingBowlerId, setOpeningBowlerId] = useState<string>('');
  const [wicketKeeperId, setWicketKeeperId] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`*, players(*)`)
        .eq('owner_id', user?.id)
        .eq('sport', 'cricket');

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

  const team1 = teams.find(t => t.id === selectedTeam1Id);
  const team2 = teams.find(t => t.id === selectedTeam2Id);

  const battingTeam = tossDecision === 'bat'
    ? (tossWinner === 'team1' ? team1 : team2)
    : (tossWinner === 'team1' ? team2 : team1);

  const bowlingTeam = tossDecision === 'bat'
    ? (tossWinner === 'team1' ? team2 : team1)
    : (tossWinner === 'team1' ? team1 : team2);

  const battingPlayingXI = battingTeam?.id === team1?.id ? team1PlayingXI : team2PlayingXI;
  const bowlingPlayingXI = bowlingTeam?.id === team1?.id ? team1PlayingXI : team2PlayingXI;

  const togglePlayer = (teamNum: 1 | 2, playerId: string) => {
    const setFn = teamNum === 1 ? setTeam1PlayingXI : setTeam2PlayingXI;
    const current = teamNum === 1 ? team1PlayingXI : team2PlayingXI;

    if (current.includes(playerId)) {
      setFn(current.filter(id => id !== playerId));
    } else if (current.length < 11) {
      setFn([...current, playerId]);
    } else {
      toast({ title: 'Maximum 11 players allowed' });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedTeam1Id && selectedTeam2Id && selectedTeam1Id !== selectedTeam2Id;
      case 2:
        return team1PlayingXI.length >= 2 && team2PlayingXI.length >= 2;
      case 3:
        return totalOvers > 0;
      case 4:
        return true;
      case 5:
        return openingBatsman1Id && openingBatsman2Id && openingBowlerId &&
          openingBatsman1Id !== openingBatsman2Id;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    if (!team1 || !team2 || !battingTeam || !bowlingTeam || !user) return;

    try {
      // First, find or create a tournament to associate the match with
      // For now, use a "Quick Match" tournament approach - find existing or create new
      let tournamentId: string | null = null;

      const { data: existingTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('organizer_id', user.id)
        .eq('name', 'Quick Matches')
        .limit(1);

      if (existingTournaments && existingTournaments.length > 0) {
        tournamentId = existingTournaments[0].id;
      } else {
        // Create a "Quick Matches" tournament for casual games
        const { data: newTournament, error: tournamentError } = await supabase
          .from('tournaments')
          .insert({
            name: 'Quick Matches',
            organizer_id: user.id,
            sport: 'cricket',
            format: 'custom',
            status: 'active',
          })
          .select('id')
          .single();

        if (tournamentError) throw tournamentError;
        tournamentId = newTournament?.id || null;
      }

      if (!tournamentId) {
        throw new Error('Could not create tournament for match');
      }

      // Create the match in database
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          team1_id: team1.id,
          team2_id: team2.id,
          status: 'live',
          toss_winner_id: tossWinner === 'team1' ? team1.id : team2.id,
          toss_decision: tossDecision,
          team1_score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
          team2_score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
        })
        .select('id')
        .single();

      if (matchError) throw matchError;

      const matchId = matchData?.id;

      const config: MatchConfig = {
        team1,
        team2,
        team1PlayingXI: team1.players.filter(p => team1PlayingXI.includes(p.id)),
        team2PlayingXI: team2.players.filter(p => team2PlayingXI.includes(p.id)),
        totalOvers,
        maxOversPerBowler,
        tossWinner,
        tossDecision,
        battingTeam,
        bowlingTeam,
        openingBatsman1: battingTeam.players.find(p => p.id === openingBatsman1Id) || null,
        openingBatsman2: battingTeam.players.find(p => p.id === openingBatsman2Id) || null,
        openingBowler: bowlingTeam.players.find(p => p.id === openingBowlerId) || null,
        wicketKeeper: bowlingTeam.players.find(p => p.id === wicketKeeperId) || null,
        matchId,
      };

      toast({
        title: 'Match Created!',
        description: 'All scoring data will be saved automatically.',
      });

      onComplete(config, matchId);
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating match',
        description: error.message || 'Match data will not be saved to database.',
      });

      // Still allow the match to proceed without database
      const config: MatchConfig = {
        team1,
        team2,
        team1PlayingXI: team1.players.filter(p => team1PlayingXI.includes(p.id)),
        team2PlayingXI: team2.players.filter(p => team2PlayingXI.includes(p.id)),
        totalOvers,
        maxOversPerBowler,
        tossWinner,
        tossDecision,
        battingTeam,
        bowlingTeam,
        openingBatsman1: battingTeam.players.find(p => p.id === openingBatsman1Id) || null,
        openingBatsman2: battingTeam.players.find(p => p.id === openingBatsman2Id) || null,
        openingBowler: bowlingTeam.players.find(p => p.id === openingBowlerId) || null,
        wicketKeeper: bowlingTeam.players.find(p => p.id === wicketKeeperId) || null,
      };

      onComplete(config);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card variant="gradient" className="max-w-2xl mx-auto mx-2 sm:mx-auto">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Match Setup
          </CardTitle>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-secondary'
                  }`}
              />
            ))}
          </div>
        </div>
        <CardDescription>
          Step {step} of 5: {
            step === 1 ? 'Select Teams' :
              step === 2 ? 'Choose Playing XI' :
                step === 3 ? 'Match Configuration' :
                  step === 4 ? 'Toss' :
                    'Opening Players'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Team Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {teams.length < 2 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">You need at least 2 cricket teams to start a match</p>
                <Button variant="hero" onClick={onCancel}>
                  Create Teams First
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Team A</Label>
                  <Select value={selectedTeam1Id} onValueChange={setSelectedTeam1Id}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select Team A" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.filter(t => t.id !== selectedTeam2Id).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.players?.length || 0} players)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team B</Label>
                  <Select value={selectedTeam2Id} onValueChange={setSelectedTeam2Id}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select Team B" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.filter(t => t.id !== selectedTeam1Id).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.players?.length || 0} players)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 2: Playing XI */}
        {step === 2 && team1 && team2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              {/* Team 1 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    {team1.name}
                    <span className="text-sm text-muted-foreground">({team1PlayingXI.length}/11)</span>
                  </h4>
                  {team1.players.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (team1PlayingXI.length === team1.players.length) {
                          setTeam1PlayingXI([]);
                        } else {
                          setTeam1PlayingXI(team1.players.slice(0, 11).map(p => p.id));
                        }
                      }}
                    >
                      {team1PlayingXI.length === team1.players.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {team1.players.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => togglePlayer(1, player.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${team1PlayingXI.includes(player.id)
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                        }`}
                    >
                      <Checkbox checked={team1PlayingXI.includes(player.id)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          {player.name}
                          {player.role === 'Captain' && (
                            <span className="text-yellow-500 text-[10px] font-bold">👑</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {player.jersey_number ? `#${player.jersey_number}` : ''} {player.role || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {team1.players.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No players added</p>
                  )}
                </div>
              </div>

              {/* Team 2 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    {team2.name}
                    <span className="text-sm text-muted-foreground">({team2PlayingXI.length}/11)</span>
                  </h4>
                  {team2.players.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (team2PlayingXI.length === team2.players.length) {
                          setTeam2PlayingXI([]);
                        } else {
                          setTeam2PlayingXI(team2.players.slice(0, 11).map(p => p.id));
                        }
                      }}
                    >
                      {team2PlayingXI.length === team2.players.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {team2.players.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => togglePlayer(2, player.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${team2PlayingXI.includes(player.id)
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                        }`}
                    >
                      <Checkbox checked={team2PlayingXI.includes(player.id)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          {player.name}
                          {player.role === 'Captain' && (
                            <span className="text-yellow-500 text-[10px] font-bold">👑</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {player.jersey_number ? `#${player.jersey_number}` : ''} {player.role || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {team2.players.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No players added</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Match Config */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Overs per Innings</Label>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20, 50].map((overs) => (
                  <Button
                    key={overs}
                    variant={totalOvers === overs ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTotalOvers(overs);
                      setMaxOversPerBowler(Math.ceil(overs / 5));
                    }}
                  >
                    {overs}
                  </Button>
                ))}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalOvers(Math.max(1, totalOvers - 1))}
                    className="h-9 w-9 p-0"
                  >
                    -
                  </Button>
                  <div className="w-12 h-9 flex items-center justify-center bg-secondary/50 rounded border border-border font-medium">
                    {totalOvers}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalOvers(Math.min(99, totalOvers + 1))}
                    className="h-9 w-9 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Overs per Bowler (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={maxOversPerBowler || ''}
                  onChange={(e) => setMaxOversPerBowler(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No limit"
                  className="w-32 bg-secondary/50"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">overs</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Toss */}
        {step === 4 && team1 && team2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <Label>Toss Won By</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={tossWinner === 'team1' ? 'default' : 'outline'}
                  className="h-auto py-4"
                  onClick={() => setTossWinner('team1')}
                >
                  {team1.name}
                </Button>
                <Button
                  variant={tossWinner === 'team2' ? 'default' : 'outline'}
                  className="h-auto py-4"
                  onClick={() => setTossWinner('team2')}
                >
                  {team2.name}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Elected to</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={tossDecision === 'bat' ? 'default' : 'outline'}
                  className="h-auto py-4"
                  onClick={() => setTossDecision('bat')}
                >
                  🏏 Bat First
                </Button>
                <Button
                  variant={tossDecision === 'bowl' ? 'default' : 'outline'}
                  className="h-auto py-4"
                  onClick={() => setTossDecision('bowl')}
                >
                  🎯 Bowl First
                </Button>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm">
                <strong>{battingTeam?.name}</strong> will bat first
              </p>
              <p className="text-sm">
                <strong>{bowlingTeam?.name}</strong> will bowl first
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 5: Opening Players */}
        {step === 5 && battingTeam && bowlingTeam && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
              <p className="text-sm font-medium">First Innings: {battingTeam.name} batting</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Batsman (Striker)</Label>
                <Select value={openingBatsman1Id} onValueChange={setOpeningBatsman1Id}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Select striker" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingTeam.players
                      .filter(p => battingPlayingXI.includes(p.id))
                      .filter(p => p.id !== openingBatsman2Id)
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Opening Batsman (Non-Striker)</Label>
                <Select value={openingBatsman2Id} onValueChange={setOpeningBatsman2Id}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Select non-striker" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingTeam.players
                      .filter(p => battingPlayingXI.includes(p.id))
                      .filter(p => p.id !== openingBatsman1Id)
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Bowler</Label>
                <Select value={openingBowlerId} onValueChange={setOpeningBowlerId}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Select bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingTeam.players
                      .filter(p => bowlingPlayingXI.includes(p.id))
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Wicket Keeper</Label>
                <Select value={wicketKeeperId} onValueChange={setWicketKeeperId}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Select keeper" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingTeam.players
                      .filter(p => bowlingPlayingXI.includes(p.id))
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            variant="hero"
            onClick={() => step === 5 ? handleComplete() : setStep(step + 1)}
            disabled={!canProceed()}
          >
            {step === 5 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Start Match
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchSetup;
