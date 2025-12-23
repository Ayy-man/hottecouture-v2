'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { HLogo } from '@/components/ui/h-logo';

function LoginContent() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  // Check if user is already logged in and redirect
  useEffect(() => {
    if (!isLoading && user) {
      console.log('✅ User already logged in, redirecting...');
      const redirectTo = searchParams.get('redirectTo') || '/';
      router.replace(redirectTo);
    }
  }, [user, isLoading, router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Convert username to email format for Supabase authentication
      const email = `${username}@hottecouture.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error details:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ Login successful, user:', data.user.email);

        // Redirect to the intended page or home
        const redirectTo = searchParams.get('redirectTo') || '/';
        console.log('🔄 Redirecting to:', redirectTo);

        // Use window.location for a hard redirect
        window.location.href = redirectTo;
      } else {
        setError('Login failed - no user data returned');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth context is loading
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4'>
        <div className='w-full max-w-md'>
          <Card className='shadow-lg'>
            <CardContent className='p-6 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
              <p className='text-gray-600'>Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <Card className='shadow-lg'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4'>
              <HLogo size='lg' variant='round' />
            </div>
            <CardTitle className='text-2xl font-bold'>Hotte Couture</CardTitle>
            <CardDescription>Connectez-vous pour accéder à l'application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className='space-y-4'>
              <div>
                <label
                  htmlFor='username'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Username
                </label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='username'
                    type='text'
                    placeholder='admin'
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className='pl-10'
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Enter your password'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className='pl-10 pr-10'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-red-600' />
                  <p className='text-sm text-red-800'>{error}</p>
                </div>
              )}

              <Button type='submit' className='w-full' disabled={loading}>
                {loading ? (
                  <>
                    <div className='w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className='w-4 h-4 mr-2' />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4'>
          <div className='w-full max-w-md'>
            <Card className='shadow-lg'>
              <CardContent className='p-6 text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                <p className='text-gray-600'>Loading...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
