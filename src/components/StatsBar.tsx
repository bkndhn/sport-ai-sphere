import { motion } from "framer-motion";
import { Activity, Trophy, Users, Zap } from "lucide-react";

const stats = [
  { label: "Active Tournaments", value: "2,847", icon: Trophy, color: "text-primary" },
  { label: "Live Matches", value: "156", icon: Activity, color: "text-live" },
  { label: "Total Players", value: "1.2M+", icon: Users, color: "text-accent" },
  { label: "AI Predictions", value: "98.5%", icon: Zap, color: "text-energy" },
];

export const StatsBar = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
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
