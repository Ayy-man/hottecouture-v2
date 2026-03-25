'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ClipboardList, Users, Calendar, MessageCircle, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffSession } from '@/components/staff';
import { useTranslations } from 'next-intl';

const navItems = [
  { href: '/board', icon: Home, labelKey: 'board' as const },
  { href: '/intake', icon: ClipboardList, labelKey: 'intake' as const },
  { href: '/clients', icon: Users, labelKey: 'clients' as const },
  { href: '/calendar', icon: Calendar, labelKey: 'calendar' as const },
  { href: '/chat', icon: MessageCircle, labelKey: 'chat' as const },
  { href: '/admin/team', icon: UserCog, labelKey: 'team' as const },
];

// Paths accessible to seamstress role (Board + Calendar only)
const SEAMSTRESS_NAV = ['/board', '/calendar'];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { currentStaff } = useStaffSession();
  const t = useTranslations('navigation');
  const isSeamstress = currentStaff?.staffRole === 'seamstress';

  // Filter nav items based on role. When currentStaff is null (not logged in),
  // show all items — AuthGuard handles unauthenticated access separately.
  const visibleItems = isSeamstress
    ? navItems.filter(item => SEAMSTRESS_NAV.includes(item.href))
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom print:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 min-h-[44px]",
                "text-xs font-medium transition-colors touch-manipulation",
                isActive
                  ? "text-primary-600"
                  : "text-muted-foreground hover:text-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-1", isActive && "text-primary-600")} />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
