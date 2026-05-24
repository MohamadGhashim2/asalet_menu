'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'

type Settings = Database['public']['Tables']['restaurant_settings']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Option = Database['public']['Tables']['item_options']['Row']
type OptionGroup = Database['public']['Tables']['item_option_groups']['Row'] & { options: Option[] }
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & { groups: OptionGroup[] }

export default function MenuClient({
  settings,
  categories,
  items
}: {
  settings?: Settings
  categories: Category[]
  items: MenuItem[]
}) {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  
  // State for selections inside the modal
  const [selections, setSelections] = useState<Record<string, string[]>>({})

  const currency = settings?.currency || 'ر.س'

  const handleSelectCategory = (id: string) => {
    setActiveCategory(id)
    const element = document.getElementById(`category-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const openItem = (item: MenuItem) => {
    setSelectedItem(item)
    // Initialize default selections
    const initialSelections: Record<string, string[]> = {}
    item.groups.forEach(group => {
      if (group.selection_type === 'single' && group.options.length > 0) {
        // Find default or first
        const def = group.options.find(o => o.is_default) || group.options[0]
        initialSelections[group.id] = [def.id]
      } else {
        initialSelections[group.id] = group.options.filter(o => o.is_default).map(o => o.id)
      }
    })
    setSelections(initialSelections)
  }

  const toggleSelection = (groupId: string, optionId: string, selectionType: string) => {
    setSelections(prev => {
      const current = prev[groupId] || []
      if (selectionType === 'single') {
        return { ...prev, [groupId]: [optionId] }
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) }
        } else {
          return { ...prev, [groupId]: [...current, optionId] }
        }
      }
    })
  }

  const calculateTotal = () => {
    if (!selectedItem) return 0
    let total = selectedItem.base_price || 0
    const hasVariantGroup = selectedItem.groups.some(g => g.kind === 'variant')
    let variantSelected = false

    selectedItem.groups.forEach(group => {
      const selectedOptionIds = selections[group.id] || []
      selectedOptionIds.forEach(optId => {
        const option = group.options.find(o => o.id === optId)
        if (option) {
          if (group.kind === 'variant') {
            if (selectedItem.base_price === null && !variantSelected) {
              total = option.price || 0
              variantSelected = true
            } else if (selectedItem.base_price !== null) {
              // Wait, if item.base_price exists and variant is selected, does variant replace or add?
              // Prompt: "For group kind variant, option.price is the actual item price."
              total = option.price || 0
              variantSelected = true
            }
          } else {
            total += (option.price || 0)
          }
        }
      })
    })

    if (selectedItem.base_price === null && hasVariantGroup && !variantSelected) {
      return null // "اختر النوع"
    }

    return total
  }

  const total = calculateTotal()

  return (
    <>
      {/* Category Nav */}
      <div className="sticky top-[72px] bg-white z-10 border-b overflow-x-auto whitespace-nowrap px-4 py-3 flex gap-4 hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleSelectCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="px-4 py-6 space-y-8">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id)
          if (catItems.length === 0) return null

          return (
            <div key={cat.id} id={`category-${cat.id}`} className="scroll-mt-[140px]">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{cat.name}</h2>
              <div className="space-y-4">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="bg-white rounded-xl p-4 flex gap-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                      <div className="mt-2 text-blue-600 font-semibold">
                        {item.base_price !== null ? (
                          <span>{item.base_price} {currency}</span>
                        ) : (
                          <span>اختر النوع</span>
                        )}
                      </div>
                    </div>
                    {item.image_url && (
                      <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating WhatsApp CTA */}
      {settings?.whatsapp && (
        <a
          href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 right-6 bg-green-500 text-white py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold z-20 hover:bg-green-600 active:scale-95 transition-all"
        >
          <span>الطلب عبر الواتساب</span>
        </a>
      )}

      {/* Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-gray-50 w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col rounded-t-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
            <div className="relative shrink-0">
              {selectedItem.image_url && (
                <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-48 object-cover" />
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 left-4 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 bg-white shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h2>
              {selectedItem.description && <p className="text-gray-500 mt-2">{selectedItem.description}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {selectedItem.groups.map(group => (
                <div key={group.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">{group.title}</h3>
                    {group.is_required && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">إجباري</span>}
                  </div>
                  
                  <div className="space-y-3">
                    {group.options.map(opt => {
                      const isSelected = selections[group.id]?.includes(opt.id)
                      const isSingle = group.selection_type === 'single'
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type={isSingle ? 'radio' : 'checkbox'}
                              name={`group-${group.id}`}
                              checked={isSelected}
                              onChange={() => toggleSelection(group.id, opt.id, group.selection_type || 'single')}
                              className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-900">{opt.name}</span>
                          </div>
                          {(opt.price || 0) > 0 && (
                            <span className="text-sm text-gray-600">
                              {group.kind === 'variant' ? '' : '+'}{opt.price} {currency}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">المجموع:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {total !== null ? `${total} ${currency}` : 'اختر النوع'}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
