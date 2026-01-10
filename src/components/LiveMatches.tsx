import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Users, MapPin, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Match {
  id: string;
  status: string;
  venue: string | null;
  scheduled_at: string | null;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  team1_score: any;
  team2_score: any;
  tournament: { name: string; sport: string };
}

export const LiveMatches = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          venue,
          scheduled_at,
          team1_score,
          team2_score,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name),
          tournament:tournaments(name, sport)
        `)
        .in('status', ['live', 'scheduled'])
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (error) throw error;
      setMatches(data as any || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: any, sport: string) => {
    if (!score) return '-';
    if (sport === 'cricket') {
      return `${score.runs || 0}/${score.wickets || 0}`;
    }
    return score.score?.toString() || '-';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold">Live & Upcoming Matches</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-live"></span>
          </span>
          Live & Upcoming Matches
        </h2>
        <button 
          onClick={() => navigate('/matches')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View All →
        </button>
      </div>
      
      {matches.length === 0 ? (
        <Card variant="gradient" className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No live or upcoming matches</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Schedule matches in your tournaments</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card 
                variant="glow" 
                className="p-5 cursor-pointer hover:border-primary/50 group"
                onClick={() => navigate(`/live-scoring?match=${match.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-medium capitalize">
                      {match.tournament?.sport || 'Cricket'}
                    </span>
                    {match.status === 'live' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-live/20 text-live text-xs font-semibold flex items-center gap-1">
                        <Play className="w-3 h-3 fill-current" />
                        LIVE
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-medium text-muted-foreground">
                        {formatDate(match.scheduled_at)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {match.tournament?.name}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{match.team1?.name || 'Team A'}</span>
                    <span className="font-display font-bold text-lg">
                      {formatScore(match.team1_score, match.tournament?.sport || 'cricket')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{match.team2?.name || 'Team B'}</span>
                    <span className="font-display font-bold text-lg">
                      {formatScore(match.team2_score, match.tournament?.sport || 'cricket')}
                    </span>
                  </div>
                </div>
                
                {match.venue && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {match.venue}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
