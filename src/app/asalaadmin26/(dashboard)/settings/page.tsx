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
      const { data: newData, error: insertError } = await supabase
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

  if (loading) return <div>جاري التحميل...</div>

  return (
    <div className="max-w-2xl bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">إعدادات المطعم</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.includes('خطأ') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم الواتساب (للطلبات)
          </label>
          <input
            type="text"
            dir="ltr"
            className="w-full px-4 py-2 border rounded-md focus:ring-brand-burgundy/100 focus:border-brand-burgundy/100"
            value={settings?.whatsapp || ''}
            onChange={(e) => setSettings({ ...settings!, whatsapp: e.target.value })}
            placeholder="+966500000000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            العملة
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-md focus:ring-brand-burgundy/100 focus:border-brand-burgundy/100"
            value={settings?.currency || ''}
            onChange={(e) => setSettings({ ...settings!, currency: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الضريبة (%)
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full px-4 py-2 border rounded-md focus:ring-brand-burgundy/100 focus:border-brand-burgundy/100"
            value={settings?.tax_rate || 0}
            onChange={(e) => setSettings({ ...settings!, tax_rate: parseFloat(e.target.value) })}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-burgundy text-white py-2 px-4 rounded-md hover:bg-brand-burgundy-dark disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </form>
    </div>
  )
}
