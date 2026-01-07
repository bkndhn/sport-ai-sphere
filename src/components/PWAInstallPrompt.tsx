import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Monitor, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if dismissed recently
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        setDismissed(true);
        return;
      }
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 3 seconds of page visit
      setTimeout(() => {
        if (!isInStandaloneMode) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show after delay
    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if installed or dismissed
  if (isStandalone || dismissed) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-md"
        >
          <Card variant="glow" className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-4 relative">
                <button
                  onClick={handleDismiss}
                  className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-background/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                    <Download className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">Install SportSphere</h3>
                    <p className="text-sm text-muted-foreground">Get the full app experience</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {isIOS ? (
                  // iOS installation instructions
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Install this app on your iPhone for quick access and offline use:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Share className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">1.</span> Tap the Share button in Safari
                        </p>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">2.</span> Scroll down and tap "Add to Home Screen"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Smartphone className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">3.</span> Tap "Add" to install the app
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full" onClick={handleDismiss}>
                      Got it
                    </Button>
                  </div>
                ) : (
                  // Android/Desktop installation
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Smartphone className="w-4 h-4" />
                        <span>Mobile</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Monitor className="w-4 h-4" />
                        <span>Desktop</span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Instant access from your home screen
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        Works offline for live scoring
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-energy" />
                        Fast, app-like experience
                      </li>
                    </ul>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1" onClick={handleDismiss}>
                        Not now
                      </Button>
                      <Button variant="hero" className="flex-1" onClick={handleInstall}>
                        <Download className="w-4 h-4 mr-2" />
                        Install
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
