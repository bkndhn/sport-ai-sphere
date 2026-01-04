import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Trophy, ArrowLeft, ArrowRight, Check, 
  Target, Dribbble, CircleDot, Volleyball,
  Swords, Gamepad2, Calendar, MapPin, Users, Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const sports = [
  { id: 'cricket', name: 'Cricket', icon: Target },
  { id: 'football', name: 'Football', icon: Dribbble },
  { id: 'basketball', name: 'Basketball', icon: CircleDot },
  { id: 'volleyball', name: 'Volleyball', icon: Volleyball },
  { id: 'badminton', name: 'Badminton', icon: Swords },
  { id: 'esports', name: 'Esports', icon: Gamepad2 },
];

const formats = [
  { id: 'knockout', name: 'Knockout', description: 'Single elimination tournament' },
  { id: 'league', name: 'League', description: 'Round-robin where everyone plays everyone' },
  { id: 'round_robin', name: 'Round Robin', description: 'All teams play against each other' },
  { id: 'group_knockout', name: 'Group + Knockout', description: 'Group stage followed by knockouts' },
];

const CreateTournament = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sport: '',
    format: 'knockout',
    startDate: '',
    endDate: '',
    venue: '',
    maxTeams: 8,
    prizePool: '',
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Please sign in to create a tournament' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description,
          sport: formData.sport as any,
          format: formData.format as any,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          venue: formData.venue,
          max_teams: formData.maxTeams,
          prize_pool: formData.prizePool,
          organizer_id: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Tournament created!', description: 'Your tournament has been created successfully.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating tournament',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.sport !== '';
    if (step === 2) return formData.format !== '';
    if (step === 3) return formData.name.trim() !== '';
    return true;
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={prevStep}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold">Create Tournament</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 4</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-gradient-to-r from-primary to-accent' : 'bg-secondary'
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Select Sport
                  </CardTitle>
                  <CardDescription>Choose the sport for your tournament</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sports.map((sport) => (
                      <button
                        key={sport.id}
                        onClick={() => updateFormData('sport', sport.id)}
                        className={`p-4 rounded-xl border transition-all ${
                          formData.sport === sport.id
                            ? 'border-primary bg-primary/10 shadow-glow'
                            : 'border-border hover:border-primary/50 bg-secondary/30'
                        }`}
                      >
                        <sport.icon className={`w-8 h-8 mx-auto mb-2 ${
                          formData.sport === sport.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <p className="font-medium text-sm">{sport.name}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Tournament Format
                  </CardTitle>
                  <CardDescription>Select how teams will compete</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {formats.map((format) => (
                      <button
                        key={format.id}
                        onClick={() => updateFormData('format', format.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          formData.format === format.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-secondary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{format.name}</p>
                            <p className="text-sm text-muted-foreground">{format.description}</p>
                          </div>
                          {formData.format === format.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Tournament Details
                  </CardTitle>
                  <CardDescription>Enter basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name *</Label>
                    <Input
                      id="name"
                      placeholder="Summer Cricket League 2024"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="A brief description of your tournament"
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateFormData('startDate', e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateFormData('endDate', e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card variant="gradient">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Final Details
                  </CardTitle>
                  <CardDescription>Configure teams and prizes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Venue
                    </Label>
                    <Input
                      id="venue"
                      placeholder="Stadium or location name"
                      value={formData.venue}
                      onChange={(e) => updateFormData('venue', e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTeams">
                      <Users className="w-4 h-4 inline mr-1" />
                      Maximum Teams
                    </Label>
                    <Input
                      id="maxTeams"
                      type="number"
                      min={2}
                      max={64}
                      value={formData.maxTeams}
                      onChange={(e) => updateFormData('maxTeams', parseInt(e.target.value))}
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prizePool">
                      <Award className="w-4 h-4 inline mr-1" />
                      Prize Pool
                    </Label>
                    <Input
                      id="prizePool"
                      placeholder="$10,000"
                      value={formData.prizePool}
                      onChange={(e) => updateFormData('prizePool', e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
                    <h4 className="font-semibold mb-3">Tournament Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sport</span>
                        <span className="capitalize">{formData.sport}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format</span>
                        <span className="capitalize">{formData.format.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teams</span>
                        <span>{formData.maxTeams}</span>
                      </div>
                      {formData.prizePool && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prize Pool</span>
                          <span className="text-energy font-semibold">{formData.prizePool}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={prevStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={nextStep}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              'Creating...'
            ) : step === 4 ? (
              <>
                Create Tournament
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;
