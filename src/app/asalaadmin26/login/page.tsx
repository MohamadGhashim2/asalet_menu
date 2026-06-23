'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { useLocale } from '@/i18n/LocaleProvider'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLocale()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_LOGIN_EMAIL

    if (!adminEmail) {
      setError(t('missingLoginSettings'))
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: code,
    })

    if (error) {
      setError(t('invalidAccessCode'))
      setLoading(false)
    } else {
      router.push('/asalaadmin26')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-brand-cream p-4 sm:p-6 lg:p-8">
      <div className="relative w-full max-w-md space-y-7 rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-8">
        <LanguageToggle className="absolute end-4 top-4" />
        <div>
          <h1 className="text-center text-2xl font-extrabold text-brand-text sm:text-3xl">
            {t('adminLogin')}
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-brand-brown">
            {t('loginInstruction')}
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <div>
              <label htmlFor="code" className="mb-2 block text-sm font-bold text-brand-text">
                {t('accessCode')}
              </label>
              <input
                id="code"
                name="code"
                type="password"
                required
                className="relative block min-h-12 w-full appearance-none rounded-xl border border-brand-border px-4 py-3 text-center text-xl tracking-widest text-brand-text outline-none transition-colors placeholder:text-gray-400 focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                placeholder={t('accessCode')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="relative flex min-h-12 w-full justify-center rounded-xl border border-transparent bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? t('loggingIn') : t('login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
