'use client'

import { Languages } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleProvider'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <label
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-burgundy shadow-sm transition-colors hover:bg-brand-cream focus:outline-none focus:ring-2 focus:ring-brand-gold ${className}`}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="min-h-8 cursor-pointer bg-transparent outline-none"
        aria-label={t('language')}
        dir="ltr"
      >
        <option value="ar">العربية</option>
        <option value="en">English</option>
        <option value="tr">Türkçe</option>
      </select>
    </label>
  )
}
