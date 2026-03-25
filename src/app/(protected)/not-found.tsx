'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'

export default function NotFound() {
  const t = useTranslations('errors')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary/20">404</h1>
          <h2 className="text-4xl font-bold tracking-tight">{t('pageNotFound')}</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('pageNotFoundDescription')}
          </p>
        </div>

        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>{t('whatCanYouDo')}</CardTitle>
            <CardDescription>
              {t('helpfulOptions')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/">
                  {t('goBackHome')}
                </Link>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                {t('contactAdmin')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
