'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { Database } from '@/types/supabase'
import type { PublicMenuPayload } from '@/lib/public-menu-data'
import { ChevronLeft, ChevronRight, Info, Image as ImageIcon, MapPin } from 'lucide-react'
import Image from 'next/image'
import PublicFooter from '@/components/public/PublicFooter'
import LanguageToggle from '@/components/i18n/LanguageToggle'
import { useLocale } from '@/i18n/LocaleProvider'
import type { CatalogLocale } from '@/lib/catalog-locale'

const MENU_IMAGES_PUBLIC_PREFIX = '/storage/v1/object/public/menu-images/'
const PUBLIC_MENU_SESSION_CACHE_KEY_PREFIX = 'asalet-public-menu-v3'
const PUBLIC_MENU_SESSION_CACHE_TTL = 5 * 60 * 1000

const isOptimizedMenuImage = (url: string) => {
  if (url.startsWith('/')) return true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false

  try {
    const parsedUrl = new URL(url)
    const parsedSupabaseUrl = new URL(supabaseUrl)
    return parsedUrl.origin === parsedSupabaseUrl.origin && parsedUrl.pathname.startsWith(MENU_IMAGES_PUBLIC_PREFIX)
  } catch {
    return false
  }
}

const SafeImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-brand-cream">
        <ImageIcon className="h-8 w-8 text-brand-beige" aria-hidden="true" />
      </div>
    )
  }

  if (isOptimizedMenuImage(src)) {
    return <Image src={src} alt={alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 180px" className={className} onError={() => setHasError(true)} />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={`w-full h-full ${className || ''}`} onError={() => setHasError(true)} />
}

type Settings = Pick<Database['public']['Tables']['restaurant_settings']['Row'], 'whatsapp' | 'currency'>
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'image_url' | 'sort_order' | 'created_at'>
type Option = Pick<Database['public']['Tables']['item_options']['Row'], 'id' | 'group_id' | 'name' | 'price' | 'is_default' | 'sort_order'>
type OptionGroup = Pick<Database['public']['Tables']['item_option_groups']['Row'], 'id' | 'title' | 'kind' | 'selection_type' | 'is_required' | 'min_select' | 'max_select' | 'sort_order'> & { options: Option[], source?: 'item' | 'template' }
type MenuItem = Pick<Database['public']['Tables']['menu_items']['Row'], 'id' | 'category_id' | 'name' | 'description' | 'base_price' | 'image_url' | 'is_featured' | 'sort_order' | 'created_at'> & { groups: OptionGroup[] }
type RestaurantTable = Pick<Database['public']['Tables']['restaurant_tables']['Row'], 'id' | 'label' | 'code'>
type OptionQuantities = Record<string, number>

type ItemPricing = {
  unitPrice: number
  baseTotal: number
  additionsTotal: number
  total: number
}

type CartItem = {
  id: string
  item: MenuItem
  selections: Record<string, string[]>
  optionQuantities: OptionQuantities
  quantity: number
  unitPrice: number
  additionsTotal: number
  total: number
}

type MenuUrlState = {
  categoryId?: string | null
  productId?: string | null
  cartOpen?: boolean
}

type MenuHistoryView = 'categories' | 'category' | 'product' | 'cart'

type PublicMenuCacheEntry = {
  cachedAt: number
  data: PublicMenuPayload
}

function addToMap<T>(map: Map<string, T[]>, key: string | null, value: T) {
  if (!key) return
  const current = map.get(key)
  if (current) {
    current.push(value)
  } else {
    map.set(key, [value])
  }
}

function buildMenuItems(menuData: PublicMenuPayload): MenuItem[] {
  const optionsByGroup = new Map<string, typeof menuData.options>()
  menuData.options.forEach((option) => addToMap(optionsByGroup, option.group_id, option))

  const templateOptionsByTemplate = new Map<string, typeof menuData.templateOptions>()
  menuData.templateOptions.forEach((option) => addToMap(templateOptionsByTemplate, option.template_id, option))

  const groupsByItem = new Map<string, typeof menuData.groups>()
  menuData.groups.forEach((group) => addToMap(groupsByItem, group.item_id, group))

  const linksByItem = new Map<string, typeof menuData.templateLinks>()
  menuData.templateLinks.forEach((link) => addToMap(linksByItem, link.item_id, link))

  const templatesById = new Map(menuData.templates.map((template) => [template.id, template]))

  return menuData.items.map((item) => {
    const itemGroups = (groupsByItem.get(item.id) || []).map((group) => ({
      ...group,
      source: 'item' as const,
      options: optionsByGroup.get(group.id) || [],
    }))

    const linkedGroups = (linksByItem.get(item.id) || []).flatMap((link) => {
      const template = link.template_id ? templatesById.get(link.template_id) : undefined
      if (!template) return []

      const linkedOptions = (templateOptionsByTemplate.get(template.id) || []).map((option) => ({
        id: `template-option:${option.id}`,
        group_id: `template:${template.id}`,
        name: option.name,
        price: option.price,
        is_default: option.is_default,
        sort_order: option.sort_order,
      }))

      return [{
        id: `template:${template.id}`,
        title: template.display_title,
        kind: template.kind,
        selection_type: template.selection_type,
        is_required: template.is_required,
        min_select: template.min_select,
        max_select: template.max_select,
        sort_order: link.sort_order ?? template.sort_order ?? 0,
        source: 'template' as const,
        options: linkedOptions,
      }]
    })

    const allGroups = [...itemGroups, ...linkedGroups]
    allGroups.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    return {
      ...item,
      groups: allGroups,
    }
  })
}

function isPublicMenuPayload(value: unknown): value is PublicMenuPayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Partial<PublicMenuPayload>
  return (payload.locale === 'ar' || payload.locale === 'en' || payload.locale === 'tr')
    && Array.isArray(payload.categories)
    && Array.isArray(payload.items)
    && Array.isArray(payload.groups)
    && Array.isArray(payload.options)
    && Array.isArray(payload.templateLinks)
    && Array.isArray(payload.templates)
    && Array.isArray(payload.templateOptions)
    && Array.isArray(payload.tables)
}

function getPublicMenuSessionCacheKey(locale: CatalogLocale) {
  return `${PUBLIC_MENU_SESSION_CACHE_KEY_PREFIX}:${locale}`
}

function readPublicMenuCache(locale: CatalogLocale): PublicMenuCacheEntry | null {
  try {
    const cachedValue = window.sessionStorage.getItem(getPublicMenuSessionCacheKey(locale))
    if (!cachedValue) return null

    const parsedValue = JSON.parse(cachedValue) as Partial<PublicMenuCacheEntry>
    if (typeof parsedValue.cachedAt !== 'number' || !isPublicMenuPayload(parsedValue.data) || parsedValue.data.locale !== locale) {
      return null
    }

    return {
      cachedAt: parsedValue.cachedAt,
      data: parsedValue.data,
    }
  } catch {
    return null
  }
}

function writePublicMenuCache(data: PublicMenuPayload) {
  try {
    window.sessionStorage.setItem(getPublicMenuSessionCacheKey(data.locale), JSON.stringify({
      cachedAt: Date.now(),
      data,
    }))
  } catch {
    // Browsing modes with disabled storage still use the CDN-backed API.
  }
}

const buildInitialSelections = (item: MenuItem) => {
  const initialSelections: Record<string, string[]> = {}

  item.groups.forEach(group => {
    if (group.selection_type === 'single' && group.options.length > 0) {
      const defaultOption = group.options.find(option => option.is_default)
      initialSelections[group.id] = defaultOption ? [defaultOption.id] : []
    } else {
      initialSelections[group.id] = group.options.filter(option => option.is_default).map(option => option.id)
    }
  })

  return initialSelections
}

const buildInitialOptionQuantities = (item: MenuItem, selections: Record<string, string[]>) => {
  const initialQuantities: OptionQuantities = {}

  item.groups.forEach(group => {
    if (group.kind === 'variant') return

    const selectedOptionIds = selections[group.id] || []
    selectedOptionIds.forEach(optionId => {
      initialQuantities[optionId] = 1
    })
  })

  return initialQuantities
}

const normalizeOptionQuantities = (optionQuantities: OptionQuantities) => {
  const nextQuantities: OptionQuantities = {}

  Object.entries(optionQuantities).forEach(([optionId, quantity]) => {
    nextQuantities[optionId] = Math.max(1, quantity)
  })

  return nextQuantities
}

const getItemUnitPrice = (item: MenuItem, selections: Record<string, string[]>) => {
  let unitPrice = item.base_price || 0
  const hasVariantGroup = item.groups.some(group => group.kind === 'variant')
  let variantSelected = false

  item.groups.forEach(group => {
    if (group.kind !== 'variant') return

    const selectedOptionIds = selections[group.id] || []
    selectedOptionIds.forEach(optionId => {
      const option = group.options.find(currentOption => currentOption.id === optionId)
      if (option) {
        unitPrice = option.price || 0
        variantSelected = true
      }
    })
  })

  const hasRequiredVariantGroup = item.groups.some(group => (
    group.kind === 'variant' && (group.is_required || item.base_price === null)
  ))

  if ((item.base_price === null || (item.base_price === 0 && hasRequiredVariantGroup)) && hasVariantGroup && !variantSelected) {
    return null
  }

  return unitPrice
}

const calculateAdditionsTotal = (
  item: MenuItem,
  selections: Record<string, string[]>,
  optionQuantities: OptionQuantities
) => item.groups.reduce((sum, group) => {
  if (group.kind === 'variant') return sum

  const selectedOptionIds = selections[group.id] || []
  return selectedOptionIds.reduce((groupSum, optionId) => {
    const option = group.options.find(currentOption => currentOption.id === optionId)
    if (!option) return groupSum

    const quantity = Math.max(1, optionQuantities[optionId] || 1)
    return groupSum + (option.price || 0) * quantity
  }, sum)
}, 0)

const calculateItemPricing = (
  item: MenuItem,
  selections: Record<string, string[]>,
  optionQuantities: OptionQuantities,
  quantity: number
): ItemPricing | null => {
  const unitPrice = getItemUnitPrice(item, selections)
  if (unitPrice === null) return null

  const baseTotal = unitPrice * quantity
  const additionsTotal = calculateAdditionsTotal(item, selections, optionQuantities)

  return {
    unitPrice,
    baseTotal,
    additionsTotal,
    total: baseTotal + additionsTotal,
  }
}

const buildMenuUrl = (href: string, state: MenuUrlState) => {
  const url = new URL(href)
  url.searchParams.delete('category')
  url.searchParams.delete('product')
  url.searchParams.delete('cart')

  if (state.categoryId) url.searchParams.set('category', state.categoryId)
  if (state.productId) url.searchParams.set('product', state.productId)
  if (state.cartOpen) url.searchParams.set('cart', '1')

  return `${url.pathname}${url.search}${url.hash}`
}

export default function MenuClient() {
  const { direction, locale, t } = useLocale()
  const [menuData, setMenuData] = useState<PublicMenuPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isUsingStaleCache, setIsUsingStaleCache] = useState(false)
  const [tableCode, setTableCode] = useState<string | null>(null)
  const [activeCategoryView, setActiveCategoryView] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [optionQuantities, setOptionQuantities] = useState<OptionQuantities>({})
  const [productQuantity, setProductQuantity] = useState(1)
  const [cartFeedback, setCartFeedback] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settings: Settings | undefined = menuData?.settings || undefined
  const categories = useMemo<Category[]>(() => [...(menuData?.categories || [])].sort((a, b) => {
    const sortA = a.sort_order ?? 0
    const sortB = b.sort_order ?? 0
    if (sortA !== sortB) return sortA - sortB
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  }), [menuData])
  const items = useMemo(() => menuData ? buildMenuItems(menuData) : [], [menuData])
  const table = useMemo<RestaurantTable | undefined>(
    () => tableCode ? menuData?.tables.find((currentTable) => currentTable.code === tableCode) : undefined,
    [menuData, tableCode],
  )
  const currency = settings?.currency || 'ر.س'

  // Client-side sort fallback for items (sort_order then created_at)
  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const sortA = a.sort_order ?? 0
    const sortB = b.sort_order ?? 0
    if (sortA !== sortB) return sortA - sortB
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  }), [items])

  const getValidImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('/menu-assets/')) return null;
    return url;
  };

  useEffect(() => {
    let cancelled = false

    const loadMenu = async () => {
      const cachedMenu = readPublicMenuCache(locale)
      const cacheIsFresh = cachedMenu && Date.now() - cachedMenu.cachedAt < PUBLIC_MENU_SESSION_CACHE_TTL

      setLoadError(false)
      setIsUsingStaleCache(false)
      setIsLoading(true)

      if (cacheIsFresh) {
        setMenuData(cachedMenu.data)
        const translatedItems = buildMenuItems(cachedMenu.data)
        setCart((currentCart) => currentCart.map((cartItem) => ({
          ...cartItem,
          item: translatedItems.find((item) => item.id === cartItem.item.id) || cartItem.item,
        })))
        setIsLoading(false)
      }

      try {
        const response = await fetch(`/api/public-menu?locale=${locale}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Public menu request failed with status ${response.status}`)
        }

        const data: unknown = await response.json()
        if (!isPublicMenuPayload(data)) {
          throw new Error('Public menu response is invalid')
        }

        if (cancelled) return

        writePublicMenuCache(data)
        setMenuData(data)
        const translatedItems = buildMenuItems(data)
        setCart((currentCart) => currentCart.map((cartItem) => ({
          ...cartItem,
          item: translatedItems.find((item) => item.id === cartItem.item.id) || cartItem.item,
        })))
      } catch (error) {
        console.error('Public menu load failed:', error)
        if (cancelled) return

        if (cachedMenu) {
          setMenuData(cachedMenu.data)
          setIsUsingStaleCache(true)
        } else {
          setLoadError(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadMenu()

    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    const synchronizeTableFromUrl = () => {
      setTableCode(new URL(window.location.href).searchParams.get('table'))
    }

    synchronizeTableFromUrl()
    window.addEventListener('popstate', synchronizeTableFromUrl)
    return () => window.removeEventListener('popstate', synchronizeTableFromUrl)
  }, [])


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeCategoryView])

  const updateMenuUrl = (mode: 'push' | 'replace', state: MenuUrlState, view: MenuHistoryView) => {
    if (typeof window === 'undefined') return

    const nextUrl = buildMenuUrl(window.location.href, state)
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextUrl === currentUrl) return

    const historyState = { ...window.history.state, asaletMenuView: view }
    if (mode === 'push') {
      window.history.pushState(historyState, '', nextUrl)
    } else {
      window.history.replaceState(historyState, '', nextUrl)
    }
  }

  const openCategory = (id: string, mode: 'push' | 'replace' = 'push') => {
    setActiveCategoryView(id)
    setSelectedItem(null)
    setIsCartOpen(false)
    updateMenuUrl(mode, { categoryId: id }, 'category')
  }

  const closeCategoryView = () => {
    if (typeof window !== 'undefined' && window.history.state?.asaletMenuView === 'category') {
      window.history.back()
      return
    }

    setActiveCategoryView(null)
    setSelectedItem(null)
    setIsCartOpen(false)
    updateMenuUrl('replace', {}, 'categories')
  }

  useEffect(() => {
    if (!menuData) return

    const synchronizeMenuFromUrl = () => {
      const url = new URL(window.location.href)
      const categoryId = url.searchParams.get('category')
      const productId = url.searchParams.get('product')
      const cartOpen = url.searchParams.get('cart') === '1'
      const validCategory = categoryId ? categories.find(category => category.id === categoryId) : null
      const validItem = productId ? sortedItems.find(item => item.id === productId) : null
      const hasInvalidCategory = Boolean(categoryId && !validCategory)
      const hasInvalidProduct = Boolean(productId && (!validItem || (categoryId && validItem.category_id !== categoryId)))

      if (hasInvalidCategory || hasInvalidProduct) {
        setActiveCategoryView(null)
        setSelectedItem(null)
        setIsCartOpen(false)
        window.history.replaceState(
          { ...window.history.state, asaletMenuView: 'categories' },
          '',
          buildMenuUrl(window.location.href, {})
        )
        return
      }

      setActiveCategoryView(categoryId)

      if (validItem) {
        setProductQuantity(1)
        const initialSelections = buildInitialSelections(validItem)
        setSelections(initialSelections)
        setOptionQuantities(buildInitialOptionQuantities(validItem, initialSelections))
        setSelectedItem(validItem)
        setIsCartOpen(false)
        return
      }

      setSelectedItem(null)
      setIsCartOpen(cartOpen)
    }

    synchronizeMenuFromUrl()
    window.addEventListener('popstate', synchronizeMenuFromUrl)
    return () => window.removeEventListener('popstate', synchronizeMenuFromUrl)
  }, [categories, menuData, sortedItems])

  useEffect(() => {
    if (!selectedItem && !isCartOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedItem, isCartOpen])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const closeProductSheet = () => {
    if (typeof window !== 'undefined' && window.history.state?.asaletMenuView === 'product') {
      window.history.back()
      return
    }

    setSelectedItem(null)
    updateMenuUrl('replace', { categoryId: activeCategoryView }, activeCategoryView ? 'category' : 'categories')
  }

  const closeCartSheet = () => {
    if (typeof window !== 'undefined' && window.history.state?.asaletMenuView === 'cart') {
      window.history.back()
      return
    }

    setIsCartOpen(false)
    updateMenuUrl('replace', { categoryId: activeCategoryView }, activeCategoryView ? 'category' : 'categories')
  }

  const openCartSheet = () => {
    if (isCartOpen) return
    setIsCartOpen(true)
    updateMenuUrl('push', { categoryId: activeCategoryView, cartOpen: true }, 'cart')
  }

  const openItem = (item: MenuItem) => {
    setProductQuantity(1)
    setSelectedItem(item)
    const initialSelections = buildInitialSelections(item)
    setSelections(initialSelections)
    setOptionQuantities(buildInitialOptionQuantities(item, initialSelections))
    updateMenuUrl('push', { categoryId: activeCategoryView, productId: item.id }, 'product')
  }

  const toggleSelection = (group: OptionGroup, optionId: string) => {
    const selectionType = group.selection_type || 'single'
    const currentGroupSelection = selections[group.id] || []
    const nextGroupSelection = selectionType === 'single'
      ? [optionId]
      : currentGroupSelection.includes(optionId)
        ? currentGroupSelection.filter(id => id !== optionId)
        : [...currentGroupSelection, optionId]

    setSelections(prev => ({ ...prev, [group.id]: nextGroupSelection }))

    if (group.kind === 'variant') return

    setOptionQuantities(prev => {
      const next = { ...prev }
      currentGroupSelection.forEach(id => {
        if (!nextGroupSelection.includes(id)) delete next[id]
      })
      nextGroupSelection.forEach(id => {
        if (!(id in next)) next[id] = 1
      })
      return next
    })
  }

  const changeProductQuantity = (delta: number) => {
    const nextQuantity = Math.max(1, productQuantity + delta)
    setProductQuantity(nextQuantity)
  }

  const updateOptionQuantity = (optionId: string, delta: number) => {
    setOptionQuantities(prev => {
      const nextQuantity = Math.max(1, (prev[optionId] || 1) + delta)
      return { ...prev, [optionId]: nextQuantity }
    })
  }

  const pricing = selectedItem
    ? calculateItemPricing(selectedItem, selections, optionQuantities, productQuantity)
    : null

  const addToCart = () => {
    if (!selectedItem || !pricing || validationError) return

    setCart(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      item: selectedItem,
      selections,
      optionQuantities,
      quantity: productQuantity,
      unitPrice: pricing.unitPrice,
      additionsTotal: pricing.additionsTotal,
      total: pricing.total
    }])
    setCartFeedback(t('addedToCart'))
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setCartFeedback(''), 2200)

    closeProductSheet()
  }

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(c => c.id !== cartItemId))
  }

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id !== cartItemId) return c;

      const newQuantity = Math.max(1, c.quantity + delta);
      const newOptionQuantities = normalizeOptionQuantities(c.optionQuantities);
      const newPricing = calculateItemPricing(c.item, c.selections, newOptionQuantities, newQuantity);
      if (!newPricing) return c;

      return {
        ...c,
        quantity: newQuantity,
        optionQuantities: newOptionQuantities,
        unitPrice: newPricing.unitPrice,
        additionsTotal: newPricing.additionsTotal,
        total: newPricing.total,
      };
    }));
  }

  const clearCart = () => {
    setCart([]);
  }

  const validateSelection = (): string | null => {
    if (!selectedItem) return null;
    for (const group of selectedItem.groups) {
      const selected = selections[group.id] || [];
      if (
        group.kind === 'variant' &&
        (selectedItem.base_price === null || selectedItem.base_price === 0 || group.is_required) &&
        selected.length === 0
      ) {
        return t('selectVariantFrom', { group: group.title });
      }
      if (group.is_required && group.selection_type === 'single' && selected.length === 0) {
        return t('selectAtLeastOneFrom', { group: group.title });
      }
      if (group.is_required && group.selection_type === 'multiple' && group.min_select !== null && selected.length < group.min_select) {
        return t('selectAtLeastFrom', { count: group.min_select, group: group.title });
      }
      if (group.selection_type === 'multiple' && group.max_select !== null && selected.length > group.max_select) {
        return t('selectNoMoreThanFrom', { count: group.max_select, group: group.title });
      }
    }
    return null;
  }

  const validationError = validateSelection();

  const cartTotal = cart.reduce((sum, current) => sum + current.total, 0)

  const generateWhatsAppMessage = () => {
    let msg = `*${t('whatsappOrderTitle')}* 🛒\n`
    if (table) {
      msg += `${t('whatsappTable')}: ${table.label}\n`
    }
    msg += '\n'

    cart.forEach((cartItem, index) => {
      msg += `${index + 1}) *${cartItem.item.name}*\n`
      msg += `${t('whatsappQuantity')}: ${cartItem.quantity}\n`

      // Add selections
      cartItem.item.groups.forEach(group => {
        const selectedOptionIds = cartItem.selections[group.id] || []
        const selectedOptions = group.options.filter(o => selectedOptionIds.includes(o.id))
        if (selectedOptions.length > 0) {
          msg += `${group.title}:\n`
          selectedOptions.forEach(o => {
            const isVariant = group.kind === 'variant'
            const optionQuantity = isVariant ? 1 : Math.max(1, cartItem.optionQuantities[o.id] || 1)
            const quantitySuffix = optionQuantity > 1 ? ` ×${optionQuantity}` : ''
            const optionTotal = (o.price || 0) * optionQuantity
            if (optionTotal > 0 && !isVariant) {
              msg += `- ${o.name}${quantitySuffix} +${optionTotal} ${currency}\n`
            } else {
              msg += `- ${o.name}${quantitySuffix}\n`
            }
          })
        }
      })
      msg += `${t('whatsappSubtotal')}: ${cartItem.total} ${currency}\n\n`
    })

    msg += `*${t('total')}: ${cartTotal} ${currency}*`
    return encodeURIComponent(msg)
  }

  return (
    <div className="min-h-screen bg-brand-beige font-sans selection:bg-brand-burgundy/20 flex justify-center">
      <div className="w-full max-w-6xl bg-[#fbf9f7] min-h-screen shadow-2xl relative pb-28 flex flex-col md:border-x md:border-brand-border">

        {/* Compact Restaurant Header */}
        <div className="bg-[#fbf9f7] pt-6 pb-4 px-5 flex flex-col items-center text-center border-b border-brand-border/50">
          <LanguageToggle className="absolute right-4 top-4 z-10" />
          <div className="w-32 h-32 sm:w-40 sm:h-40 relative flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Asalet Mandi Logo"
              fill
              sizes="(max-width: 640px) 128px, 160px"
              className="object-contain drop-shadow-sm"
              priority
            />
          </div>
          {table && (
            <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-cream px-3 py-1.5 text-xs font-bold text-brand-burgundy">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-gold" aria-hidden="true" />
              <span className="min-w-0 truncate">{table.label}</span>
            </div>
          )}
          {isUsingStaleCache && (
            <p className="mt-2 rounded-full border border-brand-gold/40 bg-brand-cream px-3 py-1 text-xs font-bold text-brand-brown">
              {t('menuMayBeOutdated')}
            </p>
          )}
        </div>

        {/* Featured Products */}
        {activeCategoryView === null && sortedItems.filter(i => i.is_featured).length > 0 && (
          <div className="pt-8 pb-2 overflow-hidden">
            <h2 className="text-[20px] font-black text-brand-text mb-4 px-5">{t('featuredProducts')}</h2>
            {(() => {
              const baseFeatured = sortedItems.filter(i => i.is_featured)
              // Ensure we have enough items to fill the screen twice (for seamless 50% translation)
              // Multiply base items so we have at least 10 items total, and ensure it's an even multiplier
              const repeats = Math.max(4, Math.ceil(12 / Math.max(1, baseFeatured.length)))
              const evenRepeats = repeats % 2 === 0 ? repeats : repeats + 1
              const marqueeItems = Array(evenRepeats).fill(baseFeatured).flat()

              return (
                <div className="overflow-x-auto hide-scrollbar pb-4 px-5">
                  <div className={`flex w-max gap-4 pl-4 ${direction === 'rtl' ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`} dir={direction}>
                    {marqueeItems.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        onClick={() => openItem(item)}
                        className="shrink-0 w-[160px] sm:w-[180px] bg-[#fbf9f7] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border cursor-pointer flex flex-col active:scale-95 transition-all duration-200"
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
                              {item.base_price !== null ? `${item.base_price} ${currency}` : t('chooseVariant')}
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
              <h2 className="text-[22px] font-black text-brand-text">{t('foodMenu')}</h2>
            </div>
            {isLoading ? (
              <div className="text-center py-12 bg-[#fbf9f7] rounded-2xl border border-brand-border shadow-sm">
                <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                <p className="text-brand-brown font-medium">{t('loadingMenu')}</p>
              </div>
            ) : loadError ? (
              <div className="text-center py-12 bg-[#fbf9f7] rounded-2xl border border-brand-border shadow-sm">
                <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                <p className="text-brand-brown font-medium">{t('menuLoadFailed')}</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 bg-[#fbf9f7] rounded-2xl border border-brand-border shadow-sm">
                <Info className="w-10 h-10 mx-auto mb-2 text-brand-beige" />
                <p className="text-brand-brown font-medium">{t('noCategoriesAvailable')}</p>
              </div>
            ) : (
              <div className="mx-auto grid max-w-5xl grid-cols-2 justify-center gap-3 sm:grid-cols-[repeat(3,minmax(0,180px))] lg:grid-cols-[repeat(5,minmax(0,180px))]">
                {categories.map((cat, i) => (
                  <div
                    key={cat.id}
                    onClick={() => openCategory(cat.id)}
                    className="w-full max-w-[180px] justify-self-center bg-[#fbf9f7] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border active:scale-95 transition-all duration-200 cursor-pointer flex flex-col"
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
                  onClick={closeCategoryView}
                  className="w-10 h-10 shrink-0 bg-[#fbf9f7] shadow-sm border border-brand-border rounded-full flex items-center justify-center hover:bg-brand-beige active:scale-90 transition-all text-brand-burgundy"
                  aria-label={t('backToCategories')}
                >
                  {direction === 'rtl' ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                </button>

                <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-2.5 snap-x py-2 pr-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => openCategory(cat.id, 'replace')}
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
                  <p className="text-brand-brown font-medium">{t('noProductsInCategory')}</p>
                </div>
              ) : (
                <div className="mx-auto grid max-w-5xl grid-cols-2 justify-center gap-3 sm:grid-cols-[repeat(3,minmax(0,180px))] lg:grid-cols-[repeat(5,minmax(0,180px))]">
                  {sortedItems.filter(i => i.category_id === activeCategoryView).map((item, i) => (
                    <div
                      key={item.id}
                      onClick={() => openItem(item)}
                      className="w-full max-w-[180px] justify-self-center bg-[#fbf9f7] rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border border-brand-border active:scale-95 transition-all duration-200 cursor-pointer flex flex-col group"
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
                            {item.base_price !== null ? `${item.base_price} ${currency}` : t('chooseVariant')}
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
              {cartFeedback && (
                <div className="absolute bottom-24 left-5 right-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-center text-sm font-bold text-green-700 shadow-sm sm:left-auto sm:right-5 sm:w-[320px]">
                  {cartFeedback}
                </div>
              )}
              {cart.length > 0 ? (
                <button
                  onClick={openCartSheet}
                  className="absolute bottom-6 left-5 right-5 sm:left-auto sm:right-5 sm:w-[320px] pointer-events-auto bg-brand-burgundy text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-brand-burgundy-dark transition-all animate-in slide-in-from-bottom-5"
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                    </svg>
                    <span>{t('cart')}</span>
                  </div>
                  <div className="bg-[#fbf9f7]/20 px-3 py-1 rounded-full text-sm font-black">
                    {cartTotal} {currency}
                  </div>
                </button>
              ) : (
                <button
                  onClick={openCartSheet}
                  className="absolute bottom-[90px] right-4 sm:right-6 pointer-events-auto bg-brand-cream border-2 border-brand-burgundy text-brand-burgundy w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-brand-beige active:scale-90 transition-all animate-in fade-in zoom-in"
                  aria-label={t('openCart')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Item Details Sheet */}
        {selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0" onClick={closeProductSheet} />

            <div className="relative flex h-[92dvh] max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-[#fbf9f7] shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl">
              <div className="shrink-0 border-b border-brand-border/50 bg-[#fbf9f7] px-4 pb-3 pt-2.5 sm:px-5 sm:pb-4 sm:pt-3">
                <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-brand-border sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-black leading-6 text-brand-text sm:text-2xl sm:leading-7">{selectedItem.name}</h2>
                    {selectedItem.description && (
                      <p className="mt-1 line-clamp-1 text-[13px] leading-5 text-brand-brown sm:line-clamp-2 sm:text-sm">{selectedItem.description}</p>
                    )}
                  </div>
                  <button
                    onClick={closeProductSheet}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-white text-brand-text shadow-sm transition-colors hover:bg-brand-cream sm:h-10 sm:w-10"
                    aria-label={t('close')}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex gap-3 rounded-2xl border border-brand-border bg-white p-2.5 sm:mt-4 sm:p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-brand-cream sm:h-32 sm:w-32">
                    {getValidImageUrl(selectedItem.image_url) ? (
                      <SafeImage src={getValidImageUrl(selectedItem.image_url)!} alt={selectedItem.name} className="object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-brand-beige sm:h-10 sm:w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <span className="text-xs font-bold text-brand-brown">{t('currentPrice')}</span>
                    <span className="mt-0.5 break-words text-lg font-black text-brand-burgundy sm:mt-1 sm:text-xl">
                      {pricing !== null ? `${pricing.unitPrice} ${currency}` : t('chooseVariant')}
                    </span>
                    {selectedItem.groups.some(group => group.kind === 'variant') && (
                      <p className="mt-1.5 text-xs leading-5 text-brand-brown sm:mt-2">
                        {t('chooseVariantFirst')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Options Scrollable Area */}
              <div className="relative z-0 flex-1 space-y-4 overflow-y-auto p-4 pb-5">
                {selectedItem.groups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-brand-border bg-white p-5 text-center text-sm font-medium text-brand-brown">
                    {t('noAdditionalOptions')}
                  </div>
                ) : selectedItem.groups.map(group => (
                  <div key={group.id} className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold leading-6 text-brand-text">{group.title}</h3>
                        <p className="mt-0.5 text-xs text-brand-brown">
                          {group.selection_type === 'multiple' ? t('multipleChoicesAllowed') : t('chooseOneOption')}
                        </p>
                      </div>
                      {group.is_required && (
                        <span className="shrink-0 rounded-full bg-brand-burgundy/10 px-2.5 py-1 text-[10px] font-bold text-brand-burgundy">
                          {t('required')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {group.options.map(opt => {
                        const isSelected = selections[group.id]?.includes(opt.id)
                        const isSingle = group.selection_type === 'single'
                        const isVariant = group.kind === 'variant'
                        const optionQuantity = Math.max(1, optionQuantities[opt.id] || 1)
                        const optionTotal = (opt.price || 0) * optionQuantity
                        const showQuantityControls = Boolean(isSelected && !isVariant)
                        return (
                          <div
                            key={opt.id}
                            className={`rounded-xl border-2 transition-all ${isSelected
                                ? 'border-brand-burgundy bg-brand-burgundy/10'
                                : 'border-brand-border bg-[#fbf9f7] hover:border-brand-gold/40'
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSelection(group, opt.id)}
                              role={isSingle ? "radio" : undefined}
                              aria-checked={isSingle ? isSelected : undefined}
                              aria-pressed={!isSingle ? isSelected : undefined}
                              className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 p-3 text-start transition-all active:scale-[0.99] sm:p-4"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-brand-burgundy bg-brand-burgundy text-white' : 'border-brand-border bg-white'}`}>
                                  {isSelected && (
                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                <span className={`min-w-0 break-words text-[15px] leading-6 ${isSelected ? 'font-bold text-brand-burgundy' : 'font-medium text-brand-text'}`}>
                                  {opt.name}
                                </span>
                              </div>
                              {(opt.price || 0) > 0 && (
                                <span className="shrink-0 text-end">
                                  <span className={`block text-[14px] font-bold ${isSelected ? 'text-brand-burgundy' : 'text-brand-gold'}`}>
                                    {isVariant ? '' : '+'}{opt.price} {currency}
                                  </span>
                                  {showQuantityControls && (
                                    <span className="block text-[10px] font-medium leading-4 text-brand-brown">
                                      {t('singlePiecePrice')}
                                    </span>
                                  )}
                                </span>
                              )}
                            </button>

                            {showQuantityControls && (
                              <div className="flex items-end justify-between gap-3 border-t border-brand-burgundy/15 px-3 pb-3 pt-2.5 sm:px-4">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[11px] font-bold text-brand-brown">{t('addonQuantity')}</span>
                                  <div className="flex items-center gap-1 rounded-xl border border-brand-border bg-white px-1.5 py-1">
                                    <button
                                      type="button"
                                      onClick={() => updateOptionQuantity(opt.id, -1)}
                                      disabled={optionQuantity <= 1}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-lg font-black text-brand-burgundy disabled:opacity-35"
                                      aria-label={`${t('addonQuantity')} -`}
                                    >
                                      -
                                    </button>
                                    <span className="min-w-7 text-center text-sm font-black text-brand-text">{optionQuantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateOptionQuantity(opt.id, 1)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-lg font-black text-brand-burgundy"
                                      aria-label={`${t('addonQuantity')} +`}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                                {(opt.price || 0) > 0 && (
                                  <div className="flex flex-col items-end gap-1.5 text-end">
                                    <span className="text-[11px] font-bold text-brand-brown">{t('addonPrice')}</span>
                                    <span className="text-[15px] font-black leading-7 text-brand-burgundy">{optionTotal} {currency}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Bar */}
              <div className="z-20 shrink-0 border-t border-brand-border/50 bg-[#fbf9f7] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.08)] sm:p-5 sm:pb-6">
                {validationError && (
                  <div className="mb-2.5 rounded-xl bg-brand-burgundy/10 px-3 py-2 text-center text-sm font-bold text-brand-burgundy sm:mb-3">
                    {validationError}
                  </div>
                )}
                <div className="mb-3 space-y-2 sm:mb-4">
                  <div className="flex items-center justify-between gap-3">
                    {pricing !== null ? (
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="font-bold text-brand-brown">{t('baseProductPrice')}</span>
                          <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-end font-black text-brand-text">
                            <span>{pricing.baseTotal} {currency}</span>
                            {productQuantity > 1 && (
                              <span className="text-[10px] font-medium text-brand-brown">({pricing.unitPrice} {currency} × {productQuantity})</span>
                            )}
                          </span>
                        </div>
                        {pricing.additionsTotal > 0 && (
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="font-bold text-brand-brown">{t('additionsPrice')}</span>
                            <span className="font-black text-brand-text">{pricing.additionsTotal} {currency}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="min-w-0 flex-1 text-[14px] font-medium text-brand-brown/70">{t('chooseVariant')}</span>
                    )}
                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-border bg-white px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => changeProductQuantity(-1)}
                        disabled={productQuantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl font-black text-brand-burgundy disabled:opacity-35"
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm font-black text-brand-text">{productQuantity}</span>
                      <button
                        type="button"
                        onClick={() => changeProductQuantity(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl font-black text-brand-burgundy"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {pricing !== null && (
                    <div className="flex items-center justify-between gap-2 border-t border-brand-border pt-2">
                      <span className="text-[15px] font-black text-brand-burgundy">{t('total')}</span>
                      <span className="text-2xl font-black text-brand-burgundy">{pricing.total} {currency}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={addToCart}
                  disabled={pricing === null || validationError !== null}
                  className="w-full rounded-2xl bg-brand-burgundy py-3.5 text-[17px] font-bold text-white transition-all hover:bg-[#681010] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
                >
                  {t('addToCart')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart Modal */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0" onClick={closeCartSheet} />

            <div className="relative w-full max-w-[500px] bg-[#fbf9f7] h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col rounded-t-2xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">

              {/* Header */}
              <div className="p-5 bg-[#fbf9f7] border-b border-brand-border/50 shrink-0 flex justify-between items-center z-10 rounded-t-2xl">
                <h2 className="text-xl font-black text-brand-text">{t('cartItems')}</h2>
                <button
                  onClick={closeCartSheet}
                  className="bg-brand-cream text-brand-burgundy border border-brand-border/50 w-9 h-9 rounded-full flex items-center justify-center hover:bg-brand-beige transition-colors"
                  aria-label={t('closeCart')}
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
                    <p className="text-brand-brown font-medium">{t('emptyCart')}</p>
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
                                <span className="font-medium text-brand-text">{group.title}:</span> {selectedOptions.map(o => {
                                  const isVariant = group.kind === 'variant'
                                  const optionQuantity = isVariant ? 1 : Math.max(1, cartItem.optionQuantities[o.id] || 1)
                                  const quantitySuffix = optionQuantity > 1 ? ` ×${optionQuantity}` : ''
                                  const optionTotal = (o.price || 0) * optionQuantity
                                  return optionTotal > 0 && !isVariant
                                    ? `${o.name}${quantitySuffix} (+${optionTotal} ${currency})`
                                    : `${o.name}${quantitySuffix}`
                                }).join(locale === 'ar' ? '، ' : ', ')}
                              </p>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-brand-border/30">
                          <p className="text-brand-burgundy font-black text-[14px]">{cartItem.total} {currency}</p>
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
                    <span className="text-brand-brown font-medium text-sm mb-1">{t('total')}</span>
                    {cart.length > 0 && (
                      <button onClick={clearCart} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1 active:scale-95 transition-transform">
                        {t('clearCart')}
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
                      closeCartSheet()
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
                  <span>{t('sendWhatsAppOrder')}</span>
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
        @keyframes marquee-ltr {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-rtl {
          animation: marquee-rtl 40s linear infinite;
          will-change: transform;
        }
        .animate-marquee-ltr {
          animation: marquee-ltr 40s linear infinite;
          will-change: transform;
        }
        .animate-marquee-rtl:hover,
        .animate-marquee-rtl:active,
        .animate-marquee-ltr:hover,
        .animate-marquee-ltr:active {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee-rtl,
          .animate-marquee-ltr {
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
