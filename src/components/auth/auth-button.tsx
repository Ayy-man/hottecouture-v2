'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from './auth-provider'
import { LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AuthButton() {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="w-20 h-8 bg-muted rounded animate-pulse" />
    )
  }

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <a href="/login">Sign In</a>
      </Button>
    )
  }

  // Extract username from email (remove @hottecouture.com)
  const username = user.email?.replace('@hottecouture.com', '') || user.email

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <User className="w-4 h-4" />
        {username}
      </span>
      <Button 
        onClick={handleSignOut} 
        variant="outline" 
        size="sm"
        className="flex items-center gap-1"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  )
}
