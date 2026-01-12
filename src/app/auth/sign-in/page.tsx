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

function SignInContent() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

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
        setMessage('Check your email for the sign-in link!');
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.');
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
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We've sent you a sign-in link at {email}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='text-center text-sm text-muted-foreground'>
                <p>Click the link in your email to sign in.</p>
                <p className='mt-2'>
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setIsEmailSent(false);
                      setMessage('');
                    }}
                    className='text-primary hover:underline'
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                variant='outline'
                className='w-full'
              >
                Cancel
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
            <CardTitle>Sign in to Hotte Couture</CardTitle>
            <CardDescription>
              Enter your email address to receive a sign-in link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className='space-y-4'>
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium mb-2'
                >
                  Email address
                </label>
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className='w-full px-3 py-2 border border-input rounded-md bg-background text-text placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  placeholder='Enter your email'
                />
              </div>

              {message && (
                <div
                  className={`text-sm ${
                    message.includes('Check your email')
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
                {isLoading ? 'Sending...' : 'Send sign-in link'}
              </Button>
            </form>

            <div className='mt-6 text-center text-sm text-muted-foreground'>
              <p>
                By signing in, you agree to our{' '}
                <a href='/terms' className='text-primary hover:underline'>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href='/privacy' className='text-primary hover:underline'>
                  Privacy Policy
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
                <p className='text-muted-foreground'>Loading...</p>
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
