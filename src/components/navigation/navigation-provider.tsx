'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth/roles'

interface NavigationContextType {
  userRole: UserRole | null
  permissions: Record<string, boolean> | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

// Client-side user permissions helper
function getClientPermissions(userRole: UserRole | null): Record<string, boolean> {
  if (!userRole) {
    return {
      canViewClients: false,
      canManageOrders: false,
      canManageTasks: false,
      canViewReports: false,
      canManageUsers: false,
    }
  }

  const isOwner = userRole === UserRole.OWNER
  const isSeamstress = userRole === UserRole.SEAMSTRESS
  const isClerk = userRole === UserRole.CLERK

  return {
    canViewClients: isOwner || isClerk,
    canManageOrders: isOwner || isClerk,
    canManageTasks: isOwner || isSeamstress,
    canViewReports: isOwner,
    canManageUsers: isOwner,
  }
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Extract app_role from user metadata or default to OWNER
        const appRole = (user.user_metadata?.app_role as UserRole) || UserRole.OWNER
        setUserRole(appRole)
        setPermissions(getClientPermissions(appRole))
      } else {
        setUserRole(null)
        setPermissions(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUserRole(null)
      setPermissions(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()

    // Listen for auth state changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        refreshUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <NavigationContext.Provider
      value={{
        userRole,
        permissions,
        isLoading,
        refreshUser,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
