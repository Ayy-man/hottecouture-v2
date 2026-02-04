'use client'

import { ReactNode } from 'react'
import { UserRole } from '@/lib/auth/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RoleGateProps {
  children: ReactNode
  allowedRoles: UserRole[]
  userRole: UserRole
  fallback?: ReactNode
  showAccessDenied?: boolean
}

export function RoleGate({
  children,
  allowedRoles,
  userRole,
  fallback,
  showAccessDenied = true,
}: RoleGateProps) {
  const hasAccess = allowedRoles.includes(userRole)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showAccessDenied) {
    return null
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Access Denied</CardTitle>
        <CardDescription>
          You don't have permission to access this content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Required roles: {allowedRoles.join(', ')}
        </p>
        <p className="text-sm text-muted-foreground">
          Your role: {userRole}
        </p>
      </CardContent>
    </Card>
  )
}

interface PermissionGateProps {
  children: ReactNode
  permission: string
  userPermissions: Record<string, boolean>
  fallback?: ReactNode
  showAccessDenied?: boolean
}

export function PermissionGate({
  children,
  permission,
  userPermissions,
  fallback,
  showAccessDenied = true,
}: PermissionGateProps) {
  const hasPermission = userPermissions[permission] === true

  if (hasPermission) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showAccessDenied) {
    return null
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Access Denied</CardTitle>
        <CardDescription>
          You don't have permission to access this content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Required permission: {permission}
        </p>
      </CardContent>
    </Card>
  )
}

interface ConditionalRenderProps {
  children: ReactNode
  condition: boolean
  fallback?: ReactNode
}

export function ConditionalRender({
  children,
  condition,
  fallback,
}: ConditionalRenderProps) {
  if (condition) {
    return <>{children}</>
  }

  return fallback ? <>{fallback}</> : null
}

// Higher-order component for role-based rendering
export function withRoleGate<T extends object>(
  Component: React.ComponentType<T>,
  allowedRoles: UserRole[],
  fallback?: ReactNode
) {
  return function RoleGatedComponent(props: T & { userRole: UserRole }) {
    const { userRole, ...componentProps } = props

    return (
      <RoleGate
        allowedRoles={allowedRoles}
        userRole={userRole}
        fallback={fallback}
      >
        <Component {...(componentProps as T)} />
      </RoleGate>
    )
  }
}

// Hook for checking permissions
export function usePermissions(userPermissions: Record<string, boolean>) {
  return {
    can: (permission: string) => userPermissions[permission] === true,
    canAny: (permissions: string[]) => 
      permissions.some(permission => userPermissions[permission] === true),
    canAll: (permissions: string[]) => 
      permissions.every(permission => userPermissions[permission] === true),
  }
}

// Hook for checking roles
export function useRoleCheck(userRole: UserRole) {
  return {
    isOwner: userRole === UserRole.OWNER,
    isSeamstress: userRole === UserRole.SEAMSTRESS,
    isCustom: userRole === UserRole.CUSTOM,
    isClerk: userRole === UserRole.CLERK,
    hasRole: (role: UserRole) => userRole === role,
    hasAnyRole: (roles: UserRole[]) => roles.includes(userRole),
  }
}
