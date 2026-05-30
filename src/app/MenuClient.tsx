'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/types/supabase'
import { ChevronRight, Info, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import PublicFooter from '@/components/public/PublicFooter'

const isSupabaseOrLocal = (url: string) => url.startsWith('/') || url.includes('supabase.co');

const SafeImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  if (isSupabaseOrLocal(src)) {
    return <Image src={src} alt={alt} fill className={className} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`w-full h-full ${className || ''}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
};

type Settings = Database['public']['Tables']['restaurant_settings']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Option = Database['public']['Tables']['item_options']['Row']
type OptionGroup = Database['public']['Tables']['item_option_groups']['Row'] & { options: Option[], source?: 'item' | 'template' }
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & { groups: OptionGroup[] }

type CartItem = {
  id: string
  item: MenuItem
  selections: Record<string, string[]>
  quantity: number
  total: number
}

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

  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const currency = settings?.currency || 'ر.س'

  // Client-side sort fallback for items (sort_order then created_at)
  const sortedItems = [...items].sort((a, b) => {
    const sortA = a.sort_order ?? 0;
    const sortB = b.sort_order ?? 0;
    if (sortA !== sortB) return sortA - sortB;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });

  const getValidImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('/menu-assets/')) return null;
    return url;
  };



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

  const addToCart = () => {
    if (!selectedItem || total === null || validationError) return

    setCart(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      item: selectedItem,
      selections,
      quantity: 1,
      total
    }])
    setSelectedItem(null)
  }

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(c => c.id !== cartItemId))
  }

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id === cartItemId) {
        const newQuantity = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQuantity };
      }
      return c;
    }));
  }

  const clearCart = () => {
    setCart([]);
  }

  const validateSelection = (): string | null => {
    if (!selectedItem) return null;
    for (const group of selectedItem.groups) {
      const selected = selections[group.id] || [];
      if (group.is_required && group.selection_type === 'single' && selected.length === 0) {
        return `يرجى اختيار خيار واحد على الأقل من ${group.title}`;
      }
      if (group.is_required && group.selection_type === 'multiple' && group.min_select !== null && selected.length < group.min_select) {
        return `يرجى اختيار ${group.min_select} خيارات على الأقل من ${group.title}`;
      }
      if (group.selection_type === 'multiple' && group.max_select !== null && selected.length > group.max_select) {
        return `لا يمكنك اختيار أكثر من ${group.max_select} خيارات من ${group.title}`;
      }
    }
    return null;
  }

  const validationError = validateSelection();

  const cartTotal = cart.reduce((sum, current) => sum + current.total * current.quantity, 0)

  const generateWhatsAppMessage = () => {
    let msg = `*طلب جديد من منيو أصالة:* 🛒\n\n`

    cart.forEach((cartItem, index) => {
      msg += `${index + 1}) *${cartItem.item.name}*\n`
      msg += `الكمية: ${cartItem.quantity}\n`

      // Add selections
      cartItem.item.groups.forEach(group => {
        const selectedOptionIds = cartItem.selections[group.id] || []
        const selectedOptions = group.options.filter(o => selectedOptionIds.includes(o.id))
        if (selectedOptions.length > 0) {
          msg += `${group.title}:\n`
          selectedOptions.forEach(o => {
            if ((o.price || 0) > 0) {
              msg += `- ${o.name} +${o.price} ${currency}\n`
            } else {
              msg += `- ${o.name}\n`
            }
          })
        }
      })
      msg += `السعر الفرعي: ${cartItem.total} ${currency}\n\n`
    })

    msg += `*الإجمالي: ${cartTotal} ${currency}*`
    return encodeURIComponent(msg)
  }

  return (
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-burgundy/20 flex justify-center">
      <div className="w-full max-w-6xl bg-[#fbf9f7] min-h-screen shadow-2xl relative pb-28 flex flex-col md:border-x md:border-brand-border">

        {/* Compact Restaurant Header */}
        <div className="bg-[#fbf9f7] pt-6 pb-4 px-5 flex flex-col items-center text-center border-b border-brand-border/50">
          <div className="w-32 h-32 sm:w-40 sm:h-40 relative flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Asalet Mandi Logo"
              fill
              className="object-contain drop-shadow-sm"
              priority
            />
          </div>
        </div>

        {/* Featured Products */}
        {activeCategoryView === null && sortedItems.filter(i => i.is_featured).length > 0 && (
          <div className="pt-8 pb-2 overflow-hidden">
            <h2 className="text-[20px] font-black text-brand-text mb-4 px-5">المنتجات المميزة</h2>
            {(() => {
              const baseFeatured = sortedItems.filter(i => i.is_featured)
              // Ensure we have enough items to fill the screen twice (for seamless 50% translation)
              // Multiply base items so we have at least 10 items total, and ensure it's an even multiplier
              const repeats = Math.max(4, Math.ceil(12 / Math.max(1, baseFeatured.length)))
              const evenRepeats = repeats % 2 === 0 ? repeats : repeats + 1
              const marqueeItems = Array(evenRepeats).fill(baseFeatured).flat()

              return (
                <div className="overflow-x-auto hide-scrollbar pb-4 px-5">
                  <div className="flex gap-4 pl-4 w-max animate-marquee">
                    {marqueeItems.map((item, index) => (
                      <div 
                        key={`${item.id}-${index}`}
                        onClick={() => openItem(item)}
                        className="shrink-0 w-[160px] sm:w-[200px] bg-[#fbf9f7] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border cursor-pointer flex flex-col active:scale-95 transition-all duration-200"
                      >
                        <div className="aspect-square relative w-full bg-brand-cream border-b border-brand-border/50">
                          {getValidImageUrl(item.image_url) ? (
                            <SafeImage src={getValidImageUrl(item.image_url)!} alt={item.name} className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-cream">
                               <ImageIcon className="w-8 h-8 text-brand-beige" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex flex-col flex-1 bg-[#fbf9f7]">
                          <h3 className="font-bold text-[14px] text-brand-text line-clamp-2 leading-tight mb-2">{item.name}</h3>
                          <div className="mt-auto">
                            <span className="text-brand-burgundy font-bold text-[14px]">
                              {item.base_price !== null ? `${item.base_price} ${currency}` : 'اختر النوع'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Categories View */}
        {activeCategoryView === null && (
          <div className="px-5 py-6">
            <div className="flex items-center mb-6">
              <h2 className="text-[22px] font-black text-brand-text">قائمة الطعام</h2>
            </div>
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-[#fbf9f7] rounded-2xl border border-brand-border shadow-sm">
                <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                <p className="text-brand-brown font-medium">لا يوجد أقسام متاحة حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat, i) => (
                  <div
                    key={cat.id}
                    onClick={() => openCategory(cat.id)}
                    className="bg-[#fbf9f7] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border active:scale-95 transition-all duration-200 cursor-pointer flex flex-col"
                    style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}
                  >
                    <div className="aspect-square relative w-full bg-brand-cream overflow-hidden border-b border-brand-border/50">
                      {(() => {
                        const validCatImg = getValidImageUrl(cat.image_url);
                        const firstItemImg = !validCatImg ? getValidImageUrl(sortedItems.find(i => i.category_id === cat.id && getValidImageUrl(i.image_url))?.image_url) : null;
                        const finalImg = validCatImg || firstItemImg;
                        
                        return finalImg ? (
                          <SafeImage src={finalImg} alt={cat.name} className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-cream p-4 text-center">
                            <ImageIcon className="w-8 h-8 text-brand-beige mb-2" />
                            <span className="text-brand-brown font-bold text-[13px] leading-tight">{cat.name}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="p-3 text-center flex items-center justify-center min-h-[3rem]">
                      <h3 className="text-brand-burgundy font-bold text-[14px] leading-tight line-clamp-2">{cat.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Modal Overlay */}
        {activeCategoryView !== null && (
          <div className="flex flex-col">
            {/* Header with swipeable tabs and back button */}
            <div className="sticky top-0 z-20 bg-[#fbf9f7]/95 backdrop-blur-md border-b border-brand-border shadow-sm pt-2 pb-2">
              <div className="flex items-center px-4 gap-3">
                <button
                  onClick={() => setActiveCategoryView(null)}
                  className="w-10 h-10 shrink-0 bg-[#fbf9f7] shadow-sm border border-brand-border rounded-full flex items-center justify-center hover:bg-brand-beige active:scale-90 transition-all text-brand-burgundy"
                  aria-label="العودة للأقسام"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-2.5 snap-x py-2 pr-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategoryView(cat.id)}
                      className={`shrink-0 px-5 py-2 rounded-full text-[14px] font-bold snap-center transition-all duration-200 border ${activeCategoryView === cat.id
                        ? 'bg-brand-burgundy text-brand-cream border-brand-burgundy shadow-sm'
                        : 'bg-brand-beige text-brand-burgundy border-transparent shadow-sm'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="px-5 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {sortedItems.filter(i => i.category_id === activeCategoryView).length === 0 ? (
                <div className="text-center py-12 bg-[#fbf9f7] rounded-2xl border border-brand-border shadow-sm">
                  <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                  <p className="text-brand-brown font-medium">لا يوجد منتجات في هذا القسم</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {sortedItems.filter(i => i.category_id === activeCategoryView).map((item, i) => (
                    <div
                      key={item.id}
                      onClick={() => openItem(item)}
                      className="bg-[#fbf9f7] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border active:scale-95 transition-all duration-200 cursor-pointer flex flex-col group"
                      style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-brand-cream relative w-full overflow-hidden border-b border-brand-border/50">
                        {getValidImageUrl(item.image_url) ? (
                          <SafeImage src={getValidImageUrl(item.image_url)!} alt={item.name} className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-brand-beige" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-3.5 flex flex-col flex-1">
                        <h3 className="font-bold text-brand-text text-[14px] mb-1 line-clamp-2 leading-tight">{item.name}</h3>
                        {item.description && (
                          <p className="text-[12px] text-brand-brown line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                        )}

                        <div className="mt-auto pt-2 flex items-center justify-between">
                          <span className="text-brand-gold font-black text-[14px]">
                            {item.base_price !== null ? `${item.base_price} ${currency}` : 'اختر النوع'}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-brand-cream text-brand-burgundy flex items-center justify-center transition-colors group-hover:bg-brand-burgundy group-hover:text-white">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
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

        {/* Floating Cart UI */}
        {!isCartOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe">
            <div className="w-full max-w-6xl relative h-0">
              {cart.length > 0 ? (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="absolute bottom-6 left-5 right-5 sm:left-auto sm:right-5 sm:w-[320px] pointer-events-auto bg-brand-burgundy text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-brand-burgundy-dark transition-all animate-in slide-in-from-bottom-5"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                    </svg>
                    <span>السلة</span>
                  </div>
                  <div className="bg-[#fbf9f7]/20 px-3 py-1 rounded-full text-sm font-black">
                    {cartTotal} {currency}
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="absolute bottom-[90px] right-4 sm:right-6 pointer-events-auto bg-brand-cream border-2 border-brand-burgundy text-brand-burgundy w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-brand-beige active:scale-90 transition-all animate-in fade-in zoom-in"
                  aria-label="فتح السلة"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Item Details Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />

            {/* Modal Content */}
            <div className="relative w-full max-w-[500px] bg-[#fbf9f7] h-[92dvh] sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl flex flex-col rounded-t-3xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full sm:fade-in duration-300">
              {/* Modal Image Header */}
              <div className="relative shrink-0 w-full bg-[#fbf9f7] pt-14 pb-4 px-6 border-b border-brand-border/50 flex flex-col items-center">
                <div className="relative w-full max-w-[260px] sm:max-w-[300px] aspect-square bg-[#7A1524] rounded-2xl shadow-sm overflow-hidden">
                  {getValidImageUrl(selectedItem.image_url) ? (
                    <SafeImage src={getValidImageUrl(selectedItem.image_url)!} alt={selectedItem.name} className="object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-white/30" />
                    </div>
                  )}
                </div>

                {/* Floating Close Button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 left-4 bg-white text-brand-text border border-gray-200 w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all hover:bg-gray-50 z-10"
                  aria-label="إغلاق"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Title & Description */}
              <div className="p-5 bg-[#fbf9f7] shrink-0 z-10 border-b border-brand-border/50">
                <h2 className="text-2xl font-black text-brand-text leading-tight">{selectedItem.name}</h2>
                {selectedItem.description && (
                  <p className="text-brand-brown mt-2 text-[14px] leading-relaxed">{selectedItem.description}</p>
                )}
              </div>

              {/* Options Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 relative z-0">
                {selectedItem.groups.map(group => (
                  <div key={group.id} className="bg-[#fbf9f7] rounded-2xl p-4 shadow-sm border border-brand-border">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-brand-text">{group.title}</h3>
                      {group.is_required && (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-burgundy/10 text-brand-burgundy px-2.5 py-1 rounded-full">
                          إجباري
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {group.options.map(opt => {
                        const isSelected = selections[group.id]?.includes(opt.id)
                        const isSingle = group.selection_type === 'single'
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleSelection(group.id, opt.id, group.selection_type || 'single')}
                            role={isSingle ? "radio" : undefined}
                            aria-checked={isSingle ? isSelected : undefined}
                            aria-pressed={!isSingle ? isSelected : undefined}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.99] cursor-pointer text-right ${
                              isSelected
                                ? 'border-brand-burgundy bg-brand-burgundy/10 shadow-sm'
                                : 'border-brand-border bg-[#fbf9f7] hover:border-brand-gold/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isSelected && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand-burgundy shrink-0 animate-in fade-in zoom-in duration-150">
                                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              <span className={`text-[15px] ${isSelected ? 'font-bold text-brand-burgundy' : 'font-medium text-brand-text'}`}>
                                {opt.name}
                              </span>
                            </div>
                            {(opt.price || 0) > 0 && (
                              <span className={`text-[14px] font-bold shrink-0 ${isSelected ? 'text-brand-burgundy' : 'text-brand-gold'}`}>
                                {group.kind === 'variant' ? '' : '+'}{opt.price} {currency}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 sm:p-5 pb-8 sm:pb-5 bg-[#fbf9f7] border-t border-brand-border/50 shrink-0 sticky bottom-0 z-20 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-brand-brown font-medium text-sm">المجموع</span>
                  <span className="text-2xl font-black text-brand-text">
                    {total !== null ? `${total} ${currency}` : <span className="text-[15px] text-brand-brown/50 font-normal">اختر النوع</span>}
                  </span>
                </div>
                {validationError && (
                  <div className="mb-3 text-brand-burgundy text-sm font-medium px-2 text-center bg-brand-burgundy/10 py-2 rounded-lg">
                    {validationError}
                  </div>
                )}
                <button
                  onClick={addToCart}
                  disabled={total === null || validationError !== null}
                  className="w-full bg-brand-burgundy text-white py-4 rounded-2xl font-bold text-[17px] hover:bg-[#681010] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-burgundy/20"
                >
                  إضافة للسلة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart Modal */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

            <div className="relative w-full max-w-[500px] bg-[#fbf9f7] h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col rounded-t-2xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">

              {/* Header */}
              <div className="p-5 bg-[#fbf9f7] border-b border-brand-border/50 shrink-0 flex justify-between items-center z-10 rounded-t-2xl">
                <h2 className="text-xl font-black text-brand-text">سلة الطلبات</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-brand-cream text-brand-burgundy border border-brand-border/50 w-9 h-9 rounded-full flex items-center justify-center hover:bg-brand-beige transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Cart Items Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-border/50">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-beige"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </div>
                    <p className="text-brand-brown font-medium">السلة فارغة</p>
                  </div>
                ) : (
                  cart.map((cartItem) => (
                    <div key={cartItem.id} className="bg-brand-cream rounded-2xl p-4 shadow-sm border border-brand-border/50 flex gap-4">
                      {getValidImageUrl(cartItem.item.image_url) ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#fbf9f7] border border-brand-border/30">
                          <SafeImage src={getValidImageUrl(cartItem.item.image_url)!} alt={cartItem.item.name} className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-[#fbf9f7] flex items-center justify-center shrink-0 border border-brand-border/30">
                          <ImageIcon className="w-6 h-6 text-brand-beige" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-brand-text text-[14px] leading-tight pr-2">{cartItem.item.name}</h4>
                          <button onClick={() => removeFromCart(cartItem.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg shrink-0">
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>

                        <div className="mb-1.5 space-y-0.5">
                          {cartItem.item.groups.map(group => {
                            const selectedOptionIds = cartItem.selections[group.id] || []
                            const selectedOptions = group.options.filter(o => selectedOptionIds.includes(o.id))
                            if (selectedOptions.length === 0) return null

                            return (
                              <p key={group.id} className="text-[12px] text-brand-brown">
                                <span className="font-medium text-brand-text">{group.title}:</span> {selectedOptions.map(o => (o.price || 0) > 0 ? `${o.name} (+${o.price} ${currency})` : o.name).join('، ')}
                              </p>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-brand-border/30">
                          <p className="text-brand-burgundy font-black text-[14px]">{cartItem.total * cartItem.quantity} {currency}</p>
                          <div className="flex items-center gap-3 bg-brand-cream border border-brand-border/80 rounded-lg px-2 py-0.5 shadow-sm">
                            <button onClick={() => updateQuantity(cartItem.id, 1)} className="text-brand-burgundy font-bold text-lg leading-none active:scale-90">+</button>
                            <span className="font-bold text-sm min-w-[2ch] text-center">{cartItem.quantity}</span>
                            <button onClick={() => updateQuantity(cartItem.id, -1)} disabled={cartItem.quantity <= 1} className="text-brand-brown font-bold text-lg leading-none active:scale-90 disabled:opacity-30 disabled:active:scale-100">-</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="p-5 bg-[#fbf9f7] border-t border-brand-border/50 shrink-0 sm:rounded-b-2xl">
                <div className="flex justify-between items-end mb-4 px-1">
                  <div className="flex flex-col">
                    <span className="text-brand-brown font-medium text-sm mb-1">الإجمالي</span>
                    {cart.length > 0 && (
                      <button onClick={clearCart} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1 active:scale-95 transition-transform">
                        تفريغ السلة
                      </button>
                    )}
                  </div>
                  <span className="text-2xl font-black text-brand-gold">
                    {cartTotal} {currency}
                  </span>
                </div>
                <a
                  href={cart.length > 0 && settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${generateWhatsAppMessage()}` : '#'}
                  target={cart.length > 0 ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (cart.length === 0 || !settings?.whatsapp) {
                      e.preventDefault()
                    } else {
                      setIsCartOpen(false)
                      // Do not clear cart as per user request
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[17px] transition-all bg-[#25D366] text-white ${cart.length > 0
                    ? 'hover:bg-[#20bd5a] shadow-md shadow-[#25D366]/20 active:scale-[0.98]'
                    : 'opacity-60 cursor-not-allowed shadow-none'
                    }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  <span>إرسال الطلب عبر الواتساب</span>
                </a>
              </div>
            </div>
          </div>
        )}

        <PublicFooter settings={settings} />

        <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        .animate-marquee {
          animation: marquee-rtl 40s linear infinite;
          will-change: transform;
        }
        .animate-marquee:hover,
        .animate-marquee:active {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none !important;
          }
        }
        body {
          background-color: #F7F1E8;
        }
      `}</style>
      </div>
    </div>
  )
}
