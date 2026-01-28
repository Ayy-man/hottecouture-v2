'use client'

import { Button } from '@/components/ui/button'

export function LanguageToggle() {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm">
        EN
      </Button>
      <Button variant="outline" size="sm">
        FR
      </Button>
    </div>
  )
}