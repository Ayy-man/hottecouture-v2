'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
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

// Icon components cache - created once at module level
const iconComponents = {
  dashboard: (className: string) => (
    <svg
      className={className}
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
  ),
  users: (className: string) => (
    <svg
      className={className}
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
  ),
  'shopping-bag': (className: string) => (
    <svg
      className={className}
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
  ),
  clipboard: (className: string) => (
    <svg
      className={className}
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L12.414 13H16v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5z'
      />
    </svg>
  ),
  settings: (className: string) => (
    <svg
      className={className}
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
  ),
  camera: (className: string) => (
    <svg
      className={className}
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'
      />
    </svg>
  ),
  tag: (className: string) => (
    <svg
      className={className}
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
      />
    </svg>
  ),
  fileText: (className: string) => (
    <svg
      className={className}
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
  ),
  shirt: (className: string) => (
    <svg
      className={className}
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
  ),
  checklist: (className: string) => (
    <svg
      className={className}
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
  ),
  clock: (className: string) => (
    <svg
      className={className}
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
      />
    </svg>
  ),
  calendar: (className: string) => (
    <svg
      className={className}
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
      />
    </svg>
  ),
} as const;

// Optimized icon component with memoization
const getIconComponent = (iconName: string) => {
  const iconClass = 'h-4 w-4';
  const iconRenderer = iconComponents[iconName as keyof typeof iconComponents];
  return iconRenderer ? iconRenderer(iconClass) : iconComponents.fileText(iconClass);
};

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

export function RoleBasedNav({ userRole, className }: RoleBasedNavProps) {
  const pathname = usePathname();

  // Memoize navigation items based on user role
  const items = useMemo(() => getRoleBasedItems(userRole), [userRole]);

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
