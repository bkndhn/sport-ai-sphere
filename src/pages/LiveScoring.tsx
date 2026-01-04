import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, ArrowLeft, Plus, Minus, RotateCcw,
  Circle, Target, Zap, Mic
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreState {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  target?: number;
}

interface BallData {
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  extras: number;
  extraType?: string;
}

const LiveScoring = () => {
  const { toast } = useToast();
  const [team1Score, setTeam1Score] = useState<ScoreState>({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [team2Score, setTeam2Score] = useState<ScoreState>({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [currentInnings, setCurrentInnings] = useState(1);
  const [lastBalls, setLastBalls] = useState<BallData[]>([]);
  const [aiCommentary, setAiCommentary] = useState<string>('');
  const [loadingCommentary, setLoadingCommentary] = useState(false);

  const currentScore = currentInnings === 1 ? team1Score : team2Score;
  const setCurrentScore = currentInnings === 1 ? setTeam1Score : setTeam2Score;

  const addBall = async (runs: number, isWicket = false, extras = 0, extraType?: string) => {
    const isBoundary = runs === 4 || runs === 6;
    const ballData: BallData = { runs, isWicket, isBoundary, extras, extraType };
    
    setCurrentScore(prev => {
      let newBalls = prev.balls + 1;
      let newOvers = prev.overs;
      
      // Handle legal delivery
      if (!extraType || extraType === 'bye' || extraType === 'leg_bye') {
        if (newBalls >= 6) {
          newOvers++;
          newBalls = 0;
        }
      }

      return {
        ...prev,
        runs: prev.runs + runs + extras,
        wickets: isWicket ? prev.wickets + 1 : prev.wickets,
        overs: newOvers,
        balls: newBalls,
      };
    });

    setLastBalls(prev => [...prev.slice(-5), ballData]);

    // Generate AI commentary
    await generateCommentary(ballData);
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
            ball: currentScore.balls + 1,
          },
          lastBall: {
            batsman: 'Batsman',
            bowler: 'Bowler',
            runs: ballData.runs,
            isWicket: ballData.isWicket,
            isBoundary: ballData.runs === 4 || ballData.runs === 6,
            extras: ballData.extras,
            extraType: ballData.extraType,
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
    if (ball.runs === 6) return 'bg-energy text-energy-foreground';
    if (ball.runs === 4) return 'bg-accent text-accent-foreground';
    if (ball.runs === 0) return 'bg-secondary text-secondary-foreground';
    return 'bg-primary/20 text-primary';
  };

  const getBallLabel = (ball: BallData) => {
    if (ball.isWicket) return 'W';
    if (ball.extraType === 'wide') return 'WD';
    if (ball.extraType === 'no_ball') return 'NB';
    return ball.runs.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Live Scoring</h1>
            <p className="text-sm text-muted-foreground">Ball-by-ball cricket scoring</p>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-live/20 text-live text-sm font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
            </span>
            LIVE
          </span>
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
              </div>
              <div className={`text-center p-4 rounded-xl ${currentInnings === 2 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}>
                <p className="text-sm text-muted-foreground mb-1">Team B {currentInnings === 2 ? '(Batting)' : ''}</p>
                <p className="text-4xl font-display font-bold">
                  {team2Score.runs}<span className="text-muted-foreground">/{team2Score.wickets}</span>
                </p>
                <p className="text-sm text-muted-foreground">{formatOvers(team2Score.overs, team2Score.balls)} overs</p>
              </div>
            </div>

            {/* This Over */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">This Over</p>
              <div className="flex gap-2 flex-wrap">
                {lastBalls.slice(-6).map((ball, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getBallColor(ball)}`}
                  >
                    {getBallLabel(ball)}
                  </motion.div>
                ))}
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
          </CardContent>
        </Card>

        {/* Scoring Panel */}
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
                >
                  {runs}
                </Button>
              ))}
            </div>

            {/* Special Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <Button
                variant="destructive"
                className="h-12"
                onClick={() => addBall(0, true)}
              >
                <Target className="w-4 h-4 mr-1" />
                Wicket
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => addBall(0, false, 1, 'wide')}
              >
                Wide
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => addBall(0, false, 1, 'no_ball')}
              >
                No Ball
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => addBall(0, false, 1, 'bye')}
              >
                Bye
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Undo
              </Button>
              <Button 
                variant="hero" 
                className="flex-1"
                onClick={() => setCurrentInnings(currentInnings === 1 ? 2 : 1)}
              >
                Switch Innings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveScoring;
