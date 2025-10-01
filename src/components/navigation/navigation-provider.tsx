'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth/roles'
import { getCurrentUser, getUserPermissions } from '@/lib/security/auth'

interface NavigationContextType {
  userRole: UserRole | null
  permissions: Record<string, boolean> | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const session = await getCurrentUser()
      if (session) {
        setUserRole(session.role)
        const userPermissions = await getUserPermissions()
        setPermissions(userPermissions)
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
    } = supabase.auth.onAuthStateChange((event, session) => {
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
