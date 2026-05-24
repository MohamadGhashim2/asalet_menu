import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebarClient from './AdminSidebarClient'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <AdminSidebarClient>
      {children}
    </AdminSidebarClient>
  )
}
