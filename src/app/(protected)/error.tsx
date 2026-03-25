'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t('somethingWentWrong')}</CardTitle>
            <CardDescription>
              {t('unexpectedError')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4">
              <h4 className="font-medium text-destructive">{t('errorDetails')}</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                {error.message || t('unknownError')}
              </p>
              {error.digest && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('errorId')} {error.digest}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={reset} variant="default">
                {t('tryAgain')}
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                {t('goHome')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
