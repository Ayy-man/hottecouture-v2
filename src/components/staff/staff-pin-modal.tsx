'use client';

import { useState } from 'react';
import { useStaff, StaffMember } from '@/lib/hooks/useStaff';
import { useStaffSession } from './staff-session-provider';
import { StaffPinInput } from './staff-pin-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowLeft, Loader2 } from 'lucide-react';

export function StaffPinModal() {
  const { staff, loading: staffLoading } = useStaff();
  const { isAuthenticated, isLoading: sessionLoading, clockIn } = useStaffSession();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if already authenticated or still loading
  if (sessionLoading || isAuthenticated) {
    return null;
  }

  const handleStaffSelect = (member: StaffMember) => {
    setSelectedStaff(member);
    setError(null);
  };

  const handleBack = () => {
    setSelectedStaff(null);
    setError(null);
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedStaff) return;

    setVerifying(true);
    setError(null);

    try {
      const success = await clockIn(selectedStaff.id, selectedStaff.name, pin);
      if (!success) {
        setError('NIP incorrect. Veuillez réessayer.');
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {selectedStaff ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="absolute left-4"
                  disabled={verifying}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <User className="w-5 h-5" />
                {selectedStaff.name}
              </div>
            ) : (
              'Connexion du personnel'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staffLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          ) : selectedStaff ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-stone-600">
                Entrez votre NIP à 4 chiffres
              </p>
              <StaffPinInput
                onComplete={handlePinComplete}
                disabled={verifying}
                error={error}
              />
              {verifying && (
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm text-stone-600 mb-4">
                Sélectionnez votre nom
              </p>
              {staff.length === 0 ? (
                <p className="text-center text-sm text-stone-400">
                  Aucun personnel disponible
                </p>
              ) : (
                staff.map((member) => (
                  <Button
                    key={member.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => handleStaffSelect(member)}
                  >
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-stone-600" />
                    </div>
                    <span className="text-base">{member.name}</span>
                  </Button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
