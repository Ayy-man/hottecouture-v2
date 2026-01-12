'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Square } from 'lucide-react';

interface ActiveTaskInfo {
  garmentId: string;
  garmentType: string;
  orderId: string;
  orderNumber: number | null;
}

interface OneTaskWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTask: ActiveTaskInfo;
  onStopCurrentTask: () => Promise<void>;
}

export function OneTaskWarningModal({
  isOpen,
  onClose,
  activeTask,
  onStopCurrentTask,
}: OneTaskWarningModalProps) {
  const [stopping, setStopping] = useState(false);

  const handleStopTask = async () => {
    setStopping(true);
    try {
      await onStopCurrentTask();
      onClose();
    } catch (err) {
      console.error('Failed to stop task:', err);
    } finally {
      setStopping(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-4">
        {/* Warning icon and title */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold">Tâche active en cours</h3>
        </div>

        {/* Current task info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Vous travaillez déjà sur:
          </p>
          <div className="font-medium">
            {activeTask.orderNumber ? (
              <span>Commande #{activeTask.orderNumber}</span>
            ) : (
              <span>Commande</span>
            )}
            {' - '}
            <span>{activeTask.garmentType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Minuteur en cours</span>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground text-center">
          Vous devez terminer cette tâche avant d&apos;en commencer une autre.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={stopping}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleStopTask}
            disabled={stopping}
          >
            <Square className="w-4 h-4 mr-2" />
            {stopping ? 'Arrêt...' : 'Arrêter la tâche'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
