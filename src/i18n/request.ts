import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const locales = ['en', 'fr'] as const;
const defaultLocale = 'fr';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  const locale = localeCookie && locales.includes(localeCookie as any)
    ? localeCookie
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default
  };
});
