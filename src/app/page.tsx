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

export default function HomePage() {
  const isMockMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase');

  return (
    <ProtectedPage>
      <div className='min-h-screen relative overflow-hidden'>
        {/* Enhanced Background with Image Overlay */}
        <div className='absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900'></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDYwIDAgTCAwIDAgMCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

        {/* Background decorative elements */}
        <div className='absolute inset-0 overflow-hidden'>
          <div className='absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-float'></div>
          <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-rose-400/20 rounded-full blur-3xl animate-float-delay-1'></div>
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400/15 to-cyan-400/15 rounded-full blur-3xl animate-float-delay-2'></div>
          <div className='absolute top-20 left-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-2xl animate-float'></div>
          <div className='absolute bottom-20 right-1/4 w-48 h-48 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-2xl animate-float-delay-1'></div>
        </div>

        <div className='relative z-10 container mx-auto px-4 py-12'>
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

          {/* Hero Section */}
          <div className='text-center mb-16'>
            <div className='inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-8 shadow-lg animate-fade-in-up'>
              <svg
                className='w-10 h-10 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z'
                />
              </svg>
            </div>
            <h1 className='text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-6 leading-tight animate-fade-in-up-delay-1'>
              Hotte Couture
            </h1>
            <p className='text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light animate-fade-in-up-delay-2'>
              Professional tailoring and alteration services with modern
              workflow management
            </p>
          </div>

          {/* Action Cards */}
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16'>
            {/* Create New Order Card */}
            <Card className='group relative overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl animate-fade-in-up-delay-1 hover-lift'>
              <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
              <CardHeader className='pb-4'>
                <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300'>
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
                      d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                    />
                  </svg>
                </div>
                <CardTitle className='text-2xl font-bold text-gray-900 mb-2'>
                  Create New Order
                </CardTitle>
                <CardDescription className='text-gray-600 text-base leading-relaxed'>
                  Streamlined client onboarding and order creation with our
                  intuitive intake system
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <a href='/intake' className='block cursor-pointer'>
                  <Button
                    {...createHapticButtonProps('medium')}
                    className='w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer btn-press btn-bounce relative overflow-hidden'
                  >
                    Start New Order
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Kanban Board Card */}
            <Card className='group relative overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl animate-fade-in-up-delay-2 hover-lift'>
              <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
              <CardHeader className='pb-4'>
                <div className='w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300'>
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
                      d='M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2'
                    />
                  </svg>
                </div>
                <CardTitle className='text-2xl font-bold text-gray-900 mb-2'>
                  Kanban Board
                </CardTitle>
                <CardDescription className='text-gray-600 text-base leading-relaxed'>
                  Visual workflow management for orders and tasks with
                  drag-and-drop functionality
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <a href='/board' className='block cursor-pointer'>
                  <Button
                    {...createHapticButtonProps('light')}
                    className='w-full h-14 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer btn-press btn-pulse relative overflow-hidden'
                  >
                    View Board
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Order Status Card */}
            <Card className='group relative overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl md:col-span-2 lg:col-span-1 animate-fade-in-up-delay-3 hover-lift'>
              <div className='absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'></div>
              <CardHeader className='pb-4'>
                <div className='w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300'>
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
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <CardTitle className='text-2xl font-bold text-gray-900 mb-2'>
                  Order Status
                </CardTitle>
                <CardDescription className='text-gray-600 text-base leading-relaxed'>
                  Check order status and track progress in real-time
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <a href='/status' className='block cursor-pointer'>
                  <Button
                    {...createHapticButtonProps('medium')}
                    className='w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer btn-press btn-glow relative overflow-hidden'
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
      </div>
    </ProtectedPage>
  );
}
