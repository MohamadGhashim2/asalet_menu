'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2, Folder, Image as ImageIcon, ChevronDown, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { deleteMenuImageIfUnused } from '@/lib/storage-images'
import { useAdminText } from '@/i18n/admin-text'

type MenuItem = Database['public']['Tables']['menu_items']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type MenuItemWithCategory = MenuItem & { categories: Pick<Category, 'name'> | null }

const arabicCollator = new Intl.Collator('ar')

function getCategoryName(item: MenuItemWithCategory) {
  return item.categories?.name || ''
}

function groupItemsByCategory(items: MenuItemWithCategory[]) {
  const itemsByCategory: Record<string, MenuItemWithCategory[]> = {}

  items.forEach(item => {
    const catName = getCategoryName(item)
    if (!itemsByCategory[catName]) {
      itemsByCategory[catName] = []
    }
    itemsByCategory[catName].push(item)
  })

  return itemsByCategory
}

function sortCategoryNames(categoryNames: string[]) {
  return [...categoryNames].sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return arabicCollator.compare(a, b)
  })
}

export default function ItemsPage() {
  const tx = useAdminText()
  const [items, setItems] = useState<MenuItemWithCategory[]>([])
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([])
  const [accordionInitialized, setAccordionInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const supabase = createClient()

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (data) {
      const fetchedItems = data as unknown as MenuItemWithCategory[]
      setItems(fetchedItems)

      if (!accordionInitialized) {
        const firstCategory = sortCategoryNames(Object.keys(groupItemsByCategory(fetchedItems)))[0]
        setOpenCategoryIds(firstCategory ? [firstCategory] : [])
        setAccordionInitialized(true)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm(tx('هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع الخيارات التابعة له!'))) return

    const itemToDelete = items.find(item => item.id === id)
    setStatusMessage('')

    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (!error) {
      setItems(items.filter(i => i.id !== id))
      const cleanupResult = await deleteMenuImageIfUnused(supabase, itemToDelete?.image_url)

      if (cleanupResult.error) {
        console.warn('Storage image cleanup failed after product delete:', cleanupResult.error)
        setStatusMessage(tx('تم حذف المنتج، لكن تعذر حذف الصورة من التخزين: {message}', { message: cleanupResult.error }))
      } else {
        setStatusMessage(tx('تم حذف المنتج بنجاح'))
      }
    } else {
      setStatusMessage(tx('حدث خطأ أثناء حذف المنتج: {message}', { message: error.message }))
    }
  }

  const itemsByCategory = useMemo(() => groupItemsByCategory(items), [items])
  const sortedCategories = useMemo(() => sortCategoryNames(Object.keys(itemsByCategory)), [itemsByCategory])
  const openCategorySet = useMemo(() => new Set(openCategoryIds), [openCategoryIds])

  function toggleCategory(categoryName: string) {
    setOpenCategoryIds(current => (
      current.includes(categoryName)
        ? current.filter(name => name !== categoryName)
        : [...current, categoryName]
    ))
  }

  function openAllCategories() {
    setOpenCategoryIds(sortedCategories)
  }

  function closeAllCategories() {
    setOpenCategoryIds([])
  }

  if (loading) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">{tx('جاري التحميل...')}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand-text">{tx('المنتجات')}</h1>
          <p className="text-sm leading-6 text-brand-brown">{tx('المنتجات مرتبة حسب القسم لتسهيل تعديل المنيو اليومي.')}</p>
        </div>
        <Link
          href="/asalaadmin26/items/new"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          {tx('إضافة منتج')}
        </Link>
      </div>

      {statusMessage && (
        <div className={`rounded-lg border p-4 text-sm font-bold ${statusMessage.includes('خطأ') ? 'border-red-100 bg-red-50 text-red-700' : statusMessage.includes('تعذر') ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-green-100 bg-green-50 text-green-700'}`}>
          {statusMessage}
        </div>
      )}

      {Object.keys(itemsByCategory).length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-border bg-white py-12 text-center">
          <p className="text-sm text-brand-brown">{tx('لا يوجد منتجات حتى الآن.')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAllCategories}
                className="min-h-10 rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-burgundy transition-colors hover:bg-brand-cream"
              >
                {tx('فتح الكل')}
              </button>
              <button
                type="button"
                onClick={closeAllCategories}
                className="min-h-10 rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-brown transition-colors hover:bg-brand-cream"
              >
                {tx('إغلاق الكل')}
              </button>
            </div>
          )}

          {sortedCategories.map((catName, index) => {
            const catItems = itemsByCategory[catName]
            const isOpen = openCategorySet.has(catName)
            const panelId = `items-category-panel-${index}`
            return (
            <div key={catName} className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleCategory(catName)}
                className="flex min-h-16 w-full items-center gap-3 border-b border-brand-border bg-brand-cream px-4 py-4 text-right transition-colors hover:bg-brand-beige/70 sm:px-6"
              >
                <Folder className="h-5 w-5 shrink-0 text-brand-burgundy" />
                <span className="min-w-0 flex-1 break-words text-lg font-bold leading-7 text-brand-burgundy">{catName || tx('بدون قسم')}</span>
                <span className="shrink-0 rounded-full border border-brand-border bg-white px-2.5 py-1 text-xs font-bold text-brand-brown sm:text-sm">
                  {tx('{count} منتجات', { count: catItems.length })}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-brand-burgundy" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="h-5 w-5 shrink-0 text-brand-burgundy" aria-hidden="true" />
                )}
              </button>
              {isOpen && (
                <div id={panelId}>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الصورة')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الاسم')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('السعر الأساسي')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الحالة')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الإجراءات')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {catItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          {item.image_url ? (
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-brand-border bg-brand-cream">
                              <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-brand-border bg-brand-cream">
                              <ImageIcon className="h-5 w-5 text-brand-brown/60" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="block max-w-xs break-words text-sm font-medium text-gray-900">{item.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">{item.base_price !== null ? item.base_price : tx('حسب الخيار')}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.is_available ? tx('متاح') : tx('غير متاح')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-4">
                            <Link href={`/asalaadmin26/items/${item.id}`} className="text-brand-burgundy hover:text-brand-burgundy-dark transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button type="button" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="block divide-y divide-brand-border md:hidden">
                {catItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 bg-white p-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="shrink-0">
                        {item.image_url ? (
                          <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-brand-border bg-brand-cream">
                            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-brand-border bg-brand-cream">
                            <ImageIcon className="h-6 w-6 text-brand-brown/60" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 flex-1 break-words text-base font-bold leading-6 text-gray-900">{item.name}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.is_available ? tx('متاح') : tx('غير متاح')}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                          {item.base_price !== null ? `${item.base_price} ر.س` : tx('حسب الخيار')}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Link href={`/asalaadmin26/items/${item.id}`} className="flex justify-center items-center gap-2 bg-gray-50 hover:bg-gray-100 text-brand-burgundy py-3 rounded-xl border border-gray-200 transition-colors shadow-sm">
                        <Edit2 className="w-4 h-4" />
                        <span className="text-sm font-bold">{tx('تعديل')}</span>
                      </Link>
                      <button type="button" onClick={() => handleDelete(item.id)} className="flex justify-center items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl border border-red-100 transition-colors shadow-sm">
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-bold">{tx('حذف')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
