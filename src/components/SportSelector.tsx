import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";

interface SportCount {
  sport: string;
  count: number;
}

const sportConfig = [
  { id: "cricket", name: "Cricket", icon: Target, color: "from-primary to-accent" },
  { id: "football", name: "Football", icon: Dribbble, color: "from-accent to-success" },
  { id: "basketball", name: "Basketball", icon: CircleDot, color: "from-energy to-warning" },
  { id: "volleyball", name: "Volleyball", icon: Volleyball, color: "from-primary to-energy" },
  { id: "badminton", name: "Badminton", icon: Swords, color: "from-warning to-energy" },
  { id: "esports", name: "Esports", icon: Gamepad2, color: "from-accent to-primary" },
  { id: "athletics", name: "Athletics", icon: Bike, color: "from-success to-accent" },
  { id: "kabaddi", name: "Kabaddi", icon: Footprints, color: "from-energy to-live" },
];

export const SportSelector = () => {
  const navigate = useNavigate();
  const [sportCounts, setSportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSportCounts();
  }, []);

  const fetchSportCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('sport');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(t => {
        counts[t.sport] = (counts[t.sport] || 0) + 1;
      });
      setSportCounts(counts);
    } catch (error) {
      console.error('Error fetching sport counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSportClick = (sportId: string) => {
    navigate(`/tournaments?sport=${sportId}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold">Explore Sports</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {sportConfig.map((sport, index) => (
          <motion.button
            key={sport.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSportClick(sport.id)}
            className="group relative p-4 rounded-2xl bg-gradient-card border border-border/50 hover:border-primary/50 transition-all duration-300"
          >
            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${sport.color} p-2.5 flex items-center justify-center group-hover:shadow-glow transition-shadow`}>
              <sport.icon className="w-full h-full text-primary-foreground" />
            </div>
            <p className="font-semibold text-sm">{sport.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "..." : `${sportCounts[sport.id] || 0} tournaments`}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
