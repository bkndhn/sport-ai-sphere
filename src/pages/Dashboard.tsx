import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, Plus, Calendar, Users, Activity, 
  LogOut, Menu, X, Target, BarChart3, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  sport: string;
  status: string;
  format: string;
  start_date: string | null;
  max_teams: number;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTournaments();
    }
  }, [user]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching tournaments',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Tournaments', value: tournaments.length, icon: Trophy, color: 'text-primary' },
    { label: 'Active', value: tournaments.filter(t => t.status === 'active').length, icon: Activity, color: 'text-accent' },
    { label: 'Upcoming', value: tournaments.filter(t => t.status === 'registration').length, icon: Calendar, color: 'text-energy' },
    { label: 'Completed', value: tournaments.filter(t => t.status === 'completed').length, icon: Target, color: 'text-success' },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-card/50 backdrop-blur-xl border-r border-border pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold">SportSphere</h1>
              <p className="text-[10px] text-primary font-semibold">AI POWERED</p>
            </div>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            {[
              { name: 'Dashboard', icon: BarChart3, active: true },
              { name: 'Tournaments', icon: Trophy },
              { name: 'Teams', icon: Users },
              { name: 'Live Matches', icon: Activity },
              { name: 'Settings', icon: Settings },
            ].map((item) => (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-border">
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">SportSphere</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 py-4 border-t border-border bg-background"
          >
            <nav className="space-y-2">
              {['Dashboard', 'Tournaments', 'Teams', 'Live Matches', 'Settings'].map((item) => (
                <button
                  key={item}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  {item}
                </button>
              ))}
              <Button variant="ghost" className="w-full justify-start mt-4" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </nav>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">
                Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-1">Manage your tournaments and track live matches</p>
            </div>
            <Button variant="hero" className="mt-4 sm:mt-0" onClick={() => navigate('/create-tournament')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="gradient" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tournaments List */}
          <Card variant="gradient">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Tournaments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/create-tournament')}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No tournaments yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first tournament to get started
                  </p>
                  <Button variant="hero" onClick={() => navigate('/create-tournament')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tournament
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tournaments.map((tournament) => (
                    <motion.div
                      key={tournament.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <h4 className="font-semibold">{tournament.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {tournament.sport} • {tournament.format} • {tournament.max_teams} teams
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tournament.status === 'active' 
                          ? 'bg-accent/20 text-accent' 
                          : tournament.status === 'registration'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {tournament.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
