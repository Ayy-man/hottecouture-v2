import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const code = searchParams.code as string
  const redirectTo = searchParams.redirectTo as string || '/dashboard'

    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirect to the intended page after successful authentication
      redirect(redirectTo)
    }
  }

  // If there's an error or no code, redirect to sign-in
  redirect('/auth/sign-in?error=invalid_code')
}
