'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()

  function switchLocale(newLocale: string) {
    if (newLocale === locale) return
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    router.refresh()
  }

  return (
    <div className="flex items-center">
      <Button
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-xs rounded-r-none"
        onClick={() => switchLocale('en')}
      >
        EN
      </Button>
      <Button
        variant={locale === 'fr' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-xs rounded-l-none"
        onClick={() => switchLocale('fr')}
      >
        FR
      </Button>
    </div>
  )
}
