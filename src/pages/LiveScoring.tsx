import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity, ArrowLeft, RotateCcw, Target, Mic, RefreshCw, AlertTriangle,
  Users, ChevronDown, ChevronUp, Share2, FileDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MatchSetup from '@/components/scoring/MatchSetup';
import DismissalDialog, { DismissalDetails } from '@/components/scoring/DismissalDialog';
import MatchSummary from '@/components/scoring/MatchSummary';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Player {
  id: string;
  name: string;
  jersey_number?: number | null;
  role?: string | null;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
}

interface BatterStats {
  player: Player;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
}

interface BowlerStats {
  player: Player;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
}

interface ScoreState {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
}

interface BallData {
  runs: number;
  isWicket: boolean;
  extras: number;
  extraType?: string;
  isLegal: boolean;
  batter: Player;
  bowler: Player;
  dismissal?: DismissalDetails;
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

interface FallOfWicket {
  runs: number;
  wickets: number;
  batter: string;
  over: string;
}

interface OverHistory {
  overNumber: number;
  bowler: Player;
  runs: number;
  wickets: number;
  balls: BallData[];
  commentary: string[];
}

interface CommentaryEntry {
  over: number;
  ball: number;
  text: string;
  type: 'run' | 'boundary' | 'wicket' | 'extra' | 'dot';
  timestamp: Date;
}

const LiveScoring = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { matchId: urlMatchId } = useParams<{ matchId: string }>();
  const [loadingMatch, setLoadingMatch] = useState(false);

  // Match state
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null); // Database match ID for persistence
  const [showSetup, setShowSetup] = useState(true);

  // Innings state
  const [currentInnings, setCurrentInnings] = useState(1);
  const [innings1Score, setInnings1Score] = useState<ScoreState>({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [innings2Score, setInnings2Score] = useState<ScoreState>({ runs: 0, wickets: 0, overs: 0, balls: 0 });

  // Player tracking
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [currentBowler, setCurrentBowler] = useState<Player | null>(null);

  // Scorecards
  const [innings1Batting, setInnings1Batting] = useState<BatterStats[]>([]);
  const [innings1Bowling, setInnings1Bowling] = useState<BowlerStats[]>([]);
  const [innings2Batting, setInnings2Batting] = useState<BatterStats[]>([]);
  const [innings2Bowling, setInnings2Bowling] = useState<BowlerStats[]>([]);

  // Fall of wickets
  const [innings1FOW, setInnings1FOW] = useState<FallOfWicket[]>([]);
  const [innings2FOW, setInnings2FOW] = useState<FallOfWicket[]>([]);

  // Ball tracking
  const [currentOverBalls, setCurrentOverBalls] = useState<BallData[]>([]);
  const [lastBalls, setLastBalls] = useState<BallData[]>([]);

  // Over history and commentary (Cricbuzz-style records)
  const [innings1OverHistory, setInnings1OverHistory] = useState<OverHistory[]>([]);
  const [innings2OverHistory, setInnings2OverHistory] = useState<OverHistory[]>([]);
  const [commentaryLog, setCommentaryLog] = useState<CommentaryEntry[]>([]);

  // UI state
  const [aiCommentary, setAiCommentary] = useState<string>('');
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [showDismissalDialog, setShowDismissalDialog] = useState(false);
  const [showInningsSummary, setShowInningsSummary] = useState(false);
  const [showMatchSummary, setShowMatchSummary] = useState(false);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showNewBatterSelect, setShowNewBatterSelect] = useState(false);
  const [showLiveSummary, setShowLiveSummary] = useState(false);

  // Player change dialogs
  const [showChangeStriker, setShowChangeStriker] = useState(false);
  const [showChangeNonStriker, setShowChangeNonStriker] = useState(false);
  const [showChangeBowler, setShowChangeBowler] = useState(false);

  // Powerplay tracking (for T20: 1-6 powerplay, 7-16 middle, 17-20 death)
  const [powerplayType, setPowerplayType] = useState<'powerplay' | 'middle' | 'death' | 'none'>('powerplay');

  // Min bowlers rule
  const [minBowlersRequired, setMinBowlersRequired] = useState<number>(5);

  // Manhattan chart data (runs per over)
  const [innings1RunsPerOver, setInnings1RunsPerOver] = useState<number[]>([]);
  const [innings2RunsPerOver, setInnings2RunsPerOver] = useState<number[]>([]);

  // Wagon wheel data (direction and runs per shot)
  const [wagonWheelData, setWagonWheelData] = useState<{ angle: number; runs: number; batter: string }[]>([]);

  // Confirmation dialogs
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Get dismissed batters
  const [dismissedBatters, setDismissedBatters] = useState<Set<string>>(new Set());
  const [usedBowlers, setUsedBowlers] = useState<Map<string, number>>(new Map()); // bowlerId -> overs bowled

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load match data when navigating from "Continue Scoring"
  useEffect(() => {
    if (!urlMatchId || !user) return;

    const loadMatchData = async () => {
      setLoadingMatch(true);
      try {
        // First, fetch match basic data
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', urlMatchId)
          .single();

        if (matchError || !matchData) {
          console.error('Match load error:', matchError);
          toast({ variant: 'destructive', title: 'Match not found', description: 'Starting new match setup' });
          return;
        }

        // Check if match has team IDs
        if (!matchData.team1_id || !matchData.team2_id) {
          console.log('Match has no team IDs, cannot resume');
          toast({
            variant: 'destructive',
            title: 'Cannot resume match',
            description: 'This match was not saved with team data. Starting new match setup.'
          });
          return;
        }

        // Fetch teams separately
        const { data: team1Data, error: team1Error } = await supabase
          .from('teams')
          .select('*, players(*)')
          .eq('id', matchData.team1_id)
          .single();

        const { data: team2Data, error: team2Error } = await supabase
          .from('teams')
          .select('*, players(*)')
          .eq('id', matchData.team2_id)
          .single();

        if (team1Error || team2Error || !team1Data || !team2Data) {
          console.error('Team load error:', team1Error, team2Error);
          toast({ variant: 'destructive', title: 'Error loading teams' });
          return;
        }

        const team1: Team = {
          id: team1Data.id,
          name: team1Data.name,
          players: team1Data.players || [],
        };
        const team2: Team = {
          id: team2Data.id,
          name: team2Data.name,
          players: team2Data.players || [],
        };

        // Load stored score data if available
        const innings1 = matchData.team1_score as any;
        const innings2 = matchData.team2_score as any;

        // Try to get live state from database first, then localStorage as fallback
        let liveState = matchData.live_state as any;
        if (!liveState) {
          try {
            const stored = localStorage.getItem(`match_live_state_${urlMatchId}`);
            if (stored) {
              liveState = JSON.parse(stored);
              console.log('Restored live state from localStorage');
            }
          } catch (e) {
            console.warn('Failed to restore from localStorage:', e);
          }
        }

        // Determine batting/bowling teams based on toss
        const tossWinner = matchData.toss_winner_id === team1.id ? 'team1' : 'team2';
        const tossDecision = matchData.toss_decision || 'bat';
        const battingTeam = tossDecision === 'bat'
          ? (tossWinner === 'team1' ? team1 : team2)
          : (tossWinner === 'team1' ? team2 : team1);
        const bowlingTeam = battingTeam.id === team1.id ? team2 : team1;
        const team1IsFirstBatting = battingTeam.id === team1.id;

        // Set match config first
        const configTotalOvers = liveState?.total_overs || 20;
        setMatchConfig({
          team1,
          team2,
          team1PlayingXI: team1.players,
          team2PlayingXI: team2.players,
          totalOvers: configTotalOvers,
          maxOversPerBowler: null,
          tossWinner: tossWinner as 'team1' | 'team2',
          tossDecision: tossDecision as 'bat' | 'bowl',
          battingTeam,
          bowlingTeam,
          openingBatsman1: null,
          openingBatsman2: null,
          openingBowler: null,
          wicketKeeper: null,
        });

        // Set basic scores
        if (innings1) {
          if (team1IsFirstBatting) {
            setInnings1Score({
              runs: innings1.runs || 0,
              wickets: innings1.wickets || 0,
              overs: innings1.overs || 0,
              balls: innings1.balls || 0,
            });
          } else {
            setInnings2Score({
              runs: innings1.runs || 0,
              wickets: innings1.wickets || 0,
              overs: innings1.overs || 0,
              balls: innings1.balls || 0,
            });
          }
        }
        if (innings2) {
          if (team1IsFirstBatting) {
            setInnings2Score({
              runs: innings2.runs || 0,
              wickets: innings2.wickets || 0,
              overs: innings2.overs || 0,
              balls: innings2.balls || 0,
            });
          } else {
            setInnings1Score({
              runs: innings2.runs || 0,
              wickets: innings2.wickets || 0,
              overs: innings2.overs || 0,
              balls: innings2.balls || 0,
            });
          }
        }

        // Restore full live state if available
        if (liveState) {
          // Set current innings
          if (liveState.current_innings) {
            setCurrentInnings(liveState.current_innings);
          }

          // Helper to find player by ID
          const findPlayer = (playerId: string): Player | null => {
            return team1.players.find(p => p.id === playerId) ||
              team2.players.find(p => p.id === playerId) || null;
          };

          // Restore striker, non-striker, bowler
          if (liveState.striker_id) {
            setStriker(findPlayer(liveState.striker_id));
          }
          if (liveState.non_striker_id) {
            setNonStriker(findPlayer(liveState.non_striker_id));
          }
          if (liveState.current_bowler_id) {
            setCurrentBowler(findPlayer(liveState.current_bowler_id));
          }

          // Restore current over balls
          if (liveState.current_over_balls) {
            setCurrentOverBalls(liveState.current_over_balls);
          }
          // Note: legalBallsInCurrentOver can be computed from currentOverBalls

          // Restore scorecards (convert from DB format)
          const restoreBattingScorecard = (dbScorecard: any[]): BatterStats[] => {
            if (!dbScorecard) return [];
            return dbScorecard.map(b => ({
              player: findPlayer(b.player_id) || { id: b.player_id, name: b.player_name, jersey_number: null, role: null },
              runs: b.runs || 0,
              balls: b.balls || 0,
              fours: b.fours || 0,
              sixes: b.sixes || 0,
              isOut: b.is_out || false,
              dismissal: b.dismissal || undefined,
            }));
          };

          const restoreBowlingScorecard = (dbScorecard: any[]): BowlerStats[] => {
            if (!dbScorecard) return [];
            return dbScorecard.map(b => ({
              player: findPlayer(b.player_id) || { id: b.player_id, name: b.player_name, jersey_number: null, role: null },
              overs: b.overs || 0,
              balls: b.balls || 0,
              maidens: b.maidens || 0,
              runs: b.runs || 0,
              wickets: b.wickets || 0,
            }));
          };

          if (liveState.innings1_batting) {
            setInnings1Batting(restoreBattingScorecard(liveState.innings1_batting));
          }
          if (liveState.innings2_batting) {
            setInnings2Batting(restoreBattingScorecard(liveState.innings2_batting));
          }
          if (liveState.innings1_bowling) {
            setInnings1Bowling(restoreBowlingScorecard(liveState.innings1_bowling));
          }
          if (liveState.innings2_bowling) {
            setInnings2Bowling(restoreBowlingScorecard(liveState.innings2_bowling));
          }

          // Restore dismissed batters set from scorecards
          const restoredDismissed = new Set<string>();
          const currentInningsBatting = liveState.current_innings === 1
            ? liveState.innings1_batting
            : liveState.innings2_batting;
          if (currentInningsBatting) {
            currentInningsBatting.forEach((b: any) => {
              if (b.is_out) {
                restoredDismissed.add(b.player_id);
              }
            });
          }
          setDismissedBatters(restoredDismissed);

          // Restore FOW
          if (liveState.innings1_fow) {
            setInnings1FOW(liveState.innings1_fow);
          }
          if (liveState.innings2_fow) {
            setInnings2FOW(liveState.innings2_fow);
          }

          // Restore over history
          if (liveState.innings1_over_history) {
            setInnings1OverHistory(liveState.innings1_over_history);
          }
          if (liveState.innings2_over_history) {
            setInnings2OverHistory(liveState.innings2_over_history);
          }

          setMatchId(urlMatchId);
          setShowSetup(false);

          // Only show batter/bowler select if not already set
          const hasStriker = !!liveState.striker_id;
          const hasNonStriker = !!liveState.non_striker_id;
          const hasBowler = !!liveState.current_bowler_id;

          if (!hasStriker || !hasNonStriker) {
            setShowNewBatterSelect(true);
          }
          if (!hasBowler) {
            setShowBowlerSelect(true);
          }

          toast({
            title: 'Match Resumed',
            description: hasStriker && hasNonStriker && hasBowler
              ? `Continuing from over ${liveState.current_innings === 1 ? innings1?.overs || 0 : innings2?.overs || 0}.${liveState.legal_balls_in_over || 0}`
              : `${team1.name} vs ${team2.name} - Select players to continue`,
          });
        } else {
          // No live state - basic resume
          setMatchId(urlMatchId);
          setShowSetup(false);
          setShowNewBatterSelect(true);
          setShowBowlerSelect(true);

          toast({
            title: 'Match Resumed',
            description: `${team1.name} vs ${team2.name} - Select openers to continue`,
          });
        }
      } catch (err) {
        console.error('Error loading match:', err);
        toast({ variant: 'destructive', title: 'Error loading match' });
      } finally {
        setLoadingMatch(false);
      }
    };

    loadMatchData();
  }, [urlMatchId, user]);


  const currentScore = currentInnings === 1 ? innings1Score : innings2Score;
  const setCurrentScore = currentInnings === 1 ? setInnings1Score : setInnings2Score;
  const battingScorecard = currentInnings === 1 ? innings1Batting : innings2Batting;
  const setBattingScorecard = currentInnings === 1 ? setInnings1Batting : setInnings2Batting;
  const bowlingScorecard = currentInnings === 1 ? innings1Bowling : innings2Bowling;
  const setBowlingScorecard = currentInnings === 1 ? setInnings1Bowling : setInnings2Bowling;
  const fallOfWickets = currentInnings === 1 ? innings1FOW : innings2FOW;
  const setFallOfWickets = currentInnings === 1 ? setInnings1FOW : setInnings2FOW;
  const overHistory = currentInnings === 1 ? innings1OverHistory : innings2OverHistory;
  const setOverHistory = currentInnings === 1 ? setInnings1OverHistory : setInnings2OverHistory;

  const getBattingTeam = () => {
    if (!matchConfig) return null;
    if (currentInnings === 1) return matchConfig.battingTeam;
    return matchConfig.battingTeam.id === matchConfig.team1.id ? matchConfig.team2 : matchConfig.team1;
  };

  const getBowlingTeam = () => {
    if (!matchConfig) return null;
    if (currentInnings === 1) return matchConfig.bowlingTeam;
    return matchConfig.bowlingTeam.id === matchConfig.team1.id ? matchConfig.team2 : matchConfig.team1;
  };

  const getBattingXI = () => {
    if (!matchConfig) return [];
    const battingTeam = getBattingTeam();
    if (battingTeam?.id === matchConfig.team1.id) return matchConfig.team1PlayingXI;
    return matchConfig.team2PlayingXI;
  };

  const getBowlingXI = () => {
    if (!matchConfig) return [];
    const bowlingTeam = getBowlingTeam();
    if (bowlingTeam?.id === matchConfig.team1.id) return matchConfig.team1PlayingXI;
    return matchConfig.team2PlayingXI;
  };

  // Generate Cricbuzz-style ball commentary
  const generateBallCommentary = (ballData: BallData, over: number, ball: number): CommentaryEntry => {
    const { batter, bowler, runs, isWicket, extraType, extras } = ballData;
    let text = '';
    let type: CommentaryEntry['type'] = 'run';

    if (isWicket) {
      text = `OUT! ${batter.name} is dismissed! ${bowler.name} strikes.`;
      type = 'wicket';
    } else if (extraType === 'wide') {
      text = `${bowler.name} bowls a wide, 1 run added to extras.`;
      type = 'extra';
    } else if (extraType === 'no_ball') {
      text = `No ball from ${bowler.name}! Free hit coming up.`;
      type = 'extra';
    } else if (extraType === 'bye') {
      text = `${extras} bye(s) taken by ${batter.name}.`;
      type = 'extra';
    } else if (extraType === 'leg_bye') {
      text = `${extras} leg bye(s) off the pads.`;
      type = 'extra';
    } else if (runs === 6) {
      text = `SIX! ${batter.name} launches ${bowler.name} for a maximum!`;
      type = 'boundary';
    } else if (runs === 4) {
      text = `FOUR! ${batter.name} finds the boundary off ${bowler.name}.`;
      type = 'boundary';
    } else if (runs === 0) {
      text = `Dot ball. Good delivery from ${bowler.name}, ${batter.name} defends.`;
      type = 'dot';
    } else if (runs === 1) {
      text = `Single taken by ${batter.name}. Strike rotated.`;
      type = 'run';
    } else if (runs === 2) {
      text = `Good running! ${batter.name} comes back for 2 runs.`;
      type = 'run';
    } else if (runs === 3) {
      text = `Excellent running! ${batter.name} picks up 3 runs.`;
      type = 'run';
    } else {
      text = `${runs} runs taken by ${batter.name}.`;
      type = 'run';
    }

    return {
      over,
      ball,
      text,
      type,
      timestamp: new Date(),
    };
  };

  // Get remaining batters to bat
  const getRemainingBatters = () => {
    const battingXI = getBattingXI();
    const battedPlayerIds = new Set(battingScorecard.map(b => b.player.id));
    return battingXI.filter(player =>
      !dismissedBatters.has(player.id) &&
      !battedPlayerIds.has(player.id) &&
      player.id !== striker?.id &&
      player.id !== nonStriker?.id
    );
  };

  // ========== ADVANCED STATS CALCULATIONS ==========

  // Calculate Current Run Rate
  const calculateCRR = (): number => {
    const totalOvers = currentScore.overs + currentScore.balls / 6;
    if (totalOvers === 0) return 0;
    return parseFloat((currentScore.runs / totalOvers).toFixed(2));
  };

  // Calculate Required Run Rate (for 2nd innings)
  const calculateRRR = (): number | null => {
    if (currentInnings !== 2 || !matchConfig) return null;
    const target = innings1Score.runs + 1;
    const runsNeeded = target - currentScore.runs;
    const oversRemaining = matchConfig.totalOvers - currentScore.overs - currentScore.balls / 6;
    if (oversRemaining <= 0) return null;
    return parseFloat((runsNeeded / oversRemaining).toFixed(2));
  };

  // Calculate Win Probability using simple factors
  const calculateWinProbability = (): { batting: number; bowling: number } => {
    if (!matchConfig) return { batting: 50, bowling: 50 };

    if (currentInnings === 1) {
      // First innings - probability based on score and overs
      const projectedScore = calculateCRR() * matchConfig.totalOvers;
      const wicketFactor = (10 - currentScore.wickets) / 10;
      const battingProb = Math.min(75, 30 + (projectedScore / 3) * wicketFactor);
      return { batting: Math.round(battingProb), bowling: Math.round(100 - battingProb) };
    } else {
      // Second innings - based on RRR vs CRR and wickets
      const rrr = calculateRRR();
      const crr = calculateCRR();
      if (!rrr) return { batting: 50, bowling: 50 };

      const runsNeeded = innings1Score.runs + 1 - currentScore.runs;
      const wicketsLeft = 10 - currentScore.wickets;
      const ballsLeft = (matchConfig.totalOvers * 6) - (currentScore.overs * 6 + currentScore.balls);

      // Simple probability formula
      let battingProb = 50;

      // RRR vs CRR comparison (-20 to +20)
      if (crr > 0) {
        const rrrRatio = rrr / crr;
        battingProb += (1 - rrrRatio) * 30;
      }

      // Wickets in hand bonus (0 to +20)
      battingProb += (wicketsLeft / 10) * 20;

      // If runs needed is very high
      if (runsNeeded > ballsLeft * 2) battingProb -= 30;

      // Clamp between 5 and 95
      battingProb = Math.max(5, Math.min(95, battingProb));

      return { batting: Math.round(battingProb), bowling: Math.round(100 - battingProb) };
    }
  };

  // Determine current powerplay phase
  const getCurrentPowerplay = (): 'powerplay' | 'middle' | 'death' | 'none' => {
    if (!matchConfig) return 'none';
    const totalOvers = matchConfig.totalOvers;
    const currentOver = currentScore.overs + 1;

    if (totalOvers === 20) {
      // T20 format
      if (currentOver <= 6) return 'powerplay';
      if (currentOver <= 15) return 'middle';
      return 'death';
    } else if (totalOvers === 50) {
      // ODI format
      if (currentOver <= 10) return 'powerplay';
      if (currentOver <= 40) return 'middle';
      return 'death';
    }
    return 'none';
  };

  // Update powerplay on over change
  useEffect(() => {
    setPowerplayType(getCurrentPowerplay());
  }, [currentScore.overs, matchConfig]);

  // Get unique bowlers count
  const getUniqueBowlersCount = (): number => {
    return usedBowlers.size;
  };

  // Swap striker and non-striker
  const swapBatsmen = () => {
    const temp = striker;
    setStriker(nonStriker);
    setNonStriker(temp);
    toast({
      title: 'Batsmen Swapped',
      description: `${nonStriker?.name} is now on strike`,
    });
  };

  // Change striker to new batter
  const changeStriker = (playerId: string) => {
    const battingXI = getBattingXI();
    const newBatter = battingXI.find(p => p.id === playerId);
    if (newBatter) {
      setStriker(newBatter);

      // Add to batting scorecard if not exists
      if (!battingScorecard.some(b => b.player.id === playerId)) {
        setBattingScorecard(prev => [...prev, {
          player: newBatter,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
        }]);
      }

      setShowChangeStriker(false);
      toast({ title: 'Striker Changed', description: `${newBatter.name} is now on strike` });
    }
  };

  // Change non-striker
  const changeNonStriker = (playerId: string) => {
    const battingXI = getBattingXI();
    const newBatter = battingXI.find(p => p.id === playerId);
    if (newBatter) {
      setNonStriker(newBatter);

      // Add to batting scorecard if not exists
      if (!battingScorecard.some(b => b.player.id === playerId)) {
        setBattingScorecard(prev => [...prev, {
          player: newBatter,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
        }]);
      }

      setShowChangeNonStriker(false);
      toast({ title: 'Non-Striker Changed', description: `${newBatter.name} is now at non-striker end` });
    }
  };

  // Change bowler mid-over
  const changeBowler = (playerId: string) => {
    const bowlingXI = getBowlingXI();
    const newBowler = bowlingXI.find(p => p.id === playerId);
    if (newBowler) {
      setCurrentBowler(newBowler);

      // Add to bowling scorecard if not exists
      if (!bowlingScorecard.some(b => b.player.id === playerId)) {
        setBowlingScorecard(prev => [...prev, {
          player: newBowler,
          overs: 0,
          balls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
        }]);
      }

      setShowChangeBowler(false);
      toast({ title: 'Bowler Changed', description: `${newBowler.name} is now bowling` });
    }
  };

  // Share match function
  const shareMatch = async () => {
    if (!matchId || !matchConfig) {
      toast({
        variant: 'destructive',
        title: 'Cannot share',
        description: 'Match is not saved to database yet.',
      });
      return;
    }

    const shareUrl = `${window.location.origin}/match/${matchId}`;
    const shareText = `🏏 Live: ${matchConfig.battingTeam.name} vs ${matchConfig.bowlingTeam.name}\n` +
      `Score: ${currentScore.runs}/${currentScore.wickets} (${currentScore.overs}.${currentScore.balls} overs)\n` +
      `Watch live: ${shareUrl}`;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Live Cricket Match',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share failed, fall back to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: '📋 Link Copied!',
        description: 'Match link copied to clipboard. Share with friends!',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not copy',
        description: 'Please manually copy the match link.',
      });
    }
  };

  // ========== BACKEND PERSISTENCE FUNCTIONS ==========

  // Save ball data to database
  const saveBallToDatabase = async (
    ballData: BallData,
    overNumber: number,
    ballNumber: number,
    innings: number,
    dismissalDetails?: DismissalDetails
  ) => {
    if (!matchId) return; // No database match linked

    try {
      const { error } = await supabase.from('ball_by_ball').insert({
        match_id: matchId,
        innings: innings,
        over_number: overNumber,
        ball_number: ballNumber,
        runs: ballData.runs,
        extras: ballData.extras,
        extra_type: ballData.extraType || null,
        is_wicket: ballData.isWicket,
        batsman_id: ballData.batter.id,
        bowler_id: ballData.bowler.id,
        wicket_type: dismissalDetails?.type || null,
        dismissed_player_id: dismissalDetails?.dismissedBatter?.id || null,
        fielder_id: dismissalDetails?.fielder?.id || null,
      });

      if (error) {
        console.error('Error saving ball to database:', error);
      }
    } catch (err) {
      console.error('Error saving ball:', err);
    }
  };

  // Update match score in database with full live state
  const updateMatchScore = async () => {
    if (!matchId || !matchConfig) return;

    try {
      const team1IsFirstBatting = matchConfig.battingTeam.id === matchConfig.team1.id;

      // Prepare full live state for resume
      const liveState = {
        current_innings: currentInnings,
        striker_id: striker?.id || null,
        non_striker_id: nonStriker?.id || null,
        current_bowler_id: currentBowler?.id || null,
        current_over_balls: currentOverBalls,
        legal_balls_in_over: currentOverBalls.filter(b => b.isLegal).length,
        innings1_batting: innings1Batting.map(b => ({
          player_id: b.player.id,
          player_name: b.player.name,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          is_out: b.isOut,
          dismissal: b.dismissal || null,
        })),
        innings2_batting: innings2Batting.map(b => ({
          player_id: b.player.id,
          player_name: b.player.name,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          is_out: b.isOut,
          dismissal: b.dismissal || null,
        })),
        innings1_bowling: innings1Bowling.map(b => ({
          player_id: b.player.id,
          player_name: b.player.name,
          overs: b.overs,
          balls: b.balls,
          maidens: b.maidens,
          runs: b.runs,
          wickets: b.wickets,
        })),
        innings2_bowling: innings2Bowling.map(b => ({
          player_id: b.player.id,
          player_name: b.player.name,
          overs: b.overs,
          balls: b.balls,
          maidens: b.maidens,
          runs: b.runs,
          wickets: b.wickets,
        })),
        innings1_fow: innings1FOW,
        innings2_fow: innings2FOW,
        innings1_over_history: innings1OverHistory,
        innings2_over_history: innings2OverHistory,
        total_overs: matchConfig.totalOvers,
      };

      // Also save to localStorage as backup
      try {
        localStorage.setItem(`match_live_state_${matchId}`, JSON.stringify(liveState));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }

      const scoreData = {
        team1_score: team1IsFirstBatting ? {
          runs: innings1Score.runs,
          wickets: innings1Score.wickets,
          overs: innings1Score.overs,
          balls: innings1Score.balls,
        } : {
          runs: innings2Score.runs,
          wickets: innings2Score.wickets,
          overs: innings2Score.overs,
          balls: innings2Score.balls,
        },
        team2_score: team1IsFirstBatting ? {
          runs: innings2Score.runs,
          wickets: innings2Score.wickets,
          overs: innings2Score.overs,
          balls: innings2Score.balls,
        } : {
          runs: innings1Score.runs,
          wickets: innings1Score.wickets,
          overs: innings1Score.overs,
          balls: innings1Score.balls,
        },
        live_state: JSON.parse(JSON.stringify(liveState)),
        status: 'live' as const,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('matches')
        .update(scoreData)
        .eq('id', matchId);

      if (error) {
        console.error('Error updating match score:', error);
      }
    } catch (err) {
      console.error('Error updating match:', err);
    }
  };


  // Save match summary to database (called at end of match)
  const saveMatchSummary = async () => {
    if (!matchId || !matchConfig) return;

    try {
      // Convert scorecards to JSON format
      const formatBattingForDB = (scorecard: BatterStats[]) =>
        scorecard.map(b => ({
          player_id: b.player.id,
          player_name: b.player.name,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          is_out: b.isOut,
          dismissal: b.dismissal || null,
        }));

      const formatBowlingForDB = (scorecard: BowlerStats[]) =>
        scorecard.map(b => ({
          player_id: b.player.id,
          player_name: b.player.name,
          overs: b.overs,
          balls: b.balls,
          maidens: b.maidens,
          runs: b.runs,
          wickets: b.wickets,
        }));

      const formatFOWForDB = (fows: FallOfWicket[]) =>
        fows.map(f => ({
          runs: f.runs,
          wickets: f.wickets,
          batter: f.batter,
          over: f.over,
        }));

      // Find best performers
      const allBatters = [...innings1Batting, ...innings2Batting];
      const allBowlers = [...innings1Bowling, ...innings2Bowling];
      const bestBatter = allBatters.reduce((best, b) => b.runs > (best?.runs || 0) ? b : best, allBatters[0]);
      const bestBowler = allBowlers.reduce((best, b) => b.wickets > (best?.wickets || 0) ? b : best, allBowlers[0]);

      const { error } = await supabase.from('match_summaries').upsert({
        match_id: matchId,
        innings1_score: {
          runs: innings1Score.runs,
          wickets: innings1Score.wickets,
          overs: innings1Score.overs,
          balls: innings1Score.balls,
        },
        innings2_score: {
          runs: innings2Score.runs,
          wickets: innings2Score.wickets,
          overs: innings2Score.overs,
          balls: innings2Score.balls,
        },
        innings1_batting: formatBattingForDB(innings1Batting),
        innings1_bowling: formatBowlingForDB(innings1Bowling),
        innings1_fow: formatFOWForDB(innings1FOW),
        innings2_batting: formatBattingForDB(innings2Batting),
        innings2_bowling: formatBowlingForDB(innings2Bowling),
        innings2_fow: formatFOWForDB(innings2FOW),
        best_batter_id: bestBatter?.player?.id || null,
        best_bowler_id: bestBowler?.player?.id || null,
      }, {
        onConflict: 'match_id',
      });

      if (error) {
        console.error('Error saving match summary:', error);
      } else {
        toast({
          title: 'Match Saved!',
          description: 'All match data has been saved to database.',
        });
      }
    } catch (err) {
      console.error('Error saving match summary:', err);
    }
  };

  // Export match data as printable PDF with colorful styling
  const exportMatchPDF = () => {
    if (!matchConfig) {
      toast({ variant: 'destructive', title: 'No match data to export' });
      return;
    }

    const formatTime = () => new Date().toLocaleString();
    const crr = calculateCRR();
    const rrr = calculateRRR();
    const team1Name = matchConfig.team1.name;
    const team2Name = matchConfig.team2.name;
    const battingTeamName = getBattingTeam()?.name || 'Batting Team';
    const bowlingTeamName = getBowlingTeam()?.name || 'Bowling Team';

    const buildBattingTable = (batters: BatterStats[]) => {
      if (batters.length === 0) return '<p style="color:#888;">No batting data</p>';
      return `
        <table style="width:100%; border-collapse:collapse; margin:10px 0;">
          <thead>
            <tr style="background:linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color:white;">
              <th style="padding:8px 12px; text-align:left; border-radius:8px 0 0 0;">Batter</th>
              <th style="padding:8px;">R</th>
              <th style="padding:8px;">B</th>
              <th style="padding:8px;">4s</th>
              <th style="padding:8px;">6s</th>
              <th style="padding:8px; border-radius:0 8px 0 0;">SR</th>
            </tr>
          </thead>
          <tbody>
            ${batters.map((b, i) => `
              <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#e2e8f0'};">
                <td style="padding:8px 12px; font-weight:500; color:#1e3a5f;">${b.player.name}${b.isOut ? ' ✗' : ' *'}</td>
                <td style="padding:8px; text-align:center; font-weight:bold; color:${b.runs >= 50 ? '#22c55e' : b.runs >= 30 ? '#3b82f6' : '#334155'};">${b.runs}</td>
                <td style="padding:8px; text-align:center; color:#64748b;">${b.balls}</td>
                <td style="padding:8px; text-align:center; color:#22c55e;">${b.fours}</td>
                <td style="padding:8px; text-align:center; color:#eab308;">${b.sixes}</td>
                <td style="padding:8px; text-align:center; color:#7c3aed;">${b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    const buildBowlingTable = (bowlers: BowlerStats[]) => {
      if (bowlers.length === 0) return '<p style="color:#888;">No bowling data</p>';
      return `
        <table style="width:100%; border-collapse:collapse; margin:10px 0;">
          <thead>
            <tr style="background:linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color:white;">
              <th style="padding:8px 12px; text-align:left; border-radius:8px 0 0 0;">Bowler</th>
              <th style="padding:8px;">O</th>
              <th style="padding:8px;">M</th>
              <th style="padding:8px;">R</th>
              <th style="padding:8px;">W</th>
              <th style="padding:8px; border-radius:0 8px 0 0;">Econ</th>
            </tr>
          </thead>
          <tbody>
            ${bowlers.map((b, i) => `
              <tr style="background:${i % 2 === 0 ? '#faf5ff' : '#ede9fe'};">
                <td style="padding:8px 12px; font-weight:500; color:#5b21b6;">${b.player.name}</td>
                <td style="padding:8px; text-align:center;">${b.overs}${b.balls > 0 ? '.' + b.balls : ''}</td>
                <td style="padding:8px; text-align:center; color:#64748b;">${b.maidens}</td>
                <td style="padding:8px; text-align:center; color:#ef4444;">${b.runs}</td>
                <td style="padding:8px; text-align:center; font-weight:bold; color:${b.wickets >= 3 ? '#22c55e' : b.wickets >= 2 ? '#3b82f6' : '#334155'};">${b.wickets}</td>
                <td style="padding:8px; text-align:center; color:#7c3aed;">${b.overs > 0 ? (b.runs / b.overs).toFixed(2) : '0.00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Match Scorecard - ${team1Name} vs ${team2Name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 20px; background: #f1f5f9; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: white; padding: 24px; text-align: center; }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.8; font-size: 14px; }
          .match-info { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%); color: white; }
          .team { text-align: center; flex: 1; }
          .team-name { font-size: 18px; font-weight: 600; }
          .vs { font-size: 14px; opacity: 0.8; padding: 0 16px; }
          .innings { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
          .innings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .innings-title { font-size: 16px; font-weight: 600; color: #1e3a5f; }
          .innings-score { font-size: 28px; font-weight: 700; color: #3b82f6; }
          .innings-overs { font-size: 14px; color: #64748b; }
          .section-title { font-size: 14px; font-weight: 600; color: #64748b; margin: 16px 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .stats { padding: 20px 24px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .stat-box { background: white; padding: 16px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .stat-value { font-size: 24px; font-weight: 700; color: #3b82f6; }
          .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
          .footer { padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          @media print { 
            body { background: white; padding: 0; } 
            .container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏏 CRICKET MATCH SCORECARD</h1>
            <p>Generated: ${formatTime()}</p>
          </div>
          
          <div class="match-info">
            <div class="team"><span class="team-name">${team1Name}</span></div>
            <span class="vs">VS</span>
            <div class="team"><span class="team-name">${team2Name}</span></div>
          </div>
          
          <div class="innings">
            <div class="innings-header">
              <div>
                <div class="innings-title">1st Innings - ${battingTeamName}</div>
                <div class="innings-overs">${innings1Score.overs}.${innings1Score.balls} overs</div>
              </div>
              <div class="innings-score">${innings1Score.runs}/${innings1Score.wickets}</div>
            </div>
            
            <div class="section-title">🏏 Batting</div>
            ${buildBattingTable(innings1Batting)}
            
            <div class="section-title">🎯 Bowling</div>
            ${buildBowlingTable(innings1Bowling)}
          </div>
          
          ${(currentInnings === 2 || innings2Score.runs > 0) ? `
          <div class="innings">
            <div class="innings-header">
              <div>
                <div class="innings-title">2nd Innings - ${bowlingTeamName}</div>
                <div class="innings-overs">${innings2Score.overs}.${innings2Score.balls} overs • Target: ${innings1Score.runs + 1}</div>
              </div>
              <div class="innings-score">${innings2Score.runs}/${innings2Score.wickets}</div>
            </div>
            
            <div class="section-title">🏏 Batting</div>
            ${buildBattingTable(innings2Batting)}
            
            <div class="section-title">🎯 Bowling</div>
            ${buildBowlingTable(innings2Bowling)}
          </div>
          ` : ''}
          
          <div class="stats">
            <div class="section-title" style="margin-top:0;">📊 Match Statistics</div>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${crr.toFixed(2)}</div>
                <div class="stat-label">Current Run Rate</div>
              </div>
              ${rrr ? `
              <div class="stat-box">
                <div class="stat-value" style="color:#ef4444;">${rrr.toFixed(2)}</div>
                <div class="stat-label">Required Run Rate</div>
              </div>
              ` : ''}
              <div class="stat-box">
                <div class="stat-value" style="color:#22c55e;">${matchConfig.totalOvers}</div>
                <div class="stat-label">Overs Format</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            Toss: ${matchConfig.tossWinner === 'team1' ? team1Name : team2Name} won, chose to ${matchConfig.tossDecision}
            <br>SportSphere AI • Powered by AI
          </div>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }

    toast({ title: '📄 PDF Export', description: 'Print dialog opened - save as PDF' });
  };

  // Update match status to completed
  const completeMatch = async (winnerId: string | null, resultSummary: string) => {
    if (!matchId) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: winnerId,
          result_summary: resultSummary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) {
        console.error('Error completing match:', error);
      }
    } catch (err) {
      console.error('Error completing match:', err);
    }
  };

  const handleMatchSetupComplete = (config: MatchConfig, matchDbId?: string) => {
    setMatchConfig(config);
    setMatchId(matchDbId || null); // Set database match ID for persistence
    setShowSetup(false);

    // Initialize first innings
    setStriker(config.openingBatsman1);
    setNonStriker(config.openingBatsman2);
    setCurrentBowler(config.openingBowler);

    // Initialize batting scorecard
    if (config.openingBatsman1 && config.openingBatsman2) {
      setInnings1Batting([
        { player: config.openingBatsman1, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
        { player: config.openingBatsman2, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
      ]);
    }

    // Initialize bowling scorecard
    if (config.openingBowler) {
      setInnings1Bowling([
        { player: config.openingBowler, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 },
      ]);
    }

    toast({
      title: "Match Started!",
      description: `${config.battingTeam.name} batting first${matchDbId ? ' - Data will be saved' : ''}`,
    });
  };

  const addBall = async (runs: number, extraType?: string) => {
    if (!striker || !currentBowler || showMatchSummary || showInningsSummary) return;
    if (currentScore.wickets >= 10) return;

    // Determine if this is a legal delivery
    // Legal deliveries: normal balls, byes, leg byes
    // NOT legal (must be re-bowled): wide, no_ball, ball_not_valid
    const isLegal = !extraType || extraType === 'bye' || extraType === 'leg_bye';
    const isBallNotValid = extraType === 'ball_not_valid';

    // Calculate runs and extras
    let totalRuns = runs;
    let extras = 0;

    if (extraType === 'wide' || extraType === 'no_ball') {
      extras = 1;
      totalRuns = extras; // Wide/No-ball only adds 1 run, no batsman runs
    } else if (extraType === 'bye' || extraType === 'leg_bye') {
      extras = runs;
      totalRuns = extras;
    } else if (isBallNotValid) {
      totalRuns = 0;
      extras = 0;
    }

    const ballData: BallData = {
      runs: isBallNotValid ? 0 : runs,
      isWicket: false,
      extras,
      extraType,
      isLegal,
      batter: striker,
      bowler: currentBowler,
    };

    // Track wagon wheel data for runs scored (not extras)
    if (runs > 0 && !extraType && striker) {
      const angle = Math.random() * 360; // Random shot direction
      setWagonWheelData(prev => [...prev, {
        angle,
        runs,
        batter: striker.name
      }]);
    }

    // Update score
    if (!isBallNotValid) {
      setCurrentScore(prev => {
        let newBalls = prev.balls;
        let newOvers = prev.overs;

        if (isLegal) {
          newBalls = prev.balls + 1;
          if (newBalls >= 6) {
            newOvers = prev.overs + 1;
            newBalls = 0;
          }
        }

        return {
          ...prev,
          runs: prev.runs + totalRuns,
          overs: newOvers,
          balls: newBalls,
        };
      });

      // Update batter stats (only for runs scored by batter, not extras)
      if (!extraType || extraType === 'no_ball') {
        setBattingScorecard(prev => prev.map(b =>
          b.player.id === striker.id
            ? {
              ...b,
              runs: b.runs + runs,
              balls: b.balls + (isLegal ? 1 : 0),
              fours: b.fours + (runs === 4 ? 1 : 0),
              sixes: b.sixes + (runs === 6 ? 1 : 0),
            }
            : b
        ));
      } else if (isLegal && extraType !== 'wide') {
        // Byes/Leg byes - add ball faced but no runs
        setBattingScorecard(prev => prev.map(b =>
          b.player.id === striker.id
            ? { ...b, balls: b.balls + 1 }
            : b
        ));
      }

      // Update bowler stats
      setBowlingScorecard(prev => {
        const existing = prev.find(b => b.player.id === currentBowler.id);
        if (existing) {
          return prev.map(b => {
            if (b.player.id !== currentBowler.id) return b;
            let newBalls = b.balls + (isLegal ? 1 : 0);
            let newOvers = b.overs;
            if (newBalls >= 6) {
              newOvers += 1;
              newBalls = 0;
            }
            return {
              ...b,
              runs: b.runs + (extraType === 'bye' || extraType === 'leg_bye' ? 0 : totalRuns),
              overs: newOvers,
              balls: newBalls,
            };
          });
        }
        return prev;
      });

      // Rotate strike on odd runs (only for legal deliveries)
      if (isLegal && runs % 2 === 1) {
        setStriker(nonStriker);
        setNonStriker(striker);
      }
    }

    // Check for over completion BEFORE adding the ball to currentOverBalls
    const legalBallsAfterThis = currentOverBalls.filter(b => b.isLegal).length + (isLegal ? 1 : 0);
    const overComplete = isLegal && legalBallsAfterThis === 6;

    // Track ball in current over
    const updatedOverBalls = [...currentOverBalls, ballData];
    setCurrentOverBalls(updatedOverBalls);

    setLastBalls(prev => [...prev.slice(-11), ballData]);

    // Add commentary entry
    if (!isBallNotValid) {
      const commentary = generateBallCommentary(
        ballData,
        currentScore.overs,
        currentScore.balls + (isLegal ? 1 : 0)
      );
      setCommentaryLog(prev => [commentary, ...prev]);
    }

    if (overComplete) {
      // Save over history before clearing
      const overRuns = updatedOverBalls.reduce((sum, b) => sum + b.runs + b.extras, 0);
      const overWickets = updatedOverBalls.filter(b => b.isWicket).length;
      const overCommentary = updatedOverBalls.map(b => {
        if (b.isWicket) return 'W';
        if (b.extraType === 'wide') return 'Wd';
        if (b.extraType === 'no_ball') return 'Nb';
        if (b.extraType === 'bye') return `B${b.extras}`;
        if (b.extraType === 'leg_bye') return `Lb${b.extras}`;
        return b.runs.toString();
      });

      setOverHistory(prev => [...prev, {
        overNumber: currentScore.overs + 1,
        bowler: currentBowler,
        runs: overRuns,
        wickets: overWickets,
        balls: updatedOverBalls,
        commentary: overCommentary,
      }]);

      // Update Manhattan chart data (runs per over)
      if (currentInnings === 1) {
        setInnings1RunsPerOver(prev => [...prev, overRuns]);
      } else {
        setInnings2RunsPerOver(prev => [...prev, overRuns]);
      }

      // Rotate strike at end of over
      setStriker(nonStriker);
      setNonStriker(striker);

      // Update bowler's over count
      setUsedBowlers(prev => {
        const newMap = new Map(prev);
        const currentOvers = newMap.get(currentBowler.id) || 0;
        newMap.set(currentBowler.id, currentOvers + 1);
        return newMap;
      });

      // Need new bowler and reset current over balls
      setShowBowlerSelect(true);
      setCurrentOverBalls([]);
    }

    // Check innings end conditions
    checkInningsEnd();

    // Generate AI commentary
    if (!isBallNotValid) {
      await generateCommentary(ballData);
    }

    // Save to database (runs, overs, wickets - no commentary)
    if (!isBallNotValid) {
      saveBallToDatabase(
        ballData,
        currentScore.overs,
        currentScore.balls + (isLegal ? 1 : 0),
        currentInnings
      );
      // Update match score every ball for real-time sync
      updateMatchScore();
    }
  };

  const handleWicket = () => {
    setShowDismissalDialog(true);
  };

  const confirmWicket = (dismissal: DismissalDetails) => {
    if (!striker || !currentBowler) return;

    setShowDismissalDialog(false);

    const isLegal = true; // Wicket balls are always legal deliveries

    // Check for over completion BEFORE updating state
    const legalBallsAfterThis = currentOverBalls.filter(b => b.isLegal).length + 1;
    const overComplete = legalBallsAfterThis === 6;

    // Create wicket ball data
    const wicketBallData: BallData = {
      runs: 0,
      isWicket: true,
      extras: 0,
      isLegal: true,
      batter: striker,
      bowler: currentBowler,
      dismissal: dismissal,
    };

    // Track ball in current over
    setCurrentOverBalls(prev => [...prev, wicketBallData]);
    setLastBalls(prev => [...prev.slice(-11), wicketBallData]);

    // Update score
    setCurrentScore(prev => {
      let newBalls = prev.balls + 1;
      let newOvers = prev.overs;

      if (newBalls >= 6) {
        newOvers = prev.overs + 1;
        newBalls = 0;
      }

      return {
        ...prev,
        wickets: prev.wickets + 1,
        overs: newOvers,
        balls: newBalls,
      };
    });

    // Update batting scorecard
    const dismissalText = formatDismissal(dismissal);
    setBattingScorecard(prev => prev.map(b =>
      b.player.id === dismissal.dismissedBatter.id
        ? { ...b, isOut: true, dismissal: dismissalText, balls: b.balls + 1 }
        : b
    ));

    // Update bowling scorecard
    if (dismissal.bowler) {
      setBowlingScorecard(prev => prev.map(b => {
        if (b.player.id !== currentBowler.id) return b;
        let newBalls = b.balls + 1;
        let newOvers = b.overs;
        if (newBalls >= 6) {
          newOvers += 1;
          newBalls = 0;
        }
        return {
          ...b,
          wickets: dismissal.type !== 'run_out' ? b.wickets + 1 : b.wickets,
          overs: newOvers,
          balls: newBalls,
        };
      }));
    }

    // Add to fall of wickets
    setFallOfWickets(prev => [...prev, {
      runs: currentScore.runs,
      wickets: prev.length + 1, // Use prev.length instead of currentScore.wickets to avoid stale state
      batter: dismissal.dismissedBatter.name,
      over: `${currentScore.overs}.${currentScore.balls + 1}`,
    }]);

    // Track dismissed batter
    setDismissedBatters(prev => new Set([...prev, dismissal.dismissedBatter.id]));

    // Add wicket commentary
    const wicketCommentary = generateBallCommentary(
      wicketBallData,
      currentScore.overs,
      currentScore.balls + 1
    );
    setCommentaryLog(prev => [wicketCommentary, ...prev]);

    // Need new batter (unless all out)
    if (currentScore.wickets + 1 < 10) {
      // Determine which batter to replace
      if (dismissal.dismissedBatter.id === striker?.id) {
        setStriker(null);
      } else {
        setNonStriker(null);
      }
      setShowNewBatterSelect(true);
    }

    // Handle over completion
    if (overComplete && currentScore.wickets + 1 < 10) {
      // Save over history before clearing
      const updatedOverBalls = [...currentOverBalls, wicketBallData];
      const overRuns = updatedOverBalls.reduce((sum, b) => sum + b.runs + b.extras, 0);
      const overWickets = updatedOverBalls.filter(b => b.isWicket).length;
      const overCommentaryItems = updatedOverBalls.map(b => {
        if (b.isWicket) return 'W';
        if (b.extraType === 'wide') return 'Wd';
        if (b.extraType === 'no_ball') return 'Nb';
        if (b.extraType === 'bye') return `B${b.extras}`;
        if (b.extraType === 'leg_bye') return `Lb${b.extras}`;
        return b.runs.toString();
      });

      setOverHistory(prev => [...prev, {
        overNumber: currentScore.overs + 1,
        bowler: currentBowler,
        runs: overRuns,
        wickets: overWickets,
        balls: updatedOverBalls,
        commentary: overCommentaryItems,
      }]);

      // Rotate strike and need new bowler
      if (striker && nonStriker) {
        setStriker(nonStriker);
        setNonStriker(striker);
      }
      setUsedBowlers(prev => {
        const newMap = new Map(prev);
        const currentOvers = newMap.get(currentBowler.id) || 0;
        newMap.set(currentBowler.id, currentOvers + 1);
        return newMap;
      });
      setShowBowlerSelect(true);
      setCurrentOverBalls([]);
    }

    // Check innings end
    setTimeout(() => checkInningsEnd(), 100);

    toast({
      variant: 'destructive',
      title: 'Wicket!',
      description: `${dismissal.dismissedBatter.name} - ${dismissalText}`,
    });

    // Save wicket to database
    saveBallToDatabase(
      wicketBallData,
      currentScore.overs,
      currentScore.balls + 1,
      currentInnings,
      dismissal
    );
    updateMatchScore();
  };

  const formatDismissal = (dismissal: DismissalDetails): string => {
    const { type, bowler, fielder } = dismissal;
    switch (type) {
      case 'bowled': return `b ${bowler?.name}`;
      case 'caught': return `c ${fielder?.name} b ${bowler?.name}`;
      case 'caught_behind': return `c †${fielder?.name} b ${bowler?.name}`;
      case 'lbw': return `lbw b ${bowler?.name}`;
      case 'run_out': return `run out (${fielder?.name})`;
      case 'stumped': return `st †${fielder?.name} b ${bowler?.name}`;
      case 'hit_wicket': return `hit wicket b ${bowler?.name}`;
      case 'retired_hurt': return 'retired hurt';
      default: return type;
    }
  };

  const checkInningsEnd = () => {
    if (!matchConfig) return;

    const score = currentInnings === 1 ? innings1Score : innings2Score;
    const allOut = score.wickets >= 10;
    const oversComplete = score.overs >= matchConfig.totalOvers;
    const targetChased = currentInnings === 2 && score.runs > innings1Score.runs;

    if (allOut || oversComplete || targetChased) {
      if (currentInnings === 1) {
        setShowInningsSummary(true);
        // Save innings 1 data to database
        updateMatchScore();
      } else {
        setShowMatchSummary(true);
        // Save complete match data to database
        saveMatchSummary();

        // Determine match result and save
        const diff = innings2Score.runs - innings1Score.runs;
        let winnerId: string | null = null;
        let resultSummary = '';

        if (diff > 0) {
          winnerId = getBowlingTeam()?.id || null; // Team 2 (was bowling in innings 1)
          resultSummary = `${getBowlingTeam()?.name} wins by ${10 - innings2Score.wickets} wickets`;
        } else if (diff < 0) {
          winnerId = getBattingTeam()?.id || null; // Team 1 (was batting in innings 1)
          resultSummary = `${getBattingTeam()?.name} wins by ${Math.abs(diff)} runs`;
        } else {
          resultSummary = 'Match Tied';
        }

        completeMatch(winnerId, resultSummary);
      }
    }
  };

  const startSecondInnings = () => {
    setShowInningsSummary(false);
    setCurrentInnings(2);
    setDismissedBatters(new Set());
    setUsedBowlers(new Map());
    setCurrentOverBalls([]);
    setLastBalls([]);
    setAiCommentary('');

    // Initialize second innings - swap batting/bowling
    const newBattingTeam = getBowlingTeam();
    const newBowlingTeam = getBattingTeam();

    if (!newBattingTeam || !newBowlingTeam) return;

    // Set initial players to null - user will need to select
    setStriker(null);
    setNonStriker(null);
    setCurrentBowler(null);
    setShowNewBatterSelect(true);

    toast({
      title: "Second Innings",
      description: `${newBattingTeam.name} need ${innings1Score.runs + 1} runs to win`,
    });
  };

  const selectNewBatter = (playerId: string) => {
    const battingXI = getBattingXI();
    const newBatter = battingXI.find(p => p.id === playerId);
    if (!newBatter) return;

    // Prevent selecting same player twice
    if (striker?.id === playerId || nonStriker?.id === playerId) {
      toast({
        variant: 'destructive',
        title: 'Player already selected',
        description: 'This player is already on the crease.',
      });
      return;
    }

    // Add to scorecard if not already there
    setBattingScorecard(prev => {
      const exists = prev.find(b => b.player.id === playerId);
      if (!exists) {
        return [...prev, { player: newBatter, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }];
      }
      return prev;
    });

    // First opening batter
    if (!striker) {
      setStriker(newBatter);
      // For second innings start or match start, need second opener
      if (!nonStriker) {
        return; // Keep dialog open for second batter
      }
    }
    // Second opening batter
    else if (!nonStriker) {
      setNonStriker(newBatter);
    }

    // Close dialog once we have both batters
    if (striker && nonStriker) {
      setShowNewBatterSelect(false);
    } else if (striker && newBatter) {
      // Just selected second batter
      setShowNewBatterSelect(false);
    }
  };

  const selectNewBowler = (playerId: string) => {
    const bowlingXI = getBowlingXI();
    const newBowler = bowlingXI.find(p => p.id === playerId);
    if (!newBowler) return;

    // Add to scorecard if not already there
    setBowlingScorecard(prev => {
      const exists = prev.find(b => b.player.id === playerId);
      if (!exists) {
        return [...prev, { player: newBowler, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 }];
      }
      return prev;
    });

    setCurrentBowler(newBowler);
    setShowBowlerSelect(false);
  };

  const undoLastBall = () => {
    if (lastBalls.length === 0) return;

    const lastBall = lastBalls[lastBalls.length - 1];
    const wasOverComplete = lastBall.isLegal && currentScore.balls === 0 && currentScore.overs > 0;

    setCurrentScore(prev => {
      let newBalls = prev.balls;
      let newOvers = prev.overs;

      if (lastBall.isLegal) {
        if (prev.balls === 0 && prev.overs > 0) {
          // Undoing a ball from a just-completed over
          newOvers = prev.overs - 1;
          newBalls = 5;
        } else if (prev.balls > 0) {
          newBalls = prev.balls - 1;
        }
      }

      return {
        ...prev,
        runs: Math.max(0, prev.runs - lastBall.runs - lastBall.extras),
        wickets: lastBall.isWicket ? Math.max(0, prev.wickets - 1) : prev.wickets,
        overs: newOvers,
        balls: newBalls,
      };
    });

    // If this was a wicket, restore the dismissed batter
    if (lastBall.isWicket && lastBall.dismissal) {
      const dismissedBatterId = lastBall.dismissal.dismissedBatter.id;
      const dismissedBatter = lastBall.dismissal.dismissedBatter;

      // Determine if the dismissed batter was striker or non-striker
      // We need to check the dismissal to know their original position
      const wasStriker = lastBall.batter.id === dismissedBatterId;

      // Find who is currently on crease (the new batter that was selected after wicket)
      const currentStriker = striker;
      const currentNonStriker = nonStriker;

      // Restore batter's isOut status to false and remove dismissal
      setBattingScorecard(prev => {
        // First, restore the dismissed batter
        let updated = prev.map(b =>
          b.player.id === dismissedBatterId
            ? { ...b, isOut: false, dismissal: undefined, balls: Math.max(0, b.balls - 1) }
            : b
        );

        // If the new batter has 0 runs and 0 balls faced (just came in), remove them
        if (wasStriker && currentStriker && currentStriker.id !== dismissedBatterId) {
          const newBatterStats = updated.find(b => b.player.id === currentStriker.id);
          if (newBatterStats && newBatterStats.runs === 0 && newBatterStats.balls === 0) {
            updated = updated.filter(b => b.player.id !== currentStriker.id);
          }
        } else if (!wasStriker && currentNonStriker && currentNonStriker.id !== dismissedBatterId) {
          const newBatterStats = updated.find(b => b.player.id === currentNonStriker.id);
          if (newBatterStats && newBatterStats.runs === 0 && newBatterStats.balls === 0) {
            updated = updated.filter(b => b.player.id !== currentNonStriker.id);
          }
        }

        return updated;
      });

      // Remove from dismissed batters set
      setDismissedBatters(prev => {
        const newSet = new Set(prev);
        newSet.delete(dismissedBatterId);
        return newSet;
      });

      // Remove from fall of wickets
      setFallOfWickets(prev => prev.slice(0, -1));

      // Restore the dismissed batter to their original position
      // Since wicket ball always means striker was on strike, restore to striker
      setStriker(dismissedBatter);

      // Close new batter selection dialog
      setShowNewBatterSelect(false);

      // Update bowler wicket count
      setBowlingScorecard(prev => prev.map(b => {
        if (b.player.id !== lastBall.bowler.id) return b;
        let newBalls = b.balls - 1;
        let newOvers = b.overs;
        if (newBalls < 0 && b.overs > 0) {
          newOvers -= 1;
          newBalls = 5;
        }
        return {
          ...b,
          wickets: lastBall.dismissal?.type !== 'run_out' ? Math.max(0, b.wickets - 1) : b.wickets,
          overs: newOvers,
          balls: Math.max(0, newBalls),
        };
      }));
    } else {
      // Non-wicket ball - update batter/bowler stats
      setBattingScorecard(prev => prev.map(b =>
        b.player.id === lastBall.batter.id
          ? {
            ...b,
            runs: Math.max(0, b.runs - lastBall.runs),
            balls: Math.max(0, b.balls - (lastBall.isLegal ? 1 : 0)),
            fours: lastBall.runs === 4 ? Math.max(0, b.fours - 1) : b.fours,
            sixes: lastBall.runs === 6 ? Math.max(0, b.sixes - 1) : b.sixes,
          }
          : b
      ));

      setBowlingScorecard(prev => prev.map(b => {
        if (b.player.id !== lastBall.bowler.id) return b;
        let newBalls = b.balls - (lastBall.isLegal ? 1 : 0);
        let newOvers = b.overs;
        if (newBalls < 0 && b.overs > 0) {
          newOvers -= 1;
          newBalls = 5;
        }
        return {
          ...b,
          runs: Math.max(0, b.runs - lastBall.runs - lastBall.extras),
          overs: newOvers,
          balls: Math.max(0, newBalls),
        };
      }));
    }

    // If we're undoing after an over completed, restore the previous bowler
    if (wasOverComplete && overHistory.length > 0) {
      const lastOverData = overHistory[overHistory.length - 1];

      // Restore the bowler who bowled the last over
      setCurrentBowler(lastOverData.bowler);

      // Restore the over balls
      setCurrentOverBalls(lastOverData.balls.slice(0, -1));

      // Remove the last over from history
      setOverHistory(prev => prev.slice(0, -1));

      // Undo the bowler overs count
      setUsedBowlers(prev => {
        const newMap = new Map(prev);
        const currentOvers = newMap.get(lastOverData.bowler.id) || 0;
        if (currentOvers > 0) {
          newMap.set(lastOverData.bowler.id, currentOvers - 1);
        }
        return newMap;
      });

      // Undo strike rotation (was rotated at end of over)
      if (striker && nonStriker) {
        setStriker(nonStriker);
        setNonStriker(striker);
      }

      // Close bowler select if open
      setShowBowlerSelect(false);
    } else {
      setCurrentOverBalls(prev => prev.slice(0, -1));
    }

    setLastBalls(prev => prev.slice(0, -1));
    setAiCommentary('');

    toast({
      title: "Ball undone",
      description: lastBall.isWicket
        ? `Wicket undone - ${lastBall.dismissal?.dismissedBatter.name} restored`
        : wasOverComplete
          ? "Over restored - previous bowler selected"
          : "Last ball has been removed",
    });
  };

  const generateCommentary = async (ballData: BallData) => {
    setLoadingCommentary(true);
    try {
      const response = await supabase.functions.invoke('ai-commentary', {
        body: {
          type: 'ball_commentary',
          matchContext: {
            team1: matchConfig?.team1.name || 'Team A',
            team2: matchConfig?.team2.name || 'Team B',
            score: `${currentScore.runs}/${currentScore.wickets}`,
            over: currentScore.overs,
            ball: currentScore.balls + (ballData.isLegal ? 1 : 0),
            innings: currentInnings,
            target: currentInnings === 2 ? innings1Score.runs + 1 : undefined,
          },
          lastBall: {
            batsman: ballData.batter.name,
            bowler: ballData.bowler.name,
            runs: ballData.runs,
            isWicket: ballData.isWicket,
            isBoundary: ballData.runs === 4 || ballData.runs === 6,
            extras: ballData.extras,
            extraType: ballData.extraType,
            isLegal: ballData.isLegal,
          },
        },
      });

      if (response.data?.commentary) {
        setAiCommentary(response.data.commentary);
      }
    } catch (error) {
      console.error('Commentary error:', error);
    } finally {
      setLoadingCommentary(false);
    }
  };

  const resetMatch = () => {
    setMatchConfig(null);
    setMatchId(null); // Clear database match link
    setShowSetup(true);
    setCurrentInnings(1);
    setInnings1Score({ runs: 0, wickets: 0, overs: 0, balls: 0 });
    setInnings2Score({ runs: 0, wickets: 0, overs: 0, balls: 0 });
    setInnings1Batting([]);
    setInnings1Bowling([]);
    setInnings2Batting([]);
    setInnings2Bowling([]);
    setInnings1FOW([]);
    setInnings2FOW([]);
    setInnings1OverHistory([]);
    setInnings2OverHistory([]);
    setCommentaryLog([]);
    setStriker(null);
    setNonStriker(null);
    setCurrentBowler(null);
    setCurrentOverBalls([]);
    setLastBalls([]);
    setAiCommentary('');
    setDismissedBatters(new Set());
    setUsedBowlers(new Map());
    setShowMatchSummary(false);
    setShowInningsSummary(false);
  };

  const formatOvers = (overs: number, balls: number) => `${overs}.${balls}`;

  const getBallColor = (ball: BallData) => {
    if (ball.isWicket) return 'bg-live text-white';
    if (ball.extraType === 'wide') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
    if (ball.extraType === 'no_ball') return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
    if (ball.extraType === 'bye' || ball.extraType === 'leg_bye') return 'bg-blue-500/20 text-blue-400';
    if (ball.extraType === 'ball_not_valid') return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    if (ball.runs === 6) return 'bg-energy text-white';
    if (ball.runs === 4) return 'bg-accent text-white';
    if (ball.runs === 0) return 'bg-secondary text-foreground';
    return 'bg-primary/20 text-primary';
  };

  const getBallLabel = (ball: BallData) => {
    if (ball.isWicket) return 'W';
    if (ball.extraType === 'wide') return 'Wd';
    if (ball.extraType === 'no_ball') return 'Nb';
    if (ball.extraType === 'bye') return `B${ball.extras}`;
    if (ball.extraType === 'leg_bye') return `Lb${ball.extras}`;
    if (ball.extraType === 'ball_not_valid') return '•';
    return ball.runs.toString();
  };

  const legalBallsInCurrentOver = currentOverBalls.filter(b => b.isLegal).length;

  const calculateRunRate = (runs: number, overs: number, balls: number) => {
    const totalBalls = overs * 6 + balls;
    if (totalBalls === 0) return '0.00';
    return ((runs / totalBalls) * 6).toFixed(2);
  };

  const getRequiredRunRate = () => {
    if (currentInnings !== 2 || !matchConfig) return null;
    const target = innings1Score.runs + 1;
    const runsNeeded = target - innings2Score.runs;
    const totalOvers = matchConfig.totalOvers;
    const ballsRemaining = (totalOvers - innings2Score.overs) * 6 - innings2Score.balls;
    if (ballsRemaining <= 0) return null;
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  };

  // Check if bowler can bowl (max overs rule)
  const canBowlerBowl = (playerId: string) => {
    if (!matchConfig?.maxOversPerBowler) return true;
    const oversUsed = usedBowlers.get(playerId) || 0;
    return oversUsed < matchConfig.maxOversPerBowler;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show match setup
  if (showSetup) {
    return (
      <div className="min-h-screen bg-gradient-dark py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-display font-bold">Live Scoring</h1>
              <p className="text-sm text-muted-foreground">Set up your match</p>
            </div>
          </div>

          <MatchSetup
            onComplete={handleMatchSetupComplete}
            onCancel={() => navigate('/dashboard')}
          />
        </div>
      </div>
    );
  }

  // Show innings summary
  if (showInningsSummary) {
    return (
      <div className="min-h-screen bg-gradient-dark py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <MatchSummary
            isInningsSummary={true}
            team1Name={matchConfig?.battingTeam.name || 'Team A'}
            team2Name={matchConfig?.bowlingTeam.name || 'Team B'}
            team1Score={innings1Score}
            team2Score={innings2Score}
            battingScorecard={innings1Batting}
            bowlingScorecard={innings1Bowling}
            fallOfWickets={innings1FOW}
            currentInnings={1}
            onContinue={startSecondInnings}
          />
        </div>
      </div>
    );
  }

  // Show match summary
  if (showMatchSummary) {
    return (
      <div className="min-h-screen bg-gradient-dark py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <MatchSummary
            isInningsSummary={false}
            team1Name={matchConfig?.battingTeam.name || 'Team A'}
            team2Name={matchConfig?.bowlingTeam.name || 'Team B'}
            team1Score={innings1Score}
            team2Score={innings2Score}
            battingScorecard={[...innings1Batting, ...innings2Batting]}
            bowlingScorecard={[...innings1Bowling, ...innings2Bowling]}
            fallOfWickets={[...innings1FOW, ...innings2FOW]}
            currentInnings={2}
            onNewMatch={resetMatch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-2 px-2 sm:py-4 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - Single Row on Mobile */}
        <div className="flex items-center gap-2 mb-2 sm:mb-4 flex-nowrap overflow-hidden">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-lg font-display font-bold truncate">
              {matchConfig?.team1.name} vs {matchConfig?.team2.name}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {matchConfig?.totalOvers}ov • Inn {currentInnings}
            </p>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-live/20 text-live text-xs sm:text-sm font-semibold shrink-0">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-live"></span>
            </span>
            LIVE
          </span>
          {matchId && (
            <Button
              variant="outline"
              size="sm"
              onClick={shareMatch}
              className="text-[10px] sm:text-xs px-2 shrink-0"
            >
              <Share2 className="w-3 h-3" />
              <span className="hidden sm:inline ml-1">Share</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportMatchPDF}
            className="text-[10px] sm:text-xs px-2 shrink-0"
          >
            <FileDown className="w-3 h-3" />
            <span className="hidden sm:inline ml-1">PDF</span>
          </Button>
        </div>

        {/* Compact Scoreboard */}
        <Card variant="glow" className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">{getBattingTeam()?.name}</p>
                <p className="text-3xl font-display font-bold">
                  {currentScore.runs}<span className="text-muted-foreground">/{currentScore.wickets}</span>
                  <span className="text-lg ml-2 text-muted-foreground">
                    ({formatOvers(currentScore.overs, currentScore.balls)})
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">RR: {calculateRunRate(currentScore.runs, currentScore.overs, currentScore.balls)}</p>
                {currentInnings === 2 && (
                  <>
                    <p className="text-sm font-semibold text-accent">
                      Need {Math.max(0, innings1Score.runs + 1 - currentScore.runs)} from {((matchConfig?.totalOvers || 20) - currentScore.overs) * 6 - currentScore.balls} balls
                    </p>
                    {getRequiredRunRate() && (
                      <p className="text-xs text-muted-foreground">RRR: {getRequiredRunRate()}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Current Players */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-secondary/30">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Striker</p>
                <p className="font-medium text-sm">{striker?.name || '-'} *</p>
                <p className="text-xs text-primary">
                  {battingScorecard.find(b => b.player.id === striker?.id)?.runs || 0} ({battingScorecard.find(b => b.player.id === striker?.id)?.balls || 0})
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Non-Striker</p>
                <p className="font-medium text-sm">{nonStriker?.name || '-'}</p>
                <p className="text-xs text-muted-foreground">
                  {battingScorecard.find(b => b.player.id === nonStriker?.id)?.runs || 0} ({battingScorecard.find(b => b.player.id === nonStriker?.id)?.balls || 0})
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bowler</p>
                <p className="font-medium text-sm">{currentBowler?.name || '-'}</p>
                <p className="text-xs text-muted-foreground">
                  {bowlingScorecard.find(b => b.player.id === currentBowler?.id)?.wickets || 0}-
                  {bowlingScorecard.find(b => b.player.id === currentBowler?.id)?.runs || 0}
                </p>
              </div>
            </div>

            {/* Player Change Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={swapBatsmen}
                className="text-xs"
              >
                🔄 Swap Batsmen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangeStriker(true)}
                className="text-xs"
              >
                ⚡ Change Striker
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangeNonStriker(true)}
                className="text-xs"
              >
                👤 Change Non-Striker
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangeBowler(true)}
                className="text-xs"
              >
                🎯 Change Bowler
              </Button>
            </div>


            {/* This Over */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  This Over ({legalBallsInCurrentOver}/6)
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {currentOverBalls.map((ball, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getBallColor(ball)}`}
                  >
                    {getBallLabel(ball)}
                  </motion.div>
                ))}
                {currentOverBalls.length === 0 && (
                  <p className="text-muted-foreground text-xs">New over</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoring Panel */}
        <Card variant="gradient" className="mb-4">
          <CardContent className="p-4">
            {/* Run Buttons - Compact Grid */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {[0, 1, 2, 3].map((runs) => (
                <Button
                  key={runs}
                  variant="secondary"
                  className="h-9 sm:h-10 text-base sm:text-lg font-bold"
                  onClick={() => addBall(runs)}
                  disabled={!striker || !currentBowler}
                >
                  {runs}
                </Button>
              ))}

            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Button
                variant="default"
                className="h-9 sm:h-10 text-base sm:text-lg font-bold bg-accent hover:bg-accent/90"
                onClick={() => addBall(4)}
                disabled={!striker || !currentBowler}
              >
                4
              </Button>
              <Button
                variant="energy"
                className="h-9 sm:h-10 text-base sm:text-lg font-bold"
                onClick={() => addBall(6)}
                disabled={!striker || !currentBowler}
              >
                6
              </Button>
            </div>

            {/* Extras & Special - Compact */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Button
                variant="outline"
                className="h-8 sm:h-9 text-[10px] sm:text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => addBall(0, 'wide')}
                disabled={!striker || !currentBowler}
              >
                Wide
              </Button>
              <Button
                variant="outline"
                className="h-8 sm:h-9 text-[10px] sm:text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                onClick={() => addBall(0, 'no_ball')}
                disabled={!striker || !currentBowler}
              >
                No Ball
              </Button>
              <Button
                variant="outline"
                className="h-8 sm:h-9 text-[10px] sm:text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={() => addBall(1, 'bye')}
                disabled={!striker || !currentBowler}
              >
                Bye
              </Button>
              <Button
                variant="outline"
                className="h-8 sm:h-9 text-[10px] sm:text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={() => addBall(1, 'leg_bye')}
                disabled={!striker || !currentBowler}
              >
                Leg Bye
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Button
                variant="destructive"
                className="h-9 sm:h-10 text-sm"
                onClick={handleWicket}
                disabled={!striker || !currentBowler || currentScore.wickets >= 10}
              >
                <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Wicket
              </Button>
              <Button
                variant="outline"
                className="h-9 sm:h-10 text-sm border-gray-500/50 text-gray-400"
                onClick={() => addBall(0, 'ball_not_valid')}
                disabled={!striker || !currentBowler}
              >
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Invalid
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUndoConfirm(true)}
                disabled={lastBalls.length === 0}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              {currentInnings === 1 && (
                <Button
                  variant="hero"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowInningsSummary(true)}
                >
                  End Innings
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Match Stats - Compact View */}
        <Card variant="gradient" className="mb-2 sm:mb-4">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <span className="text-xs font-semibold text-primary">📊 Stats</span>
            </div>
            <div className="grid grid-cols-4 gap-1 sm:gap-3 text-center">
              <div>
                <p className="text-base sm:text-xl font-bold text-primary">{calculateCRR().toFixed(1)}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">CRR</p>
              </div>
              <div>
                <p className="text-base sm:text-xl font-bold text-accent">{calculateRRR()?.toFixed(1) || '-'}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">RRR</p>
              </div>
              <div>
                <p className="text-base sm:text-xl font-bold">{getUniqueBowlersCount()}/{matchConfig?.maxOversPerBowler ? Math.ceil((matchConfig?.totalOvers || 20) / matchConfig.maxOversPerBowler) : 5}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">Bowlers</p>
              </div>
              <div>
                <p className="text-base sm:text-xl font-bold text-energy">{getCurrentPowerplay() === 'powerplay' ? 'PP' : getCurrentPowerplay() === 'death' ? 'DT' : 'MD'}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">Phase</p>
              </div>
            </div>
            {/* Win Probability Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[8px] sm:text-[10px] text-muted-foreground mb-0.5">
                <span>{getBattingTeam()?.name} {calculateWinProbability().batting}%</span>
                <span>{getBowlingTeam()?.name} {calculateWinProbability().bowling}%</span>
              </div>
              <div className="h-1.5 sm:h-2 rounded-full bg-secondary overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-500"
                  style={{ width: `${calculateWinProbability().batting}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* AI Commentary */}
        {(aiCommentary || loadingCommentary) && (
          <Card variant="gradient" className="mb-4">
            <CardContent className="p-4">
              {loadingCommentary ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <Mic className="w-4 h-4 text-muted-foreground animate-pulse" />
                  </div>
                  <div className="h-4 bg-secondary rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Mic className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm">{aiCommentary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live Match Summary Panel */}
        <Card variant="gradient" className="mb-4">
          <button
            onClick={() => setShowLiveSummary(!showLiveSummary)}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-semibold">Match Records</span>
              <span className="text-xs text-muted-foreground">
                (W: {currentScore.wickets} | Overs: {currentScore.overs}.{currentScore.balls})
              </span>
            </div>
            {showLiveSummary ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showLiveSummary && (
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              {/* Over-by-Over History (Cricbuzz style) */}
              {overHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                    <span>📊</span> Over-by-Over
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {[...overHistory].reverse().map((over, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-secondary/30 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">Over {over.overNumber}</span>
                          <span className="text-muted-foreground">({over.bowler.name})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {over.commentary.map((ball, ballIdx) => (
                              <span
                                key={ballIdx}
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                                  ${ball === 'W' ? 'bg-destructive text-white' :
                                    ball === '6' ? 'bg-energy text-white' :
                                      ball === '4' ? 'bg-accent text-white' :
                                        ball === '0' ? 'bg-secondary text-muted-foreground' :
                                          ball.startsWith('Wd') || ball.startsWith('Nb') ? 'bg-yellow-500/30 text-yellow-400' :
                                            'bg-primary/20 text-primary'}`}
                              >
                                {ball}
                              </span>
                            ))}
                          </div>
                          <span className={`font-semibold ${over.wickets > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {over.runs} runs {over.wickets > 0 && `• ${over.wickets}W`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manhattan Chart (Runs per Over) */}
              {(innings1RunsPerOver.length > 0 || innings2RunsPerOver.length > 0) && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                    <span>📈</span> Manhattan Chart (Runs per Over)
                  </h4>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-end gap-1 h-24 overflow-x-auto">
                      {(currentInnings === 1 ? innings1RunsPerOver : innings2RunsPerOver).map((runs, idx) => {
                        const maxRuns = Math.max(...(currentInnings === 1 ? innings1RunsPerOver : innings2RunsPerOver), 1);
                        const heightPercent = (runs / maxRuns) * 100;
                        return (
                          <div key={idx} className="flex flex-col items-center min-w-[24px]">
                            <div
                              className={`w-5 rounded-t transition-all ${runs >= 15 ? 'bg-energy' :
                                runs >= 10 ? 'bg-accent' :
                                  runs >= 6 ? 'bg-primary' :
                                    'bg-primary/50'
                                }`}
                              style={{ height: `${Math.max(heightPercent, 5)}%` }}
                              title={`Over ${idx + 1}: ${runs} runs`}
                            />
                            <span className="text-[8px] text-muted-foreground mt-0.5">{idx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                      <span>Innings {currentInnings}</span>
                      <span>Total: {(currentInnings === 1 ? innings1RunsPerOver : innings2RunsPerOver).reduce((a, b) => a + b, 0)} runs</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wagon Wheel Visualization */}
              {wagonWheelData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                    <span>🎯</span> Wagon Wheel
                  </h4>
                  <div className="bg-secondary/30 rounded-lg p-3 flex justify-center">
                    <svg viewBox="0 0 200 200" className="w-48 h-48">
                      {/* Cricket field outline */}
                      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" className="text-primary/20" strokeWidth="1" />
                      <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" className="text-primary/10" strokeWidth="1" strokeDasharray="4 4" />
                      <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" className="text-primary/10" strokeWidth="1" strokeDasharray="2 2" />

                      {/* Pitch */}
                      <rect x="97" y="85" width="6" height="30" fill="currentColor" className="text-secondary" />

                      {/* Shot lines */}
                      {wagonWheelData.map((shot, idx) => {
                        const angleRad = (shot.angle * Math.PI) / 180;
                        const length = 30 + (shot.runs * 15);
                        const x2 = 100 + Math.cos(angleRad) * Math.min(length, 85);
                        const y2 = 100 + Math.sin(angleRad) * Math.min(length, 85);
                        const strokeColor = shot.runs === 6 ? '#FFD700' : // Gold for 6
                          shot.runs === 4 ? '#22C55E' : // Green for 4
                            shot.runs >= 2 ? '#3B82F6' :  // Blue for 2-3
                              '#94A3B8';                     // Gray for 1
                        return (
                          <line
                            key={idx}
                            x1="100"
                            y1="100"
                            x2={x2}
                            y2={y2}
                            stroke={strokeColor}
                            strokeWidth={shot.runs >= 4 ? 2 : 1}
                            strokeLinecap="round"
                            opacity={0.8}
                          />
                        );
                      })}

                      {/* Center dot (batter position) */}
                      <circle cx="100" cy="100" r="4" fill="currentColor" className="text-primary" />
                    </svg>
                  </div>
                  <div className="flex justify-center gap-3 mt-2 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#FFD700]"></span> 6</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#22C55E]"></span> 4</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#3B82F6]"></span> 2-3</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#94A3B8]"></span> 1</span>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground mt-1">
                    {wagonWheelData.length} shots tracked
                  </p>
                </div>
              )}

              {/* Ball-by-Ball Commentary */}
              {commentaryLog.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                    <span>🎙️</span> Ball-by-Ball Commentary
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {commentaryLog.slice(0, 10).map((entry, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-xs border-l-2 
                          ${entry.type === 'wicket' ? 'bg-destructive/10 border-destructive' :
                            entry.type === 'boundary' ? 'bg-accent/10 border-accent' :
                              entry.type === 'dot' ? 'bg-secondary/30 border-secondary' :
                                'bg-primary/5 border-primary/30'}`}
                      >
                        <span className="font-semibold text-muted-foreground">
                          {entry.over}.{entry.ball}
                        </span>
                        <span className="ml-2">{entry.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remaining Batters to Bat */}
              {getRemainingBatters().length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                    <span>🏏</span> Yet to Bat ({getRemainingBatters().length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {getRemainingBatters().map((player) => (
                      <span
                        key={player.id}
                        className="px-2 py-1 rounded-lg bg-secondary/50 text-xs font-medium"
                      >
                        {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Batting Scorecard */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                  <span>🏏</span> Batting
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-1.5">Batter</th>
                        <th className="text-right py-1.5">R</th>
                        <th className="text-right py-1.5">B</th>
                        <th className="text-right py-1.5">4s</th>
                        <th className="text-right py-1.5">6s</th>
                        <th className="text-right py-1.5">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingScorecard
                        .filter(batter => {
                          // Show if: on crease, has faced balls, or is out
                          const isOnCrease = striker?.id === batter.player.id || nonStriker?.id === batter.player.id;
                          return isOnCrease || batter.balls > 0 || batter.isOut;
                        })
                        .map((batter) => {
                          const isStriker = striker?.id === batter.player.id;
                          const isNonStriker = nonStriker?.id === batter.player.id;
                          const isOnCrease = isStriker || isNonStriker;

                          return (
                            <tr key={batter.player.id} className="border-b border-border/30">
                              <td className="py-1.5">
                                <span className={`${isOnCrease ? 'text-accent font-medium' : batter.isOut ? 'text-muted-foreground' : ''}`}>
                                  {batter.player.name}
                                  {isStriker && ' *'}
                                </span>
                                {batter.isOut && batter.dismissal ? (
                                  <span className="block text-[10px] text-red-400">{batter.dismissal}</span>
                                ) : !batter.isOut && !isOnCrease ? (
                                  <span className="block text-[10px] text-muted-foreground">not out</span>
                                ) : isOnCrease && !batter.isOut ? (
                                  <span className="block text-[10px] text-green-400">{isStriker ? 'on strike' : 'batting'}</span>
                                ) : null}
                              </td>
                              <td className={`text-right font-semibold ${batter.runs >= 50 ? 'text-energy' : batter.runs >= 30 ? 'text-primary' : ''}`}>{batter.runs}</td>
                              <td className="text-right text-muted-foreground">{batter.balls}</td>
                              <td className="text-right text-muted-foreground">{batter.fours}</td>
                              <td className="text-right text-muted-foreground">{batter.sixes}</td>
                              <td className="text-right text-muted-foreground">
                                {batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(1) : '0.0'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bowling Scorecard */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                  <span>🎯</span> Bowling
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-1.5">Bowler</th>
                        <th className="text-right py-1.5">O</th>
                        <th className="text-right py-1.5">M</th>
                        <th className="text-right py-1.5">R</th>
                        <th className="text-right py-1.5">W</th>
                        <th className="text-right py-1.5">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingScorecard.filter(b => b.overs > 0 || b.balls > 0).map((bowler) => (
                        <tr key={bowler.player.id} className="border-b border-border/30">
                          <td className="py-1.5 font-medium">{bowler.player.name}</td>
                          <td className="text-right">{bowler.overs}.{bowler.balls}</td>
                          <td className="text-right text-muted-foreground">{bowler.maidens}</td>
                          <td className="text-right">{bowler.runs}</td>
                          <td className="text-right font-semibold text-primary">{bowler.wickets}</td>
                          <td className="text-right text-muted-foreground">
                            {(bowler.overs + bowler.balls / 6) > 0
                              ? (bowler.runs / (bowler.overs + bowler.balls / 6)).toFixed(2)
                              : '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fall of Wickets */}
              {fallOfWickets.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2">
                    <span>💥</span> Fall of Wickets
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {fallOfWickets.map((fow, index) => (
                      <div
                        key={index}
                        className="px-2 py-1 rounded-lg bg-destructive/10 text-xs border border-destructive/30"
                      >
                        <span className="font-semibold">{fow.runs}/{fow.wickets}</span>
                        <span className="text-muted-foreground ml-1">({fow.batter}, {fow.over})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Stats */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold text-primary">{currentScore.runs}</p>
                  <p className="text-[10px] text-muted-foreground">Runs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold text-destructive">{currentScore.wickets}</p>
                  <p className="text-[10px] text-muted-foreground">Wickets</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold text-accent">{currentScore.overs}.{currentScore.balls}</p>
                  <p className="text-[10px] text-muted-foreground">Overs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold text-energy">{overHistory.length}</p>
                  <p className="text-[10px] text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Bowler Selection Dialog */}
        {showBowlerSelect && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card variant="glow" className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Select Bowler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getBowlingXI()
                    .filter(p => p.id !== currentBowler?.id) // Can't bowl consecutive overs
                    .map((player) => {
                      const canBowl = canBowlerBowl(player.id);
                      const oversUsed = usedBowlers.get(player.id) || 0;
                      return (
                        <Button
                          key={player.id}
                          variant="outline"
                          className="w-full justify-between h-auto py-3"
                          onClick={() => selectNewBowler(player.id)}
                          disabled={!canBowl}
                        >
                          <span>{player.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {oversUsed}/{matchConfig?.maxOversPerBowler || '∞'} overs
                          </span>
                        </Button>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* New Batter Selection Dialog */}
        {showNewBatterSelect && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card variant="glow" className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Select New Batter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getBattingXI()
                    .filter(p => !dismissedBatters.has(p.id))
                    .filter(p => p.id !== striker?.id && p.id !== nonStriker?.id)
                    .map((player) => (
                      <Button
                        key={player.id}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => selectNewBatter(player.id)}
                      >
                        {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Change Striker Dialog */}
        <Dialog open={showChangeStriker} onOpenChange={setShowChangeStriker}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Change Striker</DialogTitle>
              <DialogDescription>Select a new striker from the batting XI</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getBattingXI().filter(p =>
                !dismissedBatters.has(p.id) &&
                p.id !== striker?.id &&
                p.id !== nonStriker?.id
              ).map(player => (
                <Button
                  key={player.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => changeStriker(player.id)}
                >
                  {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Non-Striker Dialog */}
        <Dialog open={showChangeNonStriker} onOpenChange={setShowChangeNonStriker}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Change Non-Striker</DialogTitle>
              <DialogDescription>Select a new non-striker from the batting XI</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getBattingXI().filter(p =>
                !dismissedBatters.has(p.id) &&
                p.id !== striker?.id &&
                p.id !== nonStriker?.id
              ).map(player => (
                <Button
                  key={player.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => changeNonStriker(player.id)}
                >
                  {player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Bowler Dialog */}
        <Dialog open={showChangeBowler} onOpenChange={setShowChangeBowler}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Change Bowler</DialogTitle>
              <DialogDescription>Select a new bowler from the bowling XI</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getBowlingXI().filter(p => p.id !== currentBowler?.id).map(player => {
                const oversUsed = usedBowlers.get(player.id) || 0;
                const maxOvers = matchConfig?.maxOversPerBowler;
                const canBowl = !maxOvers || oversUsed < maxOvers;
                return (
                  <Button
                    key={player.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => changeBowler(player.id)}
                    disabled={!canBowl}
                  >
                    <span>{player.name} {player.jersey_number ? `#${player.jersey_number}` : ''}</span>
                    <span className="text-xs text-muted-foreground">{oversUsed}/{maxOvers || '∞'} overs</span>
                  </Button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dismissal Dialog */}
        <DismissalDialog
          open={showDismissalDialog}
          onClose={() => setShowDismissalDialog(false)}
          onConfirm={confirmWicket}
          batters={striker && nonStriker ? [striker, nonStriker] : striker ? [striker] : []}
          fielders={getBowlingXI()}
          currentBowler={currentBowler}
          striker={striker}
        />

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          open={showUndoConfirm}
          onOpenChange={setShowUndoConfirm}
          title="Undo Last Ball?"
          description="This will remove the last recorded ball and reverse any runs, wickets, or overs. This action cannot be redone."
          confirmText="Undo Ball"
          variant="default"
          onConfirm={undoLastBall}
        />

        <ConfirmDialog
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          title="Reset Match?"
          description="This will clear all match data including scores, scorecards, and progress. You will need to set up the match again from scratch. This action cannot be undone."
          confirmText="Reset Match"
          variant="destructive"
          onConfirm={resetMatch}
        />
      </div>
    </div>
  );
};

export default LiveScoring;
