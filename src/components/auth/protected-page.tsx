'use client'

import { AuthGuard } from '@/components/auth/auth-guard'

interface ProtectedPageProps {
  children: React.ReactNode
}

export function ProtectedPage({ children }: ProtectedPageProps) {
  return <AuthGuard>{children}</AuthGuard>
}
