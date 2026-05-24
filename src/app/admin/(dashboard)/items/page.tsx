'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'

type MenuItem = Database['public']['Tables']['menu_items']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export default function ItemsPage() {
  const [items, setItems] = useState<(MenuItem & { categories: Pick<Category, 'name'> | null })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .order('sort_order', { ascending: true })
    
    if (data) {
      setItems(data as never[])
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems()
  }, [])

  

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع الخيارات التابعة له!')) return

    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (!error) {
      setItems(items.filter(i => i.id !== id))
    }
  }

  if (loading) return <div>جاري التحميل...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
        <Link
          href="/admin/items/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة منتج
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر الأساسي</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{item.categories?.name || 'غير محدد'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{item.base_price !== null ? item.base_price : 'حسب الخيار'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.is_available ? 'متاح' : 'غير متاح'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-4">
                    <Link href={`/admin/items/${item.id}`} className="text-blue-600 hover:text-blue-900">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">لا يوجد منتجات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
