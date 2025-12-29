'use client';

import { useState } from 'react';
import { useStaffSession } from './staff-session-provider';
import { StaffPinInput } from './staff-pin-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Loader2 } from 'lucide-react';

export function StaffPinModal() {
  // We no longer need to fetch the staff list since we log in by PIN directly
  const { isAuthenticated, isLoading: sessionLoading, loginByPin } = useStaffSession();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if already authenticated or still loading
  if (sessionLoading || isAuthenticated) {
    return null;
  }

  const handlePinComplete = async (pin: string) => {
    setVerifying(true);
    setError(null);

    try {
      const success = await loginByPin(pin);
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm bg-white shadow-2xl border-0 ring-1 ring-black/5">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
              <User className="w-6 h-6" />
            </div>
            Connexion du personnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-center text-sm text-muted-foreground">
              Entrez votre NIP à 4 chiffres pour vous connecter
            </p>

            <StaffPinInput
              onComplete={handlePinComplete}
              disabled={verifying}
              error={error}
            />

            {verifying && (
              <div className="flex justify-center items-center gap-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Vérification...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
