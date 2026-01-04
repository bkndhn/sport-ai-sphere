import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  Trophy, 
  Menu, 
  Bell, 
  User,
  Sparkles,
  LogOut
} from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(199,89%,48%)] to-[hsl(160,84%,39%)] flex items-center justify-center shadow-[0_0_40px_-10px_hsl(199,89%,48%/0.5)]">
                <Trophy className="w-5 h-5 text-[hsl(222,47%,6%)]" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-energy animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">SportSphere</h1>
              <p className="text-[10px] text-primary font-semibold -mt-0.5">AI POWERED</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/live-scoring')}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Live Scoring
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-live rounded-full" />
                </Button>
                <Button variant="glass" size="icon" className="hidden sm:flex" onClick={() => navigate('/dashboard')}>
                  <User className="w-5 h-5" />
                </Button>
                <Button variant="hero" className="hidden sm:flex" onClick={() => navigate('/create-tournament')}>
                  Create Tournament
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden sm:flex">
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="glass" className="hidden sm:flex" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="hero" className="hidden sm:flex" onClick={() => navigate('/auth')}>
                  Get Started
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
        >
          <div className="px-4 py-4 space-y-2">
            <button
              onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => { navigate('/live-scoring'); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Live Scoring
            </button>
            {user ? (
              <>
                <Button variant="hero" className="w-full mt-4" onClick={() => navigate('/create-tournament')}>
                  Create Tournament
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="hero" className="w-full mt-4" onClick={() => navigate('/auth')}>
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};
