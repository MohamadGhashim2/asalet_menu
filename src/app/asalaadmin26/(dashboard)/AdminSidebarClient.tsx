'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, Settings, List, Package, QrCode, Menu, X, Layers, LayoutGrid, Table2 } from 'lucide-react'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { useLocale } from '@/i18n/LocaleProvider'

const navLinks = [
  { href: '/asalaadmin26', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/asalaadmin26/settings', labelKey: 'settings', icon: Settings },
  { href: '/asalaadmin26/categories', labelKey: 'categories', icon: List },
  { href: '/asalaadmin26/menu-manager', labelKey: 'visualMenuManager', icon: LayoutGrid },
  { href: '/asalaadmin26/items', labelKey: 'products', icon: Package },
  { href: '/asalaadmin26/option-templates', labelKey: 'optionTemplates', icon: Layers },
  { href: '/asalaadmin26/qr', labelKey: 'qrCode', icon: QrCode },
  { href: '/asalaadmin26/tables', labelKey: 'tables', icon: Table2 },
] as const

export default function AdminSidebarClient({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useLocale()

  const closeSidebar = () => setIsOpen(false)

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-brand-cream text-brand-text">
      {/* Desktop Sidebar */}
      <aside className="z-20 hidden w-64 shrink-0 flex-col border-l border-brand-border bg-white shadow-sm md:flex">
        <div className="border-b border-brand-border p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-brand-text">{t('menuAdministration')}</h2>
            <LanguageToggle />
          </div>
          <p className="mt-1 text-sm text-brand-brown">{t('restaurantDashboard')}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive ? 'bg-brand-burgundy/10 text-brand-burgundy font-semibold' : 'text-brand-brown hover:bg-brand-cream/70'
                }`}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 leading-6">{t(link.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-brand-border p-4">
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2 text-red-600 transition-colors hover:bg-red-50">
              <LogOut className="h-5 w-5 shrink-0" />
              <span>{t('signOut')}</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Overlay & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity" 
            onClick={closeSidebar}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <aside className="relative flex h-full w-[min(86vw,20rem)] max-w-full flex-col overflow-hidden border-l border-brand-border bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-border p-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-brand-text">{t('menuAdministration')}</h2>
                <p className="mt-1 text-sm text-brand-brown">{t('restaurantDashboard')}</p>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-cream text-brand-text transition-colors hover:bg-brand-beige focus:outline-none focus:ring-2 focus:ring-brand-gold"
                onClick={closeSidebar}
              >
                <span className="sr-only">{t('closeMenu')}</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={closeSidebar}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                      isActive ? 'bg-brand-burgundy/10 text-brand-burgundy font-semibold' : 'text-brand-brown hover:bg-brand-cream/70'
                    }`}
                  >
                    <link.icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 leading-6">{t(link.labelKey)}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="shrink-0 border-t border-brand-border p-4">
              <form action="/auth/signout" method="post">
                <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2 text-red-600 transition-colors hover:bg-red-50">
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>{t('signOut')}</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Topbar */}
        <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-brand-border bg-white p-3 shadow-sm md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-text transition-colors hover:bg-brand-cream focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="min-w-0 truncate text-lg font-bold text-brand-text">{t('menuAdministration')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle className="min-h-11 px-2" />
            <form action="/auth/signout" method="post">
              <button type="submit" aria-label={t('signOut')} className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50">
                <LogOut className="h-6 w-6" />
              </button>
            </form>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
