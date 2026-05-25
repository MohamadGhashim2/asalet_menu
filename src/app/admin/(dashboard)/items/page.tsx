'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2, Folder } from 'lucide-react'
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
      .order('created_at', { ascending: true })
    
    if (data) {
      setItems(data as never[])
    }
    setLoading(false)
  }

  useEffect(() => {
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

  // Group items by category
  const itemsByCategory: Record<string, typeof items> = {}
  items.forEach(item => {
    const catName = item.categories?.name || 'بدون قسم'
    if (!itemsByCategory[catName]) {
      itemsByCategory[catName] = []
    }
    itemsByCategory[catName].push(item)
  })

  // Sort categories alphabetically using Arabic collation
  const collator = new Intl.Collator('ar')
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    if (a === 'بدون قسم') return 1
    if (b === 'بدون قسم') return -1
    return collator.compare(a, b)
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
        <Link
          href="/admin/items/new"
          className="bg-brand-burgundy text-white px-4 py-2 rounded-lg hover:bg-brand-burgundy-dark flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة منتج
        </Link>
      </div>

      {Object.keys(itemsByCategory).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-500">لا يوجد منتجات</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((catName) => {
            const catItems = itemsByCategory[catName]
            return (
            <div key={catName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-brand-cream border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <Folder className="w-5 h-5 text-brand-burgundy" />
                <h2 className="text-lg font-bold text-brand-burgundy">{catName}</h2>
                <span className="text-sm bg-white px-2 py-0.5 rounded-full text-brand-brown border border-brand-border">
                  {catItems.length} منتجات
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر الأساسي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {catItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
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
                          <Link href={`/admin/items/${item.id}`} className="text-brand-burgundy hover:text-brand-burgundy-dark transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
