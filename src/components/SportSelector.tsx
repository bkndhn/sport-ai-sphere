import { motion } from "framer-motion";
import { 
  Dribbble, 
  Target, 
  Volleyball, 
  Swords,
  CircleDot,
  Gamepad2,
  Bike,
  Footprints
} from "lucide-react";

const sports = [
  { name: "Cricket", icon: Target, color: "from-primary to-accent", matches: 847 },
  { name: "Football", icon: Dribbble, color: "from-accent to-success", matches: 623 },
  { name: "Basketball", icon: CircleDot, color: "from-energy to-warning", matches: 412 },
  { name: "Volleyball", icon: Volleyball, color: "from-primary to-energy", matches: 289 },
  { name: "Badminton", icon: Swords, color: "from-warning to-energy", matches: 198 },
  { name: "Esports", icon: Gamepad2, color: "from-accent to-primary", matches: 156 },
  { name: "Athletics", icon: Bike, color: "from-success to-accent", matches: 134 },
  { name: "Kabaddi", icon: Footprints, color: "from-energy to-live", matches: 88 },
];

export const SportSelector = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold">Explore Sports</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {sports.map((sport, index) => (
          <motion.button
            key={sport.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group relative p-4 rounded-2xl bg-gradient-card border border-border/50 hover:border-primary/50 transition-all duration-300"
          >
            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${sport.color} p-2.5 flex items-center justify-center group-hover:shadow-glow transition-shadow`}>
              <sport.icon className="w-full h-full text-primary-foreground" />
            </div>
            <p className="font-semibold text-sm">{sport.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sport.matches} active</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
