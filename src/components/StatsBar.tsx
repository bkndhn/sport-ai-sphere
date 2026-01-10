import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Trophy, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const StatsBar = () => {
  const [stats, setStats] = useState({
    tournaments: 0,
    liveMatches: 0,
    totalPlayers: 0,
    completedMatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [tournamentsRes, matchesRes, playersRes] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id, status'),
        supabase.from('players').select('id', { count: 'exact', head: true }),
      ]);

      const liveMatches = matchesRes.data?.filter(m => m.status === 'live').length || 0;
      const completedMatches = matchesRes.data?.filter(m => m.status === 'completed').length || 0;

      setStats({
        tournaments: tournamentsRes.count || 0,
        liveMatches,
        totalPlayers: playersRes.count || 0,
        completedMatches,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { label: "Active Tournaments", value: loading ? "..." : stats.tournaments.toString(), icon: Trophy, color: "text-primary" },
    { label: "Live Matches", value: loading ? "..." : stats.liveMatches.toString(), icon: Activity, color: "text-live" },
    { label: "Total Players", value: loading ? "..." : stats.totalPlayers.toString(), icon: Users, color: "text-accent" },
    { label: "Completed Matches", value: loading ? "..." : stats.completedMatches.toString(), icon: Zap, color: "text-energy" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-gradient-card border border-border/50"
        >
          <div className={`p-2.5 rounded-xl bg-secondary ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
