import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Brain, 
  Calendar, 
  BarChart3, 
  Shield, 
  Globe, 
  Smartphone,
  Mic,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Match Intelligence",
    description: "Real-time win probability, player impact scores, and momentum analysis powered by advanced ML models.",
    color: "from-primary to-accent",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI-optimized tournament scheduling with conflict detection, weather awareness, and venue management.",
    color: "from-accent to-success",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Ball-by-ball analysis, wagon wheels, pitch maps, and comprehensive player statistics.",
    color: "from-energy to-warning",
  },
  {
    icon: Mic,
    title: "AI Commentary",
    description: "Auto-generated match commentary, highlights, and social media captions in multiple languages.",
    color: "from-primary to-energy",
  },
  {
    icon: Shield,
    title: "Integrity Protection",
    description: "AI-powered suspicious pattern detection to ensure fair play and match integrity.",
    color: "from-warning to-live",
  },
  {
    icon: Globe,
    title: "Multi-Sport Engine",
    description: "Support for 10+ sports with customizable rules, scoring systems, and tournament formats.",
    color: "from-success to-primary",
  },
  {
    icon: Smartphone,
    title: "PWA Ready",
    description: "Install on any device, work offline, receive push notifications, and enjoy app-like experience.",
    color: "from-accent to-energy",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description: "Live scores, instant notifications, and seamless synchronization across all devices.",
    color: "from-energy to-primary",
  },
];

export const FeaturesGrid = () => {
  return (
    <div className="py-20">
      <div className="text-center mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-3xl sm:text-4xl font-bold mb-4"
        >
          Powerful Features for
          <span className="text-gradient-primary"> Every Sport</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground max-w-2xl mx-auto"
        >
          From grassroots leagues to professional championships, SportSphere AI has everything you need.
        </motion.p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="gradient" className="h-full group hover:border-primary/30">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-2.5 flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow`}>
                  <feature.icon className="w-full h-full text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
