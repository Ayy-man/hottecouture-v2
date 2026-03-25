export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBasedNav } from '@/components/navigation/role-based-nav'
import { getCurrentUser } from '@/lib/security/auth'
import { DashboardSeamstressGuard } from '@/components/security/dashboard-seamstress-guard'
import { getTranslations } from 'next-intl/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const session = await getCurrentUser()
  if (!session) {
    redirect('/auth/sign-in')
  }

  const t = await getTranslations('dashboard')
  const tAuth = await getTranslations('auth')
  const tHome = await getTranslations('home')
  const tNav = await getTranslations('navigation')

  return (
    <DashboardSeamstressGuard>
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{tNav('dashboard')}</h1>
          <p className="text-muted-foreground">
            {t('welcomeBack', { email: user.email, role: session.role })}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <h2 className="text-lg font-semibold mb-4">{t('navigation')}</h2>
              <RoleBasedNav userRole={session.role} />
            </div>
          </div>
          
          <div className="lg:col-span-3">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile')}</CardTitle>
              <CardDescription>
                {t('manageAccountSettings')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('email', { email: user.email })}
              </p>
              <Button variant="outline" className="w-full">
                {t('editProfile')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tNav('orders')}</CardTitle>
              <CardDescription>
                {t('viewAndManageOrders')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('viewKanbanBoard')}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="/board">{tHome('viewBoard')}</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('analyticsTitle')}</CardTitle>
              <CardDescription>
                {t('viewBusinessInsights')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('revenueOrdersCustomerMetrics')}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="/dashboard/analytics">{t('viewAnalytics')}</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>{tAuth('signOut')}</CardTitle>
              <CardDescription>
                {t('signOutDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/auth/sign-out" method="post">
                <Button type="submit" variant="destructive">
                  {tAuth('signOut')}
                </Button>
              </form>
            </CardContent>
          </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DashboardSeamstressGuard>
  )
}

