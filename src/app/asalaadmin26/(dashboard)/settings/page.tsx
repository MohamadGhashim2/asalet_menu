'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

type Settings = Database['public']['Tables']['restaurant_settings']['Row']

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  async function fetchSettings() {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setSettings(data)
    } else if (error && error.code === 'PGRST116') {
      // no rows returned, insert one
      const { data: newData } = await supabase
        .from('restaurant_settings')
        .insert({ currency: 'ر.س', whatsapp: '' })
        .select()
        .single()
      if (newData) setSettings(newData)
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings()
  }, [])

  

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return

    setSaving(true)
    setMessage('')
    
    const { error } = await supabase
      .from('restaurant_settings')
      .update({
        whatsapp: settings.whatsapp,
        currency: settings.currency,
        tax_rate: settings.tax_rate,
      })
      .eq('id', settings.id)

    setSaving(false)
    if (error) {
      setMessage('حدث خطأ أثناء الحفظ')
    } else {
      setMessage('تم الحفظ بنجاح')
    }
  }

  if (loading) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">جاري التحميل...</div>

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-brand-text">إعدادات المطعم</h1>
        <p className="text-sm leading-6 text-brand-brown">بيانات الطلب الأساسية التي تظهر في تجربة المنيو.</p>
      </div>
      
      {message && (
        <div className={`rounded-lg border p-4 text-sm font-bold ${message.includes('خطأ') ? 'border-red-100 bg-red-50 text-red-700' : 'border-green-100 bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-5 rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label className="mb-2 block text-sm font-bold text-brand-text">
            رقم الواتساب (للطلبات)
          </label>
          <input
            type="text"
            dir="ltr"
            className="min-h-11 w-full rounded-lg border border-brand-border px-4 py-2 text-left outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
            value={settings?.whatsapp || ''}
            onChange={(e) => setSettings({ ...settings!, whatsapp: e.target.value })}
            placeholder="+966500000000"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-brand-text">
            العملة
          </label>
          <input
            type="text"
            className="min-h-11 w-full rounded-lg border border-brand-border px-4 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
            value={settings?.currency || ''}
            onChange={(e) => setSettings({ ...settings!, currency: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-brand-text">
            الضريبة (%)
          </label>
          <input
            type="number"
            step="0.01"
            className="min-h-11 w-full rounded-lg border border-brand-border px-4 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
            value={settings?.tax_rate || 0}
            onChange={(e) => setSettings({ ...settings!, tax_rate: parseFloat(e.target.value) })}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-11 w-full rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </form>
    </div>
  )
}
