import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { StatsBar } from "@/components/StatsBar";
import { SportSelector } from "@/components/SportSelector";
import { LiveMatches } from "@/components/LiveMatches";
import { TournamentPreview } from "@/components/TournamentPreview";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navbar />
      
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <StatsBar />
      </section>

      {/* Sport Selector */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SportSelector />
      </section>

      {/* Dashboard Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-8">
          <LiveMatches />
          <TournamentPreview />
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FeaturesGrid />
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-card border border-border p-8 md:p-12 text-center"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-hero-gradient opacity-50" />
          
          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Ready to Transform Your
              <span className="text-gradient-primary"> Tournaments?</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of sports organizations already using SportSphere AI 
              to create unforgettable tournament experiences.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="hero" 
                size="xl" 
                className="group"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                {user ? 'Go to Dashboard' : 'Start Free Trial'}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="glass" size="xl" className="group">
                <Download className="w-5 h-5" />
                Install App
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">S</span>
              </div>
              <span className="font-display font-bold">SportSphere AI</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Features</a>
              <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 SportSphere AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
