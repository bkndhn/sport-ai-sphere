import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateTournament from "./pages/CreateTournament";
import LiveScoring from "./pages/LiveScoring";
import Teams from "./pages/Teams";
import PlayerAnalytics from "./pages/PlayerAnalytics";
import MatchSchedule from "./pages/MatchSchedule";
import SpectatorView from "./pages/SpectatorView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-tournament" element={<CreateTournament />} />
            <Route path="/live-scoring" element={<LiveScoring />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/analytics" element={<PlayerAnalytics />} />
            <Route path="/schedule" element={<MatchSchedule />} />
            <Route path="/spectator" element={<SpectatorView />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
