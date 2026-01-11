import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, Star, Target, Award, RefreshCw
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  jersey_number?: number | null;
  role?: string | null;
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

interface TeamScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
}

interface MatchSummaryProps {
  isInningsSummary: boolean;
  team1Name: string;
  team2Name: string;
  team1Score: TeamScore;
  team2Score: TeamScore;
  battingScorecard: BatterStats[];
  bowlingScorecard: BowlerStats[];
  fallOfWickets: { runs: number; wickets: number; batter: string; over: string }[];
  currentInnings: number;
  onContinue?: () => void;
  onNewMatch?: () => void;
}

const MatchSummary = ({
  isInningsSummary,
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  battingScorecard,
  bowlingScorecard,
  fallOfWickets,
  currentInnings,
  onContinue,
  onNewMatch,
}: MatchSummaryProps) => {
  // Calculate awards
  const bestBatter = [...battingScorecard].sort((a, b) => b.runs - a.runs)[0];
  const bestBowler = [...bowlingScorecard].sort((a, b) => {
    // Sort by wickets first, then by economy
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    const aEconomy = a.overs > 0 ? a.runs / (a.overs + a.balls / 6) : 0;
    const bEconomy = b.overs > 0 ? b.runs / (b.overs + b.balls / 6) : 0;
    return aEconomy - bEconomy;
  })[0];

  // Determine match result
  const getMatchResult = () => {
    if (isInningsSummary) {
      return `Target: ${team1Score.runs + 1} runs`;
    }
    
    const diff = team2Score.runs - team1Score.runs;
    if (diff > 0) {
      return `${team2Name} wins by ${10 - team2Score.wickets} wickets!`;
    } else if (diff < 0) {
      return `${team1Name} wins by ${Math.abs(diff)} runs!`;
    } else {
      return "Match Tied!";
    }
  };

  const formatOvers = (overs: number, balls: number) => `${overs}.${balls}`;
  
  const getStrikeRate = (runs: number, balls: number) => 
    balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
  
  const getEconomy = (runs: number, overs: number, balls: number) => {
    const totalOvers = overs + balls / 6;
    return totalOvers > 0 ? (runs / totalOvers).toFixed(2) : '0.00';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Result Banner */}
      <Card variant="glow" className={isInningsSummary ? 'border-primary/30' : 'border-accent/30'}>
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">
            {isInningsSummary ? 'Innings Complete' : 'Match Complete'}
          </h2>
          <p className="text-lg text-primary font-semibold mb-4">{getMatchResult()}</p>
          
          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/30">
            <div>
              <p className="text-sm text-muted-foreground">{team1Name}</p>
              <p className="text-3xl font-display font-bold">
                {team1Score.runs}<span className="text-muted-foreground">/{team1Score.wickets}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                ({formatOvers(team1Score.overs, team1Score.balls)} ov)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{team2Name}</p>
              <p className="text-3xl font-display font-bold">
                {team2Score.runs}<span className="text-muted-foreground">/{team2Score.wickets}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                ({formatOvers(team2Score.overs, team2Score.balls)} ov)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Awards (only for match end) */}
      {!isInningsSummary && (
        <div className="grid md:grid-cols-2 gap-4">
          {bestBatter && bestBatter.runs > 0 && (
            <Card variant="gradient">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Star className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Batter</p>
                    <p className="font-semibold">{bestBatter.player.name}</p>
                    <p className="text-sm text-primary">
                      {bestBatter.runs} runs ({bestBatter.balls} balls)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {bestBowler && (bestBowler.wickets > 0 || bestBowler.overs > 0) && (
            <Card variant="gradient">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-energy/20">
                    <Target className="w-5 h-5 text-energy" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Bowler</p>
                    <p className="font-semibold">{bestBowler.player.name}</p>
                    <p className="text-sm text-primary">
                      {bestBowler.wickets}/{bestBowler.runs} ({formatOvers(bestBowler.overs, bestBowler.balls)} ov)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Batting Scorecard */}
      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="text-lg">Batting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2">Batter</th>
                  <th className="text-right py-2">R</th>
                  <th className="text-right py-2">B</th>
                  <th className="text-right py-2">4s</th>
                  <th className="text-right py-2">6s</th>
                  <th className="text-right py-2">SR</th>
                </tr>
              </thead>
              <tbody>
                {battingScorecard.map((batter) => (
                  <tr key={batter.player.id} className="border-b border-border/50">
                    <td className="py-2">
                      <p className={`font-medium ${!batter.isOut ? 'text-accent' : ''}`}>
                        {batter.player.name}
                        {!batter.isOut && ' *'}
                      </p>
                      {batter.dismissal && (
                        <p className="text-xs text-muted-foreground">{batter.dismissal}</p>
                      )}
                    </td>
                    <td className="text-right font-semibold">{batter.runs}</td>
                    <td className="text-right text-muted-foreground">{batter.balls}</td>
                    <td className="text-right text-muted-foreground">{batter.fours}</td>
                    <td className="text-right text-muted-foreground">{batter.sixes}</td>
                    <td className="text-right text-muted-foreground">
                      {getStrikeRate(batter.runs, batter.balls)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bowling Scorecard */}
      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="text-lg">Bowling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2">Bowler</th>
                  <th className="text-right py-2">O</th>
                  <th className="text-right py-2">M</th>
                  <th className="text-right py-2">R</th>
                  <th className="text-right py-2">W</th>
                  <th className="text-right py-2">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlingScorecard.filter(b => b.overs > 0 || b.balls > 0).map((bowler) => (
                  <tr key={bowler.player.id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{bowler.player.name}</td>
                    <td className="text-right">{formatOvers(bowler.overs, bowler.balls)}</td>
                    <td className="text-right text-muted-foreground">{bowler.maidens}</td>
                    <td className="text-right">{bowler.runs}</td>
                    <td className="text-right font-semibold text-primary">{bowler.wickets}</td>
                    <td className="text-right text-muted-foreground">
                      {getEconomy(bowler.runs, bowler.overs, bowler.balls)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fall of Wickets */}
      {fallOfWickets.length > 0 && (
        <Card variant="gradient">
          <CardHeader>
            <CardTitle className="text-lg">Fall of Wickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {fallOfWickets.map((fow, index) => (
                <div
                  key={index}
                  className="px-3 py-1.5 rounded-lg bg-secondary/50 text-sm"
                >
                  <span className="font-semibold">{fow.runs}/{fow.wickets}</span>
                  <span className="text-muted-foreground"> ({fow.batter}, {fow.over})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {isInningsSummary ? (
          <Button variant="hero" className="flex-1" onClick={onContinue}>
            Start Second Innings
          </Button>
        ) : (
          <Button variant="hero" className="flex-1" onClick={onNewMatch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Match
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default MatchSummary;
