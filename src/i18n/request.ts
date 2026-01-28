import { getRequestConfig } from 'next-intl/server'

// Can be imported from a shared config
const locales = ['en', 'fr']

export default getRequestConfig(async ({ locale }) => {
  // Use default locale if none provided
  const validLocale = locale && locales.includes(locale) ? locale : 'fr'

  return {
    messages: (await import(`../../locales/${validLocale}.json`)).default
  }
})
