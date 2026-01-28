'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface StaffPinInputProps {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export function StaffPinInput({ onComplete, disabled, error }: StaffPinInputProps) {
  const [pin, setPin] = useState('');

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      onComplete(pin);
    }
  }, [pin, onComplete]);

  // Reset on error
  useEffect(() => {
    if (error) {
      setPin('');
    }
  }, [error]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !disabled) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (!disabled) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!disabled) {
      setPin('');
    }
  };

  return (
    <div className="space-y-4">
      {/* PIN dots display */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-foreground border-foreground'
                : 'bg-transparent border-border'
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            size="lg"
            onClick={() => handleDigit(digit)}
            disabled={disabled}
            className="h-14 text-xl font-semibold hover:bg-accent"
          >
            {digit}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleClear}
          disabled={disabled || pin.length === 0}
          className="h-14 text-sm hover:bg-accent"
        >
          Effacer
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => handleDigit('0')}
          disabled={disabled}
          className="h-14 text-xl font-semibold hover:bg-accent"
        >
          0
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleBackspace}
          disabled={disabled || pin.length === 0}
          className="h-14 hover:bg-accent"
        >
          <Delete className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
