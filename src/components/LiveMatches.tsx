import { motion } from "framer-motion";
import { Play, Users, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

const matches = [
  {
    id: 1,
    sport: "Cricket",
    team1: { name: "Mumbai Indians", score: "186/4", overs: "18.2" },
    team2: { name: "Chennai Kings", score: "142/3", overs: "15.0" },
    venue: "Wankhede Stadium",
    status: "LIVE",
    viewers: "2.3K",
  },
  {
    id: 2,
    sport: "Football",
    team1: { name: "Real Madrid", score: "2" },
    team2: { name: "Barcelona", score: "1" },
    venue: "Santiago Bernabéu",
    status: "LIVE",
    viewers: "5.1K",
  },
  {
    id: 3,
    sport: "Basketball",
    team1: { name: "Lakers", score: "98" },
    team2: { name: "Warriors", score: "102" },
    venue: "Chase Center",
    status: "LIVE",
    viewers: "1.8K",
  },
];

export const LiveMatches = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-live"></span>
          </span>
          Live Matches
        </h2>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          View All →
        </button>
      </div>
      
      <div className="grid gap-4">
        {matches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card variant="glow" className="p-5 cursor-pointer hover:border-primary/50 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-medium">
                    {match.sport}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-live/20 text-live text-xs font-semibold flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    {match.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {match.viewers}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{match.team1.name}</span>
                  <span className="font-display font-bold text-lg">
                    {match.team1.score}
                    {match.team1.overs && (
                      <span className="text-sm text-muted-foreground ml-1">
                        ({match.team1.overs})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{match.team2.name}</span>
                  <span className="font-display font-bold text-lg">
                    {match.team2.score}
                    {match.team2.overs && (
                      <span className="text-sm text-muted-foreground ml-1">
                        ({match.team2.overs})
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {match.venue}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
