'use client';

import { useStaffSession } from './staff-session-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, ChevronDown } from 'lucide-react';

export function StaffIndicator() {
  const { currentStaff, isAuthenticated, clockOut } = useStaffSession();

  if (!isAuthenticated || !currentStaff) {
    return null;
  }

  const handleClockOut = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter?')) {
      clockOut();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center">
            <User className="w-4 h-4 text-stone-600" />
          </div>
          <span className="text-sm font-medium">{currentStaff.staffName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <div className="text-sm font-medium">{currentStaff.staffName}</div>
          <div className="text-xs text-stone-500">
            Connecté depuis {new Date(currentStaff.clockedInAt).toLocaleTimeString('fr-CA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleClockOut} className="text-red-600 cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
