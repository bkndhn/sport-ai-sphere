import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
}

interface DismissalDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dismissal: DismissalDetails) => void;
  batters: Player[];
  fielders: Player[];
  currentBowler: Player | null;
  striker: Player | null;
}

export interface DismissalDetails {
  type: string;
  dismissedBatter: Player;
  bowler: Player | null;
  fielder: Player | null;
}

const dismissalTypes = [
  { id: 'bowled', name: 'Bowled', needsFielder: false, needsBowler: true },
  { id: 'caught', name: 'Caught', needsFielder: true, needsBowler: true },
  { id: 'lbw', name: 'LBW', needsFielder: false, needsBowler: true },
  { id: 'run_out', name: 'Run Out', needsFielder: true, needsBowler: false },
  { id: 'stumped', name: 'Stumped', needsFielder: true, needsBowler: true },
  { id: 'hit_wicket', name: 'Hit Wicket', needsFielder: false, needsBowler: true },
  { id: 'caught_behind', name: 'Caught Behind', needsFielder: true, needsBowler: true },
  { id: 'retired_hurt', name: 'Retired Hurt', needsFielder: false, needsBowler: false },
];

const DismissalDialog = ({
  open,
  onClose,
  onConfirm,
  batters,
  fielders,
  currentBowler,
  striker,
}: DismissalDialogProps) => {
  const [dismissalType, setDismissalType] = useState<string>('');
  const [dismissedBatterId, setDismissedBatterId] = useState<string>(striker?.id || '');
  const [fielderId, setFielderId] = useState<string>('');

  const selectedType = dismissalTypes.find(d => d.id === dismissalType);

  const handleConfirm = () => {
    const dismissedBatter = batters.find(b => b.id === dismissedBatterId);
    const fielder = fielders.find(f => f.id === fielderId);
    
    if (!dismissedBatter || !dismissalType) return;

    onConfirm({
      type: dismissalType,
      dismissedBatter,
      bowler: selectedType?.needsBowler ? currentBowler : null,
      fielder: selectedType?.needsFielder ? fielder || null : null,
    });

    // Reset
    setDismissalType('');
    setDismissedBatterId('');
    setFielderId('');
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-destructive">Wicket!</DialogTitle>
          <DialogDescription>Select dismissal details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Dismissal Type */}
          <div className="space-y-2">
            <Label>Dismissal Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {dismissalTypes.map((type) => (
                <Button
                  key={type.id}
                  variant={dismissalType === type.id ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setDismissalType(type.id)}
                  className="justify-start"
                >
                  {type.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Dismissed Batter */}
          <div className="space-y-2">
            <Label>Batter Out</Label>
            <Select value={dismissedBatterId} onValueChange={setDismissedBatterId}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select batter" />
              </SelectTrigger>
              <SelectContent>
                {batters.map(batter => (
                  <SelectItem key={batter.id} value={batter.id}>
                    {batter.name} {batter.jersey_number ? `#${batter.jersey_number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fielder (if needed) */}
          {selectedType?.needsFielder && (
            <div className="space-y-2">
              <Label>Fielder/Catcher</Label>
              <Select value={fielderId} onValueChange={setFielderId}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select fielder" />
                </SelectTrigger>
                <SelectContent>
                  {fielders.map(fielder => (
                    <SelectItem key={fielder.id} value={fielder.id}>
                      {fielder.name} {fielder.jersey_number ? `#${fielder.jersey_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary */}
          {dismissalType && dismissedBatterId && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm">
                <strong>{batters.find(b => b.id === dismissedBatterId)?.name}</strong>
                {' '}{dismissalTypes.find(d => d.id === dismissalType)?.name.toLowerCase()}
                {selectedType?.needsBowler && currentBowler && (
                  <> b {currentBowler.name}</>
                )}
                {selectedType?.needsFielder && fielderId && (
                  <> c {fielders.find(f => f.id === fielderId)?.name}</>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirm}
              disabled={!dismissalType || !dismissedBatterId}
            >
              Confirm Wicket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DismissalDialog;
