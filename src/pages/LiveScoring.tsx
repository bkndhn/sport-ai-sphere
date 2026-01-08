import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, ArrowLeft, RotateCcw, Target, Mic, RefreshCw, AlertTriangle,
  Users, ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MatchSetup from '@/components/scoring/MatchSetup';
import DismissalDialog, { DismissalDetails } from '@/components/scoring/DismissalDialog';
import MatchSummary from '@/components/scoring/MatchSummary';

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string | null;
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
}

interface FallOfWicket {
  runs: number;
  wickets: number;
  batter: string;
  over: string;
}

const LiveScoring = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Match state
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
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
  
  // UI state
  const [aiCommentary, setAiCommentary] = useState<string>('');
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [showDismissalDialog, setShowDismissalDialog] = useState(false);
  const [showInningsSummary, setShowInningsSummary] = useState(false);
  const [showMatchSummary, setShowMatchSummary] = useState(false);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showNewBatterSelect, setShowNewBatterSelect] = useState(false);
  
  // Get dismissed batters
  const [dismissedBatters, setDismissedBatters] = useState<Set<string>>(new Set());
  const [usedBowlers, setUsedBowlers] = useState<Map<string, number>>(new Map()); // bowlerId -> overs bowled

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const currentScore = currentInnings === 1 ? innings1Score : innings2Score;
  const setCurrentScore = currentInnings === 1 ? setInnings1Score : setInnings2Score;
  const battingScorecard = currentInnings === 1 ? innings1Batting : innings2Batting;
  const setBattingScorecard = currentInnings === 1 ? setInnings1Batting : setInnings2Batting;
  const bowlingScorecard = currentInnings === 1 ? innings1Bowling : innings2Bowling;
  const setBowlingScorecard = currentInnings === 1 ? setInnings1Bowling : setInnings2Bowling;
  const fallOfWickets = currentInnings === 1 ? innings1FOW : innings2FOW;
  const setFallOfWickets = currentInnings === 1 ? setInnings1FOW : setInnings2FOW;

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

  const handleMatchSetupComplete = (config: MatchConfig) => {
    setMatchConfig(config);
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
      description: `${config.battingTeam.name} batting first`,
    });
  };

  const addBall = async (runs: number, extraType?: string) => {
    if (!striker || !currentBowler || showMatchSummary || showInningsSummary) return;
    if (currentScore.wickets >= 10) return;

    // Determine if this is a legal delivery
    const isLegal = !extraType || extraType === 'bye' || extraType === 'leg_bye' || extraType === 'ball_not_valid';
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

    // Track ball in current over
    setCurrentOverBalls(prev => {
      const legalBallsInOver = prev.filter(b => b.isLegal).length;
      if (legalBallsInOver >= 6) {
        return [ballData];
      }
      return [...prev, ballData];
    });

    setLastBalls(prev => [...prev.slice(-11), ballData]);

    // Check for over completion
    const newBalls = isLegal ? (currentScore.balls + 1) % 6 : currentScore.balls;
    const overComplete = isLegal && currentScore.balls === 5;
    
    if (overComplete) {
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
      
      // Need new bowler
      setShowBowlerSelect(true);
      setCurrentOverBalls([]);
    }

    // Check innings end conditions
    checkInningsEnd();

    // Generate AI commentary
    if (!isBallNotValid) {
      await generateCommentary(ballData);
    }
  };

  const handleWicket = () => {
    setShowDismissalDialog(true);
  };

  const confirmWicket = (dismissal: DismissalDetails) => {
    if (!striker || !currentBowler) return;
    
    setShowDismissalDialog(false);
    
    const isLegal = dismissal.type !== 'run_out' || true; // Run outs can happen on any ball

    // Update score
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
      wickets: currentScore.wickets + 1,
      batter: dismissal.dismissedBatter.name,
      over: `${currentScore.overs}.${currentScore.balls + 1}`,
    }]);

    // Track dismissed batter
    setDismissedBatters(prev => new Set([...prev, dismissal.dismissedBatter.id]));

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

    // Check if over complete
    const overComplete = currentScore.balls === 5;
    if (overComplete && currentScore.wickets + 1 < 10) {
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
      } else {
        setShowMatchSummary(true);
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
    
    // Add to scorecard if not already there
    setBattingScorecard(prev => {
      const exists = prev.find(b => b.player.id === playerId);
      if (!exists) {
        return [...prev, { player: newBatter, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }];
      }
      return prev;
    });
    
    if (!striker) {
      setStriker(newBatter);
      if (!nonStriker && currentInnings === 2) {
        // Need second opener for second innings
        return;
      }
    } else if (!nonStriker) {
      setNonStriker(newBatter);
    }
    
    // Check if we have both batters
    if ((striker || newBatter) && (nonStriker || (!striker && newBatter))) {
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
    
    setCurrentScore(prev => {
      let newBalls = prev.balls;
      let newOvers = prev.overs;
      
      if (lastBall.isLegal) {
        if (prev.balls === 0 && prev.overs > 0) {
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
    
    setLastBalls(prev => prev.slice(0, -1));
    setCurrentOverBalls(prev => prev.slice(0, -1));
    setAiCommentary('');
    
    toast({
      title: "Ball undone",
      description: "Last ball has been removed",
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
    if (currentInnings !== 2) return null;
    const target = innings1Score.runs + 1;
    const runsNeeded = target - innings2Score.runs;
    const ballsRemaining = (matchConfig?.totalOvers || 20 - innings2Score.overs) * 6 - innings2Score.balls;
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
    <div className="min-h-screen bg-gradient-dark py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold">
              {matchConfig?.team1.name} vs {matchConfig?.team2.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {matchConfig?.totalOvers} overs • Innings {currentInnings}
            </p>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-live/20 text-live text-sm font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
            </span>
            LIVE
          </span>
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
                      Need {Math.max(0, innings1Score.runs + 1 - currentScore.runs)} from {(matchConfig?.totalOvers || 20 - currentScore.overs) * 6 - currentScore.balls} balls
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
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[0, 1, 2, 3].map((runs) => (
                <Button
                  key={runs}
                  variant="secondary"
                  className="h-12 text-lg font-bold"
                  onClick={() => addBall(runs)}
                  disabled={!striker || !currentBowler}
                >
                  {runs}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="default"
                className="h-12 text-lg font-bold bg-accent hover:bg-accent/90"
                onClick={() => addBall(4)}
                disabled={!striker || !currentBowler}
              >
                4
              </Button>
              <Button
                variant="energy"
                className="h-12 text-lg font-bold"
                onClick={() => addBall(6)}
                disabled={!striker || !currentBowler}
              >
                6
              </Button>
            </div>

            {/* Extras & Special - Compact */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Button
                variant="outline"
                className="h-10 text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => addBall(0, 'wide')}
                disabled={!striker || !currentBowler}
              >
                Wide
              </Button>
              <Button
                variant="outline"
                className="h-10 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                onClick={() => addBall(0, 'no_ball')}
                disabled={!striker || !currentBowler}
              >
                No Ball
              </Button>
              <Button
                variant="outline"
                className="h-10 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={() => addBall(1, 'bye')}
                disabled={!striker || !currentBowler}
              >
                Bye
              </Button>
              <Button
                variant="outline"
                className="h-10 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={() => addBall(1, 'leg_bye')}
                disabled={!striker || !currentBowler}
              >
                Leg Bye
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="destructive"
                className="h-12"
                onClick={handleWicket}
                disabled={!striker || !currentBowler || currentScore.wickets >= 10}
              >
                <Target className="w-4 h-4 mr-2" />
                Wicket
              </Button>
              <Button
                variant="outline"
                className="h-12 border-gray-500/50 text-gray-400"
                onClick={() => addBall(0, 'ball_not_valid')}
                disabled={!striker || !currentBowler}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Invalid Ball
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={undoLastBall}
                disabled={lastBalls.length === 0}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={resetMatch}
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
      </div>
    </div>
  );
};

export default LiveScoring;
