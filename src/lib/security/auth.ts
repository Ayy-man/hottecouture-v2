import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/lib/auth/roles'

export interface UserSession {
  user: {
    id: string
    email?: string
    app_role?: UserRole
  }
  role: UserRole
}

/**
 * Get the current user's session with role information
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Extract app_role from JWT claims, default to 'owner' for now
  const app_role = (user.user_metadata?.app_role as UserRole) || UserRole.OWNER

  return {
    user: {
      id: user.id,
      email: user.email,
      app_role,
    },
    role: app_role,
  }
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const session = await getCurrentUser()
  if (!session) return false

  return session.role === requiredRole
}

/**
 * Check if the current user is an owner
 */
export async function isOwner(): Promise<boolean> {
  return hasRole(UserRole.OWNER)
}

/**
 * Check if the current user can access a specific resource
 */
export async function canAccessResource(
  resource: string,
  resourceId?: string,
  additionalContext?: Record<string, any>
): Promise<boolean> {
  const session = await getCurrentUser()
  if (!session) return false

  // Owner has access to everything
  if (session.role === UserRole.OWNER) {
    return true
  }

  // Role-based access control
  switch (resource) {
    case 'client':
    case 'order':
    case 'garment':
    case 'document':
      // All authenticated users can access these
      return true

    case 'service':
    case 'price_list':
      // Read-only for non-owners
      return true

    case 'task':
      // Non-owners can only access tasks assigned to them
      if (additionalContext?.assignee) {
        return additionalContext.assignee === session.user.id
      }
      return true

    case 'event_log':
      // Only owners can read event logs
      return false

    default:
      return false
  }
}

/**
 * Get user permissions for UI rendering
 */
export async function getUserPermissions() {
  const session = await getCurrentUser()
  if (!session) {
    return {
      canViewClients: false,
      canManageClients: false,
      canViewOrders: false,
      canManageOrders: false,
      canViewGarments: false,
      canManageGarments: false,
      canViewTasks: false,
      canManageTasks: false,
      canViewServices: false,
      canManageServices: false,
      canViewPriceLists: false,
      canManagePriceLists: false,
      canViewDocuments: false,
      canManageDocuments: false,
      canViewEventLogs: false,
      canManageUsers: false,
      canViewReports: false,
      canManageSettings: false,
    }
  }

  const isOwnerRole = session.role === UserRole.OWNER

  return {
    // Client permissions
    canViewClients: true,
    canManageClients: true,

    // Order permissions
    canViewOrders: true,
    canManageOrders: true,

    // Garment permissions
    canViewGarments: true,
    canManageGarments: true,

    // Task permissions
    canViewTasks: true,
    canManageTasks: true,

    // Service permissions
    canViewServices: true,
    canManageServices: isOwnerRole,

    // Price list permissions
    canViewPriceLists: true,
    canManagePriceLists: isOwnerRole,

    // Document permissions
    canViewDocuments: true,
    canManageDocuments: true,

    // Event log permissions
    canViewEventLogs: isOwnerRole,

    // Admin permissions
    canManageUsers: isOwnerRole,
    canViewReports: isOwnerRole,
    canManageSettings: isOwnerRole,
  }
}

/**
 * Middleware helper to check permissions
 */
export async function requirePermission(
  permission: keyof Awaited<ReturnType<typeof getUserPermissions>>,
  redirectTo: string = '/auth/sign-in'
) {
  const permissions = await getUserPermissions()
  
  if (!permissions[permission]) {
    throw new Error(`Insufficient permissions: ${permission}`)
  }
}

/**
 * Get role-specific navigation items
 */
export async function getNavigationItems() {
  const permissions = await getUserPermissions()
  const session = await getCurrentUser()

  const items = [
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
      show: permissions.canViewClients,
    },
    {
      label: 'Orders',
      href: '/orders',
      icon: 'shopping-bag',
      show: permissions.canViewOrders,
    },
    {
      label: 'Garments',
      href: '/garments',
      icon: 'shirt',
      show: permissions.canViewGarments,
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: 'checklist',
      show: permissions.canViewTasks,
    },
    {
      label: 'Services',
      href: '/services',
      icon: 'settings',
      show: permissions.canViewServices,
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: 'chart-bar',
      show: permissions.canViewReports,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: 'cog',
      show: permissions.canManageSettings,
    },
  ]

  return items.filter(item => item.show)
}
