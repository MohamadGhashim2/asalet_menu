'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/types/supabase'
import { ChevronRight, Info, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

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
  const [activeCategoryView, setActiveCategoryView] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selections, setSelections] = useState<Record<string, string[]>>({})

  const currency = settings?.currency || 'ر.س'

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeCategoryView])

  const openCategory = (id: string) => {
    setActiveCategoryView(id)
  }

  const openItem = (item: MenuItem) => {
    setSelectedItem(item)
    const initialSelections: Record<string, string[]> = {}
    item.groups.forEach(group => {
      if (group.selection_type === 'single' && group.options.length > 0) {
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
            total = option.price || 0
            variantSelected = true
          } else {
            total += (option.price || 0)
          }
        }
      })
    })

    if (selectedItem.base_price === null && hasVariantGroup && !variantSelected) {
      return null
    }

    return total
  }

  const total = calculateTotal()

  return (
    <div className="pb-24 min-h-screen bg-brand-cream">
      
      {/* Restaurant Hero / Header */}
      <div className="bg-brand-burgundy text-white pt-12 pb-8 px-4 rounded-b-3xl shadow-md relative overflow-hidden">
        {/* Subtle pattern or texture overlay could go here */}
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white p-2 rounded-full shadow-lg mb-4 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="Asalet Mandi Logo" 
              width={80} 
              height={80} 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold mb-1 tracking-wide">مطعم أصالة المندي</h1>
          <p className="text-brand-beige text-sm max-w-sm mx-auto opacity-90">
            طعم الأصالة في كل طبق
          </p>
          <div className="mt-4 w-12 h-1 bg-brand-gold rounded-full" />
        </div>
      </div>

      {/* Categories View */}
      {activeCategoryView === null && (
        <div className="px-4 py-8">
          <h2 className="text-2xl font-bold text-brand-text mb-6">قائمة الطعام</h2>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-brand-brown/60">
              <Info className="w-12 h-12 mx-auto mb-3 text-brand-beige" />
              <p>لا يوجد أقسام متاحة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => openCategory(cat.id)}
                  className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform cursor-pointer bg-white border border-brand-border"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-beige to-white group-hover:scale-105 transition-transform duration-500" />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-burgundy/90 via-brand-burgundy/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-brand-cream font-bold text-lg leading-tight drop-shadow-sm">{cat.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products View */}
      {activeCategoryView !== null && (
        <div className="flex flex-col">
          {/* Header with swipeable tabs and back button */}
          <div className="sticky top-0 z-20 bg-brand-cream/95 backdrop-blur-lg border-b border-brand-border shadow-sm">
            <div className="flex items-center px-4 py-3 gap-3">
              <button
                onClick={() => setActiveCategoryView(null)}
                className="w-10 h-10 shrink-0 bg-white border border-brand-border rounded-full flex items-center justify-center hover:bg-brand-beige transition-colors shadow-sm"
                aria-label="العودة للأقسام"
              >
                <ChevronRight className="w-6 h-6 text-brand-burgundy" />
              </button>
              
              <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-2 snap-x py-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryView(cat.id)}
                    className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold snap-center transition-all border ${
                      activeCategoryView === cat.id 
                        ? 'bg-brand-burgundy text-white border-brand-burgundy shadow-md' 
                        : 'bg-white text-brand-burgundy border-brand-border hover:bg-brand-beige'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="px-4 py-6 animate-in fade-in duration-300">
            {items.filter(i => i.category_id === activeCategoryView).length === 0 ? (
              <div className="text-center py-20 text-brand-brown/60">
                <Info className="w-12 h-12 mx-auto mb-3 text-brand-border" />
                <p>لا يوجد منتجات في هذا القسم</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.filter(i => i.category_id === activeCategoryView).map(item => (
                  <div
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-brand-border active:scale-95 transition-transform cursor-pointer flex flex-col"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-brand-beige relative w-full overflow-hidden">
                      {item.image_url ? (
                        <Image 
                          src={item.image_url} 
                          alt={item.name} 
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-brand-brown/20">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-brand-text text-sm mb-1 line-clamp-2 leading-tight">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-brand-brown/80 line-clamp-1 mb-2">{item.description}</p>
                      )}
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="text-brand-gold font-bold text-sm bg-brand-gold/10 px-2 py-0.5 rounded-md">
                          {item.base_price !== null ? (
                            `${item.base_price} ${currency}`
                          ) : (
                            'حسب الاختيار'
                          )}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-brand-burgundy/10 text-brand-burgundy flex items-center justify-center text-lg font-light">
                          +
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating WhatsApp CTA */}
      {settings?.whatsapp && (
        <a
          href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 right-6 md:left-auto md:w-72 bg-[#25D366] text-white py-3.5 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 font-bold z-20 hover:bg-[#20bd5a] active:scale-95 transition-transform"
        >
          <span>الطلب عبر الواتساب</span>
        </a>
      )}

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedItem(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-brand-cream h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col rounded-t-3xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
            {/* Modal Image Header */}
            <div className="relative shrink-0 w-full aspect-video bg-white">
              {selectedItem.image_url ? (
                <Image src={selectedItem.image_url} alt={selectedItem.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-beige to-white" />
              )}
              
              {/* Floating Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-brand-burgundy w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            
            {/* Title & Description */}
            <div className="p-5 bg-white shrink-0 rounded-b-3xl shadow-sm z-10">
              <h2 className="text-2xl font-bold text-brand-burgundy leading-tight">{selectedItem.name}</h2>
              {selectedItem.description && (
                <p className="text-brand-brown mt-2 text-sm leading-relaxed">{selectedItem.description}</p>
              )}
            </div>

            {/* Options Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedItem.groups.map(group => (
                <div key={group.id} className="bg-white rounded-2xl p-4 shadow-sm border border-brand-border">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-brand-text">{group.title}</h3>
                    {group.is_required && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-burgundy/10 text-brand-burgundy px-2.5 py-1 rounded-full">
                        إجباري
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {group.options.map(opt => {
                      const isSelected = selections[group.id]?.includes(opt.id)
                      const isSingle = group.selection_type === 'single'
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                            isSelected 
                              ? 'border-brand-gold bg-brand-gold/5 shadow-sm' 
                              : 'border-brand-border hover:border-brand-gold/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                              isSingle ? 'rounded-full' : 'rounded-md'
                            } ${
                              isSelected ? 'border-brand-gold bg-brand-gold' : 'border-brand-border'
                            }`}>
                              {isSelected && (
                                <div className={`bg-white ${isSingle ? 'w-2 h-2 rounded-full' : 'w-3 h-3 text-white flex items-center justify-center'}`}>
                                  {!isSingle && (
                                    <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3">
                                      <path d="M3 7.5L6 10.5L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className={`font-medium text-sm ${isSelected ? 'text-brand-text font-bold' : 'text-brand-brown'}`}>
                              {opt.name}
                            </span>
                          </div>
                          {(opt.price || 0) > 0 && (
                            <span className={`text-sm font-semibold ${isSelected ? 'text-brand-gold' : 'text-brand-brown/70'}`}>
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

            {/* Bottom Action Bar */}
            <div className="p-4 bg-white border-t border-brand-border shrink-0">
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-brand-brown font-medium">المجموع</span>
                <span className="text-2xl font-black text-brand-gold">
                  {total !== null ? `${total} ${currency}` : <span className="text-lg text-brand-burgundy/60">اختر النوع المطلوب</span>}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full bg-brand-burgundy text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-burgundy-dark active:scale-[0.98] transition-all shadow-lg shadow-brand-burgundy/20"
              >
                إضافة للسلة / إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
