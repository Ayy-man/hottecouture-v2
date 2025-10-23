'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/auth/roles';

interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  show: boolean;
  badge?: string | number;
}

interface RoleBasedNavProps {
  userRole: UserRole;
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    show: true,
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: 'users',
    show: true,
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: 'shopping-bag',
    show: true,
  },
  {
    label: 'Garments',
    href: '/garments',
    icon: 'shirt',
    show: true,
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: 'checklist',
    show: true,
  },
  {
    label: 'Services',
    href: '/services',
    icon: 'settings',
    show: true,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'chart-bar',
    show: false, // Will be filtered by role
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'cog',
    show: false, // Will be filtered by role
  },
];

const getRoleBasedItems = (role: UserRole): NavigationItem[] => {
  const isOwner = role === UserRole.OWNER;

  return navigationItems
    .map(item => ({
      ...item,
      show:
        item.show || (isOwner && ['Reports', 'Settings'].includes(item.label)),
    }))
    .filter(item => item.show);
};

const getIconComponent = (iconName: string) => {
  const iconClass = 'h-4 w-4';

  switch (iconName) {
    case 'dashboard':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z'
          />
        </svg>
      );
    case 'users':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
          />
        </svg>
      );
    case 'shopping-bag':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
          />
        </svg>
      );
    case 'shirt':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
          />
        </svg>
      );
    case 'checklist':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
          />
        </svg>
      );
    case 'settings':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      );
    case 'chart-bar':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      );
    case 'cog':
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      );
    default:
      return (
        <svg
          className={iconClass}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
      );
  }
};

export function RoleBasedNav({ userRole, className }: RoleBasedNavProps) {
  const pathname = usePathname();
  const items = getRoleBasedItems(userRole);

  return (
    <nav className={cn('space-y-1', className)}>
      {items.map(item => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-text hover:bg-accent'
            )}
          >
            <span className='mr-3 flex-shrink-0'>
              {getIconComponent(item.icon)}
            </span>
            <span className='flex-1'>{item.label}</span>
            {item.badge && (
              <span className='ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary'>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
