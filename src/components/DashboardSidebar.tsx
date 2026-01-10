import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Trophy, Calendar, Users, Activity,
  LogOut, BarChart3, Settings, Target
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface DashboardSidebarProps {
  onSignOut: () => void;
}

const menuItems = [
  { name: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { name: 'Tournaments', icon: Trophy, path: '/tournaments' },
  { name: 'Teams', icon: Users, path: '/teams' },
  { name: 'Live Matches', icon: Activity, path: '/matches' },
  { name: 'Schedule', icon: Calendar, path: '/schedule' },
  { name: 'Analytics', icon: Target, path: '/analytics' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

const DashboardSidebar = ({ onSignOut }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-card/50 backdrop-blur-xl border-r border-border pt-5 pb-4 overflow-y-auto">
          <div
            className="flex items-center gap-3 px-4 mb-8 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_40px_-10px_hsl(199,89%,48%/0.5)]">
              <img src="/logo.png" alt="SportSphere Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-display font-bold">SportSphere</h1>
              <p className="text-[10px] text-primary font-semibold">AI POWERED</p>
            </div>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/dashboard');

              return (
                <motion.button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </motion.button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-border">
            <Button variant="ghost" className="w-full justify-start" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        confirmText="Sign Out"
        onConfirm={onSignOut}
      />
    </>
  );
};

export default DashboardSidebar;
