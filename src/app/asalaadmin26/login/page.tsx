'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_LOGIN_EMAIL

    if (!adminEmail) {
      setError('إعدادات الدخول غير مكتملة (Missing Email)')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: code,
    })

    if (error) {
      setError('رمز الدخول غير صحيح')
      setLoading(false)
    } else {
      router.push('/asalaadmin26')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            تسجيل الدخول للإدارة
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            أدخل رمز الدخول الخاص بإدارة المنيو
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="code" className="sr-only">
                رمز الدخول
              </label>
              <input
                id="code"
                name="code"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-burgundy/100 focus:border-brand-burgundy/100 focus:z-10 sm:text-sm text-center tracking-widest text-xl"
                placeholder="رمز الدخول"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-burgundy hover:bg-brand-burgundy-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-burgundy/100 disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
