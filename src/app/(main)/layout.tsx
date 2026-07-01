import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Main content: push below top bar and above bottom nav */}
      <main className="pt-14 pb-20 sm:pb-4 sm:pl-56">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {children}
        </div>
      </main>
    </div>
  )
}
