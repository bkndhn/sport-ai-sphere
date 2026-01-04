import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Users, Award } from "lucide-react";

const tournaments = [
  {
    id: 1,
    name: "Summer Premier League",
    sport: "Cricket",
    teams: 16,
    status: "Active",
    progress: 68,
    matches: "24/36",
    prize: "$50,000",
  },
  {
    id: 2,
    name: "City Football Championship",
    sport: "Football",
    teams: 12,
    status: "Active",
    progress: 45,
    matches: "18/40",
    prize: "$25,000",
  },
  {
    id: 3,
    name: "Pro Basketball Series",
    sport: "Basketball",
    teams: 8,
    status: "Registration",
    progress: 0,
    matches: "0/28",
    prize: "$15,000",
  },
];

export const TournamentPreview = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Your Tournaments</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Manage All →
        </button>
      </div>

      <div className="grid gap-4">
        {tournaments.map((tournament, index) => (
          <motion.div
            key={tournament.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card variant="gradient" className="p-5 cursor-pointer hover:border-primary/30 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{tournament.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      tournament.status === "Active" 
                        ? "bg-accent/20 text-accent" 
                        : "bg-warning/20 text-warning"
                    }`}>
                      {tournament.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tournament.sport}</p>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{tournament.teams} Teams</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{tournament.matches} Matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-energy" />
                    <span className="text-sm font-semibold text-energy">{tournament.prize}</span>
                  </div>
                </div>
              </div>

              {tournament.progress > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{tournament.progress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tournament.progress}%` }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className="h-full bg-gradient-primary rounded-full"
                    />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
