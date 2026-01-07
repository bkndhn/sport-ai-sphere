import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, ArrowLeft, RotateCcw,
  Target, Mic, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreState {
  runs: number;
  wickets: number;
  overs: number;
  balls: number; // Only counts LEGAL deliveries
  target?: number;
}

interface BallData {
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  extras: number;
  extraType?: string;
  isLegal: boolean; // Track if this was a legal delivery
}

const LiveScoring = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [team1Score, setTeam1Score] = useState<ScoreState>({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [team2Score, setTeam2Score] = useState<ScoreState>({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [currentInnings, setCurrentInnings] = useState(1);
  const [lastBalls, setLastBalls] = useState<BallData[]>([]);
  const [currentOverBalls, setCurrentOverBalls] = useState<BallData[]>([]); // Track balls in current over
  const [aiCommentary, setAiCommentary] = useState<string>('');
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [totalOvers, setTotalOvers] = useState(20); // Default 20 overs match
  const [isMatchComplete, setIsMatchComplete] = useState(false);

  const currentScore = currentInnings === 1 ? team1Score : team2Score;
  const setCurrentScore = currentInnings === 1 ? setTeam1Score : setTeam2Score;

  // Check if match/innings is complete
  useEffect(() => {
    // All out (10 wickets) or overs completed
    if (currentScore.wickets >= 10 || currentScore.overs >= totalOvers) {
      if (currentInnings === 1) {
        // First innings complete, switch to second
        toast({
          title: "Innings Complete!",
          description: `First innings ended at ${currentScore.runs}/${currentScore.wickets}. Target: ${currentScore.runs + 1}`,
        });
      } else {
        // Match complete
        setIsMatchComplete(true);
        const team1Runs = team1Score.runs;
        const team2Runs = currentScore.runs;
        const result = team2Runs > team1Runs 
          ? `Team B wins by ${10 - currentScore.wickets} wickets!`
          : team1Runs > team2Runs 
          ? `Team A wins by ${team1Runs - team2Runs} runs!`
          : "Match Tied!";
        toast({
          title: "Match Complete!",
          description: result,
        });
      }
    }
  }, [currentScore.wickets, currentScore.overs, totalOvers, currentInnings]);

  const addBall = async (runs: number, isWicket = false, extras = 0, extraType?: string) => {
    if (isMatchComplete) return;
    if (currentScore.wickets >= 10) return; // All out

    const isBoundary = runs === 4 || runs === 6;
    
    // Determine if this is a legal delivery
    // Wide and No-Ball are NOT legal deliveries - ball must be re-bowled
    const isLegal = !extraType || extraType === 'bye' || extraType === 'leg_bye';
    
    const ballData: BallData = { 
      runs, 
      isWicket, 
      isBoundary, 
      extras, 
      extraType,
      isLegal 
    };
    
    setCurrentScore(prev => {
      let newBalls = prev.balls;
      let newOvers = prev.overs;
      
      // Only increment ball count for LEGAL deliveries
      if (isLegal) {
        newBalls = prev.balls + 1;
        
        // 6 legal balls = 1 over
        if (newBalls >= 6) {
          newOvers = prev.overs + 1;
          newBalls = 0;
          // Reset current over display
          setTimeout(() => setCurrentOverBalls([]), 100);
        }
      }
      
      // Check if overs limit reached
      if (newOvers >= totalOvers) {
        return {
          ...prev,
          runs: prev.runs + runs + extras,
          wickets: isWicket ? prev.wickets + 1 : prev.wickets,
          overs: totalOvers,
          balls: 0,
        };
      }

      return {
        ...prev,
        runs: prev.runs + runs + extras,
        wickets: isWicket ? Math.min(prev.wickets + 1, 10) : prev.wickets,
        overs: newOvers,
        balls: newBalls,
      };
    });

    // Track current over balls (for display)
    setCurrentOverBalls(prev => {
      // If previous legal ball was the 6th, start fresh
      const legalBallsInOver = prev.filter(b => b.isLegal).length;
      if (legalBallsInOver >= 6) {
        return [ballData];
      }
      return [...prev, ballData];
    });

    setLastBalls(prev => [...prev.slice(-11), ballData]);

    // Generate AI commentary
    await generateCommentary(ballData);
  };

  const undoLastBall = () => {
    if (lastBalls.length === 0) return;
    
    const lastBall = lastBalls[lastBalls.length - 1];
    
    setCurrentScore(prev => {
      let newBalls = prev.balls;
      let newOvers = prev.overs;
      
      // Only decrement for legal deliveries
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
            team1: 'Team A',
            team2: 'Team B',
            score: `${currentScore.runs}/${currentScore.wickets}`,
            over: currentScore.overs,
            ball: currentScore.balls + (ballData.isLegal ? 1 : 0),
            innings: currentInnings,
            target: currentInnings === 2 ? team1Score.runs + 1 : undefined,
          },
          lastBall: {
            batsman: 'Batsman',
            bowler: 'Bowler',
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

  const formatOvers = (overs: number, balls: number) => `${overs}.${balls}`;

  const getBallColor = (ball: BallData) => {
    if (ball.isWicket) return 'bg-live text-live-foreground';
    if (ball.extraType === 'wide') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
    if (ball.extraType === 'no_ball') return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
    if (ball.extraType === 'bye' || ball.extraType === 'leg_bye') return 'bg-blue-500/20 text-blue-400';
    if (ball.runs === 6) return 'bg-energy text-energy-foreground';
    if (ball.runs === 4) return 'bg-accent text-accent-foreground';
    if (ball.runs === 0) return 'bg-secondary text-secondary-foreground';
    return 'bg-primary/20 text-primary';
  };

  const getBallLabel = (ball: BallData) => {
    if (ball.isWicket) return 'W';
    if (ball.extraType === 'wide') return `Wd${ball.extras > 1 ? '+' + (ball.extras - 1) : ''}`;
    if (ball.extraType === 'no_ball') return `Nb${ball.runs > 0 ? '+' + ball.runs : ''}`;
    if (ball.extraType === 'bye') return `B${ball.extras}`;
    if (ball.extraType === 'leg_bye') return `Lb${ball.extras}`;
    return ball.runs.toString();
  };

  const switchInnings = () => {
    if (currentInnings === 1) {
      setCurrentInnings(2);
      setTeam2Score(prev => ({ ...prev, target: team1Score.runs + 1 }));
      setCurrentOverBalls([]);
      setLastBalls([]);
      setAiCommentary('');
      toast({
        title: "Innings Switch",
        description: `Target for Team B: ${team1Score.runs + 1} runs`,
      });
    }
  };

  const resetMatch = () => {
    setTeam1Score({ runs: 0, wickets: 0, overs: 0, balls: 0 });
    setTeam2Score({ runs: 0, wickets: 0, overs: 0, balls: 0 });
    setCurrentInnings(1);
    setLastBalls([]);
    setCurrentOverBalls([]);
    setAiCommentary('');
    setIsMatchComplete(false);
    toast({
      title: "Match Reset",
      description: "All scores have been reset",
    });
  };

  // Calculate run rate
  const calculateRunRate = (runs: number, overs: number, balls: number) => {
    const totalBalls = overs * 6 + balls;
    if (totalBalls === 0) return '0.00';
    return ((runs / totalBalls) * 6).toFixed(2);
  };

  // Calculate required run rate
  const getRequiredRunRate = () => {
    if (currentInnings !== 2) return null;
    const target = team1Score.runs + 1;
    const runsNeeded = target - team2Score.runs;
    const ballsRemaining = (totalOvers - team2Score.overs) * 6 - team2Score.balls;
    if (ballsRemaining <= 0) return null;
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  };

  // Get legal balls count in current over for display
  const legalBallsInCurrentOver = currentOverBalls.filter(b => b.isLegal).length;

  return (
    <div className="min-h-screen bg-gradient-dark py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Live Scoring</h1>
            <p className="text-sm text-muted-foreground">
              Ball-by-ball cricket scoring • {totalOvers} overs match
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isMatchComplete ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm font-semibold">
                COMPLETED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-live/20 text-live text-sm font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
                </span>
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <Card variant="glow" className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className={`text-center p-4 rounded-xl ${currentInnings === 1 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}>
                <p className="text-sm text-muted-foreground mb-1">Team A {currentInnings === 1 ? '(Batting)' : ''}</p>
                <p className="text-4xl font-display font-bold">
                  {team1Score.runs}<span className="text-muted-foreground">/{team1Score.wickets}</span>
                </p>
                <p className="text-sm text-muted-foreground">{formatOvers(team1Score.overs, team1Score.balls)} overs</p>
                {currentInnings === 1 && (
                  <p className="text-xs text-primary mt-1">RR: {calculateRunRate(team1Score.runs, team1Score.overs, team1Score.balls)}</p>
                )}
              </div>
              <div className={`text-center p-4 rounded-xl ${currentInnings === 2 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}>
                <p className="text-sm text-muted-foreground mb-1">Team B {currentInnings === 2 ? '(Batting)' : ''}</p>
                <p className="text-4xl font-display font-bold">
                  {team2Score.runs}<span className="text-muted-foreground">/{team2Score.wickets}</span>
                </p>
                <p className="text-sm text-muted-foreground">{formatOvers(team2Score.overs, team2Score.balls)} overs</p>
                {currentInnings === 2 && (
                  <p className="text-xs text-primary mt-1">RR: {calculateRunRate(team2Score.runs, team2Score.overs, team2Score.balls)}</p>
                )}
              </div>
            </div>

            {/* Target info for second innings */}
            {currentInnings === 2 && (
              <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30 text-center">
                <p className="text-sm">
                  <span className="text-muted-foreground">Target: </span>
                  <span className="font-bold text-accent">{team1Score.runs + 1}</span>
                  <span className="text-muted-foreground mx-2">•</span>
                  <span className="text-muted-foreground">Need: </span>
                  <span className="font-bold">{Math.max(0, team1Score.runs + 1 - team2Score.runs)}</span>
                  <span className="text-muted-foreground"> from </span>
                  <span className="font-bold">{(totalOvers - team2Score.overs) * 6 - team2Score.balls}</span>
                  <span className="text-muted-foreground"> balls</span>
                  {getRequiredRunRate() && (
                    <>
                      <span className="text-muted-foreground mx-2">•</span>
                      <span className="text-muted-foreground">RRR: </span>
                      <span className="font-bold text-energy">{getRequiredRunRate()}</span>
                    </>
                  )}
                </p>
              </div>
            )}

            {/* This Over */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  This Over ({legalBallsInCurrentOver}/6 legal balls)
                </p>
                {legalBallsInCurrentOver >= 6 && (
                  <span className="text-xs text-green-400 font-medium">Over Complete!</span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {currentOverBalls.map((ball, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`min-w-10 h-10 px-2 rounded-full flex items-center justify-center font-bold text-sm ${getBallColor(ball)}`}
                  >
                    {getBallLabel(ball)}
                  </motion.div>
                ))}
                {currentOverBalls.length === 0 && (
                  <p className="text-muted-foreground text-sm">No balls bowled yet</p>
                )}
              </div>
            </div>

            {/* AI Commentary */}
            {aiCommentary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Mic className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-primary font-semibold mb-1">AI Commentary</p>
                    <p className="text-sm">{aiCommentary}</p>
                  </div>
                </div>
              </motion.div>
            )}
            {loadingCommentary && (
              <div className="mt-6 p-4 rounded-xl bg-secondary/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="h-4 bg-secondary rounded w-3/4"></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Panel */}
        {!isMatchComplete && (
          <Card variant="gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Score This Ball
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Run Buttons */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {[0, 1, 2, 3, 4, 5, 6].map((runs) => (
                  <Button
                    key={runs}
                    variant={runs === 4 ? 'default' : runs === 6 ? 'energy' : 'secondary'}
                    className={`h-14 text-lg font-bold ${runs === 4 ? 'bg-accent hover:bg-accent/90' : ''}`}
                    onClick={() => addBall(runs)}
                    disabled={currentScore.wickets >= 10}
                  >
                    {runs}
                  </Button>
                ))}
              </div>

              {/* Special Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                <Button
                  variant="destructive"
                  className="h-12"
                  onClick={() => addBall(0, true)}
                  disabled={currentScore.wickets >= 10}
                >
                  <Target className="w-4 h-4 mr-1" />
                  Wicket
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => addBall(0, false, 1, 'wide')}
                  disabled={currentScore.wickets >= 10}
                >
                  Wide (+1)
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  onClick={() => addBall(1, false, 1, 'no_ball')}
                  disabled={currentScore.wickets >= 10}
                >
                  No Ball (+1)
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => addBall(0, false, 1, 'bye')}
                  disabled={currentScore.wickets >= 10}
                >
                  Bye
                </Button>
              </div>

              {/* Extra runs with Wide/No Ball */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Wide/No Ball + Runs</p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[1, 2, 3, 4].map((runs) => (
                    <Button
                      key={`wide-${runs}`}
                      variant="outline"
                      size="sm"
                      className="text-xs border-yellow-500/30 text-yellow-400"
                      onClick={() => addBall(runs, false, 1, 'wide')}
                      disabled={currentScore.wickets >= 10}
                    >
                      Wd+{runs}
                    </Button>
                  ))}
                  {[1, 2, 3, 4].map((runs) => (
                    <Button
                      key={`nb-${runs}`}
                      variant="outline"
                      size="sm"
                      className="text-xs border-orange-500/30 text-orange-400"
                      onClick={() => addBall(runs, false, 1, 'no_ball')}
                      disabled={currentScore.wickets >= 10}
                    >
                      Nb+{runs}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Leg Bye */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Leg Byes</p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((runs) => (
                    <Button
                      key={`lb-${runs}`}
                      variant="outline"
                      size="sm"
                      className="text-xs border-blue-500/30 text-blue-400"
                      onClick={() => addBall(0, false, runs, 'leg_bye')}
                      disabled={currentScore.wickets >= 10}
                    >
                      Lb {runs}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="ghost" 
                  onClick={undoLastBall}
                  disabled={lastBalls.length === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Undo
                </Button>
                {currentInnings === 1 && (
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={switchInnings}
                  >
                    End Innings & Switch
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={resetMatch}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Match
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match Complete Actions */}
        {isMatchComplete && (
          <Card variant="gradient">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-display font-bold mb-4">Match Complete!</h3>
              <p className="text-lg mb-6">
                {team2Score.runs > team1Score.runs 
                  ? `Team B wins by ${10 - team2Score.wickets} wickets!`
                  : team1Score.runs > team2Score.runs 
                  ? `Team A wins by ${team1Score.runs - team2Score.runs} runs!`
                  : "Match Tied!"}
              </p>
              <Button variant="hero" onClick={resetMatch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start New Match
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveScoring;
