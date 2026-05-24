import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, LayoutDashboard, Settings, List, Package, QrCode, Import } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const navLinks = [
    { href: '/admin', label: 'لوحة القيادة', icon: LayoutDashboard },
    { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
    { href: '/admin/categories', label: 'الأقسام', icon: List },
    { href: '/admin/items', label: 'المنتجات', icon: Package },
    { href: '/admin/qr', label: 'رمز الاستجابة السريعة (QR)', icon: QrCode },
    { href: '/admin/import', label: 'استيراد المنيو', icon: Import },
  ]

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800">إدارة المنيو</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="flex items-center space-x-3 space-x-reverse px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex items-center space-x-3 space-x-reverse px-4 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">إدارة المنيو</h2>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-red-600">
              <LogOut className="w-6 h-6" />
            </button>
          </form>
        </div>
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
