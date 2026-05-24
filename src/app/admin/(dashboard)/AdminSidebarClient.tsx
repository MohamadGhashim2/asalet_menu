'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, Settings, List, Package, QrCode, Import, Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/admin', label: 'لوحة القيادة', icon: LayoutDashboard },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
  { href: '/admin/categories', label: 'الأقسام', icon: List },
  { href: '/admin/items', label: 'المنتجات', icon: Package },
  { href: '/admin/qr', label: 'رمز الاستجابة السريعة (QR)', icon: QrCode },
  { href: '/admin/import', label: 'استيراد المنيو', icon: Import },
]

export default function AdminSidebarClient({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const closeSidebar = () => setIsOpen(false)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white shadow-md flex-col hidden md:flex z-20">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800">إدارة المنيو</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-brand-burgundy/10 text-brand-burgundy font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
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

      {/* Mobile Overlay & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity" 
            onClick={closeSidebar}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl h-full transform transition-transform">
            <div className="absolute top-0 left-0 -ml-12 pt-4">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={closeSidebar}
              >
                <span className="sr-only">إغلاق القائمة</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            
            <div className="p-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">إدارة المنيو</h2>
            </div>
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={closeSidebar}
                    className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-brand-burgundy/10 text-brand-burgundy font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t flex-shrink-0">
              <form action="/auth/signout" method="post">
                <button type="submit" className="flex items-center space-x-3 space-x-reverse px-4 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الخروج</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Topbar */}
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none p-1 -ml-1 rounded-md"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">إدارة المنيو</h2>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-red-600 p-1">
              <LogOut className="w-6 h-6" />
            </button>
          </form>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
