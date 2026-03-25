'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslations } from 'next-intl';

function SignInContent() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setIsEmailSent(true);
        setMessage(t('checkEmail'));
      }
    } catch (error) {
      setMessage(t('signInError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isEmailSent) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='mx-auto max-w-md'>
          <Card>
            <CardHeader className='text-center'>
              <CardTitle>{t('checkEmail')}</CardTitle>
              <CardDescription>
                {t('checkEmailSent', { email })}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='text-center text-sm text-muted-foreground'>
                <p>{t('clickLink')}</p>
                <p className='mt-2'>
                  {t('didntReceive')}{' '}
                  <button
                    onClick={() => {
                      setIsEmailSent(false);
                      setMessage('');
                    }}
                    className='text-primary hover:underline'
                  >
                    {t('tryAgain')}
                  </button>
                  .
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                variant='outline'
                className='w-full'
              >
                {tCommon('cancel')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-md'>
        <Card>
          <CardHeader className='text-center'>
            <CardTitle>{t('signInTitle')}</CardTitle>
            <CardDescription>
              {t('signInDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className='space-y-4'>
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium mb-2'
                >
                  {t('email')}
                </label>
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className='w-full px-3 py-2 border border-input rounded-md bg-background text-text placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  placeholder={t('emailPlaceholder')}
                />
              </div>

              {message && (
                <div
                  className={`text-sm ${
                    isEmailSent
                      ? 'text-green-600'
                      : 'text-destructive'
                  }`}
                >
                  {message}
                </div>
              )}

              <Button
                type='submit'
                disabled={isLoading || !email}
                className='w-full'
              >
                {isLoading ? t('sending') : t('sendLink')}
              </Button>
            </form>

            <div className='mt-6 text-center text-sm text-muted-foreground'>
              <p>
                {t('termsAgreement')}{' '}
                <a href='/terms' className='text-primary hover:underline'>
                  {t('termsOfService')}
                </a>{' '}
                {t('and')}{' '}
                <a href='/privacy' className='text-primary hover:underline'>
                  {t('privacyPolicy')}
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className='container mx-auto px-4 py-8'>
          <div className='mx-auto max-w-md'>
            <Card>
              <CardContent className='p-6 text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                <p className='text-muted-foreground'></p>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
