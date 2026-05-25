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
    if (!selectedItem || total === null) return

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

  const cartTotal = cart.reduce((sum, current) => sum + current.total * current.quantity, 0)

  const generateWhatsAppMessage = () => {
    let msg = `*طلب جديد من القائمة* 🛒\n\n`

    cart.forEach(cartItem => {
      msg += `▪️ *${cartItem.item.name}* (x${cartItem.quantity})\n`

      // Add selections
      cartItem.item.groups.forEach(group => {
        const selectedOptionIds = cartItem.selections[group.id] || []
        const selectedOptions = group.options.filter(o => selectedOptionIds.includes(o.id))
        if (selectedOptions.length > 0) {
          msg += `   - ${group.title}: ${selectedOptions.map(o => o.name).join('، ')}\n`
        }
      })
      msg += `   السعر: ${cartItem.total} ${currency}\n\n`
    })

    msg += `-------------------\n`
    msg += `*الإجمالي:* ${cartTotal} ${currency}`

    return encodeURIComponent(msg)
  }

  return (
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-burgundy/20 flex justify-center">
      <div className="w-full max-w-6xl bg-[#FFFDF9] min-h-screen shadow-2xl relative pb-28 flex flex-col md:border-x md:border-brand-border">

        {/* Compact Restaurant Header */}
        <div className="bg-[#FFFDF9] pt-10 pb-8 px-5 border-b border-brand-border flex flex-col items-center text-center">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Asalet Mandi Logo"
              width={96}
              height={96}
              className="object-contain drop-shadow-sm"
              priority
            />
          </div>
          <h1 className="text-[28px] md:text-[32px] font-black mb-1.5 tracking-tight text-brand-burgundy">مطعم أصالة المندي</h1>
          <p className="text-brand-brown text-[15px] md:text-[16px] font-medium">
            طعم الأصالة في كل طبق
          </p>
        </div>

        {/* Categories View */}
        {activeCategoryView === null && (
          <div className="px-5 py-8">
            <div className="flex items-center mb-6">
              <h2 className="text-[22px] font-black text-brand-text">قائمة الطعام</h2>
            </div>
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-[#FFFDF9] rounded-2xl border border-brand-border shadow-sm">
                <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                <p className="text-brand-brown font-medium">لا يوجد أقسام متاحة حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat, i) => (
                  <div
                    key={cat.id}
                    onClick={() => openCategory(cat.id)}
                    className="bg-[#FFFDF9] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border active:scale-95 transition-all duration-200 cursor-pointer flex flex-col"
                    style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}
                  >
                    <div className="aspect-square relative w-full bg-brand-cream overflow-hidden border-b border-brand-border/50">
                      {cat.image_url || items.find(i => i.category_id === cat.id && i.image_url)?.image_url ? (
                        <Image
                          src={cat.image_url || items.find(i => i.category_id === cat.id && i.image_url)?.image_url || ''}
                          alt={cat.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-brand-cream p-4 text-center">
                          <span className="text-brand-brown font-bold text-[13px] leading-tight">{cat.name}</span>
                        </div>
                      )}
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
            <div className="sticky top-0 z-20 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-brand-border shadow-sm pt-2 pb-2">
              <div className="flex items-center px-4 gap-3">
                <button
                  onClick={() => setActiveCategoryView(null)}
                  className="w-10 h-10 shrink-0 bg-[#FFFDF9] shadow-sm border border-brand-border rounded-full flex items-center justify-center hover:bg-brand-beige active:scale-90 transition-all text-brand-burgundy"
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
              {items.filter(i => i.category_id === activeCategoryView).length === 0 ? (
                <div className="text-center py-12 bg-[#FFFDF9] rounded-2xl border border-brand-border shadow-sm">
                  <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                  <p className="text-brand-brown font-medium">لا يوجد منتجات في هذا القسم</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {items.filter(i => i.category_id === activeCategoryView).map((item, i) => (
                    <div
                      key={item.id}
                      onClick={() => openItem(item)}
                      className="bg-[#FFFDF9] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border active:scale-95 transition-all duration-200 cursor-pointer flex flex-col group"
                      style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-brand-cream relative w-full overflow-hidden border-b border-brand-border/50">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
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

        {/* Floating Cart Button */}
        {cart.length > 0 && !isCartOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center">
            <div className="w-full max-w-[560px] relative">
              <button
                onClick={() => setIsCartOpen(true)}
                className="absolute bottom-6 left-5 right-5 pointer-events-auto bg-brand-burgundy text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-brand-burgundy-dark transition-all animate-in slide-in-from-bottom-5"
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                  </svg>
                  <span>السلة</span>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-black">
                  {cartTotal} {currency}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Item Details Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />

            {/* Modal Content */}
            <div className="relative w-full max-w-[500px] bg-[#FFFDF9] h-[92vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col rounded-t-2xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full sm:fade-in duration-300">
              {/* Modal Image Header */}
              <div className="relative shrink-0 w-full aspect-square bg-brand-cream border-b border-brand-border/50">
                {selectedItem.image_url ? (
                  <Image src={selectedItem.image_url} alt={selectedItem.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-cream flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-brand-beige" />
                  </div>
                )}

                {/* Floating Close Button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-brand-text border border-brand-border w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all hover:bg-white"
                  aria-label="إغلاق"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Title & Description */}
              <div className="p-5 bg-[#FFFDF9] shrink-0 rounded-b-2xl shadow-sm z-10 border-b border-brand-border/50">
                <h2 className="text-2xl font-black text-brand-text leading-tight">{selectedItem.name}</h2>
                {selectedItem.description && (
                  <p className="text-brand-brown mt-2 text-[14px] leading-relaxed">{selectedItem.description}</p>
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
                            className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] ${isSelected
                              ? 'border-brand-burgundy bg-brand-burgundy/5'
                              : 'border-brand-border bg-white hover:border-brand-gold/30'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-5 h-5 border-2 transition-colors ${isSingle ? 'rounded-full' : 'rounded-md'
                                } ${isSelected ? 'border-brand-burgundy bg-brand-burgundy' : 'border-brand-border bg-white'
                                }`}>
                                {isSelected && (
                                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span className={`text-[15px] ${isSelected ? 'font-bold text-brand-burgundy' : 'font-medium text-brand-text'}`}>
                                {opt.name}
                              </span>
                            </div>
                            {(opt.price || 0) > 0 && (
                              <span className={`text-[14px] font-bold ${isSelected ? 'text-brand-burgundy' : 'text-brand-brown'}`}>
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
              <div className="p-5 bg-white border-t border-brand-border/50 shrink-0">
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-brand-brown font-medium text-sm">المجموع</span>
                  <span className="text-2xl font-black text-brand-text">
                    {total !== null ? `${total} ${currency}` : <span className="text-[15px] text-brand-brown/50 font-normal">اختر الخيارات</span>}
                  </span>
                </div>
                <button
                  onClick={addToCart}
                  disabled={total === null}
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

            <div className="relative w-full max-w-[500px] bg-[#FFFDF9] h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col rounded-t-2xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">

              {/* Header */}
              <div className="p-5 bg-[#FFFDF9] border-b border-brand-border/50 shrink-0 flex justify-between items-center z-10 rounded-t-2xl">
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
                      {cartItem.item.image_url ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border border-brand-border/30">
                          <Image src={cartItem.item.image_url} alt={cartItem.item.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center shrink-0 border border-brand-border/30">
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
                                <span className="font-medium text-brand-text">{group.title}:</span> {selectedOptions.map(o => o.name).join('، ')}
                              </p>
                            )
                          })}
                        </div>
                        <p className="text-brand-burgundy font-black text-[14px] mt-auto">{cartItem.total} {currency}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="p-5 bg-[#FFFDF9] border-t border-brand-border/50 shrink-0 sm:rounded-b-2xl">
                <div className="flex justify-between items-end mb-4 px-1">
                  <span className="text-brand-brown font-medium text-sm">الإجمالي</span>
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
                      setCart([])
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[17px] transition-all ${cart.length > 0
                    ? 'bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-md shadow-[#25D366]/20 active:scale-[0.98]'
                    : 'bg-brand-cream text-brand-brown/50 cursor-not-allowed shadow-none'
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
        body {
          background-color: #F7F1E8;
        }
      `}</style>
      </div>
    </div>
  )
}
