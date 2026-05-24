'use client'

import { useState } from 'react'
import { importMenuData } from '@/app/admin/actions/import'

export default function ImportPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleImport() {
    if (!confirm('تحذير: هذه العملية ستقوم بإضافة بيانات المنيو من الملف. هل أنت متأكد؟')) return
    
    setLoading(true)
    setMessage('')
    
    const result = await importMenuData()
    
    if (result.success) {
      setMessage('تم استيراد المنيو بنجاح!')
    } else {
      setMessage(`خطأ: ${result.error}`)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">استيراد المنيو الأولي</h1>
      
      <p className="text-gray-600 mb-6">
        هذه الأداة تقوم بقراءة الملف <code className="bg-gray-100 px-1 py-0.5 rounded">data/menu-import/menu.seed.json</code> واستيراد الأقسام، المنتجات، والخيارات إلى قاعدة البيانات.
      </p>

      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.includes('خطأ') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'جاري الاستيراد...' : 'استيراد المنيو الأولي'}
      </button>
    </div>
  )
}
