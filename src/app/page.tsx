'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProtectedPage } from '@/components/auth/protected-page';
import { createHapticButtonProps } from '@/lib/utils/haptic-feedback';
import { MuralBackground } from '@/components/ui/mural-background';
import { HLogo } from '@/components/ui/h-logo';

export default function HomePage() {
  const isMockMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase');

  return (
    <ProtectedPage>
      <MuralBackground useMuralBackground={true} opacity={0.08}>
        <div className='container mx-auto px-4 py-4 h-screen flex flex-col'>
          {isMockMode && (
            <div className='mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl backdrop-blur-sm shadow-lg'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center'>
                    <svg
                      className='h-5 w-5 text-white'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path
                        fillRule='evenodd'
                        d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                </div>
                <div className='ml-4'>
                  <h3 className='text-lg font-semibold text-amber-900'>
                    Development Mode
                  </h3>
                  <p className='text-amber-800 mt-1'>
                    Running in mock mode without Supabase. All features are
                    simulated for testing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compact Hero Section */}
          <div className='text-center mb-4 flex-shrink-0'>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl mb-3 shadow-lg animate-fade-in-up p-2'>
              <HLogo size='lg' className='w-full h-full' />
            </div>
            <h1 className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent-clay via-primary-500 to-accent-contrast bg-clip-text text-transparent mb-1 leading-tight animate-fade-in-up-delay-1'>
              Hotte Couture
            </h1>
            <p className='text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed font-semibold animate-fade-in-up-delay-2'>
              Professional tailoring and alteration services
            </p>
          </div>

          {/* Action Cards */}
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 items-start justify-center pt-8'>
            {/* Create New Order Card */}
            <Card className='group relative overflow-hidden bg-surface/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl animate-fade-in-up-delay-1 hover-lift'>
              <div className='absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-clay/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
              <CardHeader className='pb-2'>
                <div className='w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-clay rounded-xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300'>
                  <svg
                    className='w-6 h-6 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                    />
                  </svg>
                </div>
                <CardTitle className='text-lg font-bold text-text mb-1'>
                  Create New Order
                </CardTitle>
                <CardDescription className='text-text-secondary text-sm leading-relaxed'>
                  Streamlined client onboarding and order creation
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <a href='/intake' className='block cursor-pointer'>
                  <Button
                    {...createHapticButtonProps('medium')}
                    className='w-full h-10 bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer btn-press btn-bounce relative overflow-hidden'
                  >
                    Start New Order
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Kanban Board Card */}
            <Card className='group relative overflow-hidden bg-surface/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl animate-fade-in-up-delay-2 hover-lift'>
              <div className='absolute inset-0 bg-gradient-to-br from-secondary-500/10 to-accent-olive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
              <CardHeader className='pb-2'>
                <div className='w-12 h-12 bg-gradient-to-br from-secondary-500 to-accent-olive rounded-xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300'>
                  <svg
                    className='w-6 h-6 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2'
                    />
                  </svg>
                </div>
                <CardTitle className='text-lg font-bold text-text mb-1'>
                  Kanban Board
                </CardTitle>
                <CardDescription className='text-text-secondary text-sm leading-relaxed'>
                  Visual workflow management with drag-and-drop
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <a href='/board' className='block cursor-pointer'>
                  <Button
                    {...createHapticButtonProps('light')}
                    className='w-full h-10 bg-gradient-to-r from-secondary-500 to-accent-olive hover:from-secondary-600 hover:to-accent-olive text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer btn-press btn-pulse relative overflow-hidden'
                  >
                    View Board
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Order Status Card */}
            <Card className='group relative overflow-hidden bg-surface/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl md:col-span-2 lg:col-span-1 animate-fade-in-up-delay-3 hover-lift'>
              <div className='absolute inset-0 bg-gradient-to-br from-accent-taupe/10 to-accent-contrast/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
              <CardHeader className='pb-2'>
                <div className='w-12 h-12 bg-gradient-to-br from-accent-taupe to-accent-contrast rounded-xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300'>
                  <svg
                    className='w-6 h-6 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <CardTitle className='text-lg font-bold text-text mb-1'>
                  Order Status
                </CardTitle>
                <CardDescription className='text-text-secondary text-sm leading-relaxed'>
                  Check order status and track progress
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <a href='/status' className='block cursor-pointer'>
                  <Button
                    {...createHapticButtonProps('medium')}
                    className='w-full h-10 bg-gradient-to-r from-accent-taupe to-accent-contrast hover:from-accent-taupe hover:to-accent-contrast text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer btn-press btn-glow relative overflow-hidden'
                  >
                    Check Status
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Development Mode Info */}
          {isMockMode && (
            <div className='mt-16 p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-xl'>
              <div className='text-center'>
                <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg'>
                  <svg
                    className='w-8 h-8 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                </div>
                <h3 className='text-2xl font-bold text-white mb-4'>
                  🚀 Ready to Test!
                </h3>
                <p className='text-gray-300 mb-6 text-lg max-w-2xl mx-auto'>
                  The application is running in development mode. You can test
                  all features without Supabase:
                </p>
                <div className='grid md:grid-cols-2 gap-4 max-w-4xl mx-auto'>
                  <div className='flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20'>
                    <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-4 h-4 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span className='text-white font-medium'>
                      Order intake form with mock data
                    </span>
                  </div>
                  <div className='flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20'>
                    <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-4 h-4 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span className='text-white font-medium'>
                      Kanban board with drag & drop
                    </span>
                  </div>
                  <div className='flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20'>
                    <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-4 h-4 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span className='text-white font-medium'>
                      Order status lookup
                    </span>
                  </div>
                  <div className='flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20'>
                    <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-4 h-4 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span className='text-white font-medium'>
                      Label generation (simulated)
                    </span>
                  </div>
                  <div className='flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 md:col-span-2'>
                    <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                      <svg
                        className='w-4 h-4 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span className='text-white font-medium'>
                      Multi-language support
                    </span>
                  </div>
                </div>
                <p className='text-gray-300 text-sm mt-6 max-w-2xl mx-auto'>
                  When you get Supabase access, just update the environment
                  variables and the app will automatically switch to real mode.
                </p>
              </div>
            </div>
          )}
        </div>
      </MuralBackground>
    </ProtectedPage>
  );
}
