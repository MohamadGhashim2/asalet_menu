'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Edit2,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Save,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { deleteMenuImageIfUnused, deleteMenuImagesIfUnused } from '@/lib/storage-images'

type Category = Database['public']['Tables']['categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type Settings = Database['public']['Tables']['restaurant_settings']['Row']
type DragKind = 'category' | 'product' | 'featured'
type StatusMessage = { type: 'success' | 'error' | 'warning'; text: string } | null

type DragState = {
  kind: DragKind
  id: string
}

const compareByMenuOrder = <T extends { sort_order: number | null; created_at: string | null }>(a: T, b: T) => {
  const sortA = a.sort_order ?? 0
  const sortB = b.sort_order ?? 0

  if (sortA !== sortB) return sortA - sortB

  return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
}

const getValidImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.startsWith('/menu-assets/')) return null
  return url
}

function formatPrice(item: MenuItem, currency: string) {
  if (item.base_price === null) return 'اختر النوع'
  return `${Number.isInteger(item.base_price) ? item.base_price : item.base_price.toFixed(2)} ${currency}`
}

function moveIdInArray<T extends { id: string }>(items: T[], activeId: string, overId: string) {
  const activeIndex = items.findIndex(item => item.id === activeId)
  const overIndex = items.findIndex(item => item.id === overId)

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items
  }

  const next = [...items]
  const [moved] = next.splice(activeIndex, 1)
  next.splice(overIndex, 0, moved)
  return next
}

function moveIdByStep<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const currentIndex = items.findIndex(item => item.id === id)
  const nextIndex = currentIndex + direction

  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= items.length) {
    return items
  }

  const next = [...items]
  const [moved] = next.splice(currentIndex, 1)
  next.splice(nextIndex, 0, moved)
  return next
}

function reorderFilteredItems(
  items: MenuItem[],
  predicate: (item: MenuItem) => boolean,
  reorder: (subset: MenuItem[]) => MenuItem[]
) {
  const reorderedSubset = reorder(items.filter(predicate))
  let subsetIndex = 0

  return items.map(item => {
    if (!predicate(item)) return item
    const nextItem = reorderedSubset[subsetIndex]
    subsetIndex += 1
    return nextItem
  })
}

function SafeAdminImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const imageClassName = `object-cover ${className || ''}`

  if (src.startsWith('/') || src.includes('supabase.co')) {
    return <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 25vw" className={imageClassName} />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${imageClassName}`} />
}

function EmptyImage({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-cream p-4 text-center">
      <ImageIcon className="mb-2 h-8 w-8 text-brand-beige" />
      {label && <span className="line-clamp-2 text-xs font-bold leading-5 text-brand-brown">{label}</span>}
    </div>
  )
}

export default function MenuManagerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [featuredItemIds, setFeaturedItemIds] = useState<string[]>([])
  const [currency, setCurrency] = useState('ر.س')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [categoriesDirty, setCategoriesDirty] = useState(false)
  const [featuredDirty, setFeaturedDirty] = useState(false)
  const [dirtyProductCategoryIds, setDirtyProductCategoryIds] = useState<Set<string>>(new Set())
  const [savingCategories, setSavingCategories] = useState(false)
  const [savingProducts, setSavingProducts] = useState(false)
  const [savingFeatured, setSavingFeatured] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const lastDragOverIdRef = useRef<string | null>(null)

  const hasUnsavedChanges = categoriesDirty || featuredDirty || dirtyProductCategoryIds.size > 0
  const selectedCategory = categories.find(category => category.id === selectedCategoryId) || null
  const productOrderDirty = selectedCategoryId ? dirtyProductCategoryIds.has(selectedCategoryId) : false

  const itemById = useMemo(() => {
    return new Map(items.map(item => [item.id, item]))
  }, [items])

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const item of items) {
      if (!item.category_id) continue
      counts.set(item.category_id, (counts.get(item.category_id) || 0) + 1)
    }

    return counts
  }, [items])

  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategoryId) return []
    return items.filter(item => item.category_id === selectedCategoryId)
  }, [items, selectedCategoryId])

  const featuredItems = useMemo(() => {
    return featuredItemIds
      .map(id => itemById.get(id))
      .filter((item): item is MenuItem => Boolean(item?.is_featured))
  }, [featuredItemIds, itemById])

  const firstItemImageByCategory = useMemo(() => {
    const images = new Map<string, string>()

    for (const item of items) {
      if (!item.category_id || images.has(item.category_id)) continue

      const imageUrl = getValidImageUrl(item.image_url)
      if (imageUrl) {
        images.set(item.category_id, imageUrl)
      }
    }

    return images
  }, [items])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!dragging) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault()

      const target = document.elementFromPoint(event.clientX, event.clientY)
      const reorderTarget = target?.closest('[data-reorder-kind][data-reorder-id]') as HTMLElement | null

      if (!reorderTarget || reorderTarget.dataset.reorderKind !== dragging.kind) {
        return
      }

      const overId = reorderTarget.dataset.reorderId
      if (!overId || overId === dragging.id) {
        return
      }

      if (lastDragOverIdRef.current === overId) {
        return
      }
      lastDragOverIdRef.current = overId

      if (dragging.kind === 'category') {
        setCategories(current => moveIdInArray(current, dragging.id, overId))
        setCategoriesDirty(true)
      }

      if (dragging.kind === 'product' && selectedCategoryId) {
        setItems(current => reorderFilteredItems(
          current,
          item => item.category_id === selectedCategoryId,
          subset => moveIdInArray(subset, dragging.id, overId)
        ))
        markProductOrderDirty(selectedCategoryId)
      }

      if (dragging.kind === 'featured') {
        setFeaturedItemIds(current => {
          const next = moveIdInArray(current.map(id => ({ id })), dragging.id, overId)
          return next.map(item => item.id)
        })
        setFeaturedDirty(true)
      }
    }

    const handlePointerUp = () => {
      lastDragOverIdRef.current = null
      setDragging(null)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragging, selectedCategoryId])

  async function fetchData() {
    setLoading(true)
    setStatusMessage(null)

    const [{ data: categoriesData, error: categoriesError }, { data: itemsData, error: itemsError }, { data: settingsData }] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('menu_items')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('restaurant_settings')
        .select('*')
        .single(),
    ])

    if (categoriesError || itemsError) {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء تحميل بيانات المنيو: ' + (categoriesError?.message || itemsError?.message),
      })
    }

    const sortedCategories = (categoriesData || []).sort(compareByMenuOrder)
    const sortedItems = (itemsData || []).sort(compareByMenuOrder)

    setCategories(sortedCategories)
    setItems(sortedItems)
    setFeaturedItemIds(sortedItems.filter(item => item.is_featured).map(item => item.id))
    setCurrency((settingsData as Settings | null)?.currency || 'ر.س')
    setLoading(false)
  }

  function markProductOrderDirty(categoryId: string) {
    setDirtyProductCategoryIds(current => {
      const next = new Set(current)
      next.add(categoryId)
      return next
    })
  }

  function confirmUnsavedNavigation() {
    if (!hasUnsavedChanges) return true
    return confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة بدون حفظ؟')
  }

  function navigateTo(href: string) {
    if (!confirmUnsavedNavigation()) return
    router.push(href)
  }

  function selectCategory(categoryId: string) {
    if (!confirmUnsavedNavigation()) return
    setSelectedCategoryId(categoryId)
  }

  function backToCategories() {
    if (!confirmUnsavedNavigation()) return
    setSelectedCategoryId(null)
  }

  function startHandleDrag(kind: DragKind, id: string, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    lastDragOverIdRef.current = null
    setDragging({ kind, id })
  }

  function moveCategoryStep(categoryId: string, direction: -1 | 1) {
    setCategories(current => moveIdByStep(current, categoryId, direction))
    setCategoriesDirty(true)
  }

  function moveProductStep(itemId: string, direction: -1 | 1) {
    if (!selectedCategoryId) return

    setItems(current => reorderFilteredItems(
      current,
      item => item.category_id === selectedCategoryId,
      subset => moveIdByStep(subset, itemId, direction)
    ))
    markProductOrderDirty(selectedCategoryId)
  }

  function moveFeaturedStep(itemId: string, direction: -1 | 1) {
    setFeaturedItemIds(current => moveIdByStep(current.map(id => ({ id })), itemId, direction).map(item => item.id))
    setFeaturedDirty(true)
  }

  async function saveCategoryOrder() {
    setSavingCategories(true)
    setStatusMessage(null)

    const updates = categories.map((category, index) => (
      supabase.from('categories').update({ sort_order: index + 1 }).eq('id', category.id)
    ))
    const results = await Promise.all(updates)
    const error = results.find(result => result.error)?.error

    if (error) {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ ترتيب الأقسام: ' + error.message })
    } else {
      setCategories(current => current.map((category, index) => ({ ...category, sort_order: index + 1 })))
      setCategoriesDirty(false)
      setStatusMessage({ type: 'success', text: 'تم حفظ ترتيب الأقسام بنجاح' })
    }

    setSavingCategories(false)
  }

  async function saveProductOrder() {
    if (!selectedCategoryId) return

    setSavingProducts(true)
    setStatusMessage(null)

    const orderedItems = items.filter(item => item.category_id === selectedCategoryId)
    const updates = orderedItems.map((item, index) => (
      supabase.from('menu_items').update({ sort_order: index + 1 }).eq('id', item.id)
    ))
    const results = await Promise.all(updates)
    const error = results.find(result => result.error)?.error

    if (error) {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ ترتيب المنتجات: ' + error.message })
    } else {
      setItems(current => current.map(item => {
        const orderedIndex = orderedItems.findIndex(orderedItem => orderedItem.id === item.id)
        return orderedIndex === -1 ? item : { ...item, sort_order: orderedIndex + 1 }
      }))
      setDirtyProductCategoryIds(current => {
        const next = new Set(current)
        next.delete(selectedCategoryId)
        return next
      })
      setStatusMessage({ type: 'success', text: 'تم حفظ ترتيب المنتجات بنجاح' })
    }

    setSavingProducts(false)
  }

  async function saveFeaturedOrder() {
    setSavingFeatured(true)
    setStatusMessage(null)

    const updates = featuredItemIds.map((itemId, index) => (
      supabase.from('menu_items').update({ sort_order: index + 1 }).eq('id', itemId)
    ))
    const results = await Promise.all(updates)
    const error = results.find(result => result.error)?.error

    if (error) {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ ترتيب المنتجات المميزة: ' + error.message })
    } else {
      setItems(current => current.map(item => {
        const featuredIndex = featuredItemIds.findIndex(itemId => itemId === item.id)
        return featuredIndex === -1 ? item : { ...item, sort_order: featuredIndex + 1 }
      }))
      setFeaturedDirty(false)
      setStatusMessage({ type: 'success', text: 'تم حفظ ترتيب المنتجات المميزة بنجاح' })
    }

    setSavingFeatured(false)
  }

  async function deleteCategory(category: Category) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات التابعة له!')) return

    setWorkingId(category.id)
    setStatusMessage(null)

    const categoryItems = items.filter(item => item.category_id === category.id)
    const cleanupCandidates = [
      category.image_url,
      ...categoryItems.map(item => item.image_url),
    ]

    const { error } = await supabase.from('categories').delete().eq('id', category.id)

    if (error) {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء حذف القسم: ' + error.message })
      setWorkingId(null)
      return
    }

    const cleanupResults = await deleteMenuImagesIfUnused(supabase, cleanupCandidates)
    const cleanupError = cleanupResults.find(result => result.error)?.error

    setCategories(current => current.filter(currentCategory => currentCategory.id !== category.id))
    setItems(current => current.filter(item => item.category_id !== category.id))
    setFeaturedItemIds(current => current.filter(itemId => !categoryItems.some(item => item.id === itemId)))
    setDirtyProductCategoryIds(current => {
      const next = new Set(current)
      next.delete(category.id)
      return next
    })
    if (selectedCategoryId === category.id) {
      setSelectedCategoryId(null)
    }

    setStatusMessage(cleanupError
      ? { type: 'warning', text: 'تم حذف القسم، لكن تعذر حذف بعض الصور من التخزين: ' + cleanupError }
      : { type: 'success', text: 'تم حذف القسم بنجاح' })
    setWorkingId(null)
  }

  async function deleteProduct(item: MenuItem) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع الخيارات التابعة له!')) return

    setWorkingId(item.id)
    setStatusMessage(null)

    const { error } = await supabase.from('menu_items').delete().eq('id', item.id)

    if (error) {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء حذف المنتج: ' + error.message })
      setWorkingId(null)
      return
    }

    const cleanupResult = await deleteMenuImageIfUnused(supabase, item.image_url)

    setItems(current => current.filter(currentItem => currentItem.id !== item.id))
    setFeaturedItemIds(current => current.filter(itemId => itemId !== item.id))

    setStatusMessage(cleanupResult.error
      ? { type: 'warning', text: 'تم حذف المنتج، لكن تعذر حذف الصورة من التخزين: ' + cleanupResult.error }
      : { type: 'success', text: 'تم حذف المنتج بنجاح' })
    setWorkingId(null)
  }

  async function removeFromFeatured(item: MenuItem) {
    if (!confirm('هل تريد إزالة هذا المنتج من المنتجات المميزة؟')) return

    setWorkingId(item.id)
    setStatusMessage(null)

    const { error } = await supabase
      .from('menu_items')
      .update({ is_featured: false })
      .eq('id', item.id)

    if (error) {
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء إزالة المنتج من المميزة: ' + error.message })
      setWorkingId(null)
      return
    }

    setItems(current => current.map(currentItem => (
      currentItem.id === item.id ? { ...currentItem, is_featured: false } : currentItem
    )))
    setFeaturedItemIds(current => current.filter(itemId => itemId !== item.id))
    setStatusMessage({ type: 'success', text: 'تمت إزالة المنتج من المنتجات المميزة' })
    setWorkingId(null)
  }

  function getCategoryImage(category: Category) {
    return getValidImageUrl(category.image_url) || firstItemImageByCategory.get(category.id) || null
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">
        جاري تحميل إدارة المنيو...
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-bold text-brand-text">إدارة بصرية للمنيو</h1>
          <p className="max-w-3xl text-sm leading-6 text-brand-brown">
            رتب الأقسام والمنتجات من واجهة قريبة من شكل المنيو للزبون، مع بقاء صفحات التعديل التفصيلية كما هي.
          </p>
        </div>
        {hasUnsavedChanges && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            لديك تغييرات غير محفوظة
          </div>
        )}
      </header>

      {statusMessage && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${
          statusMessage.type === 'error'
            ? 'border-red-100 bg-red-50 text-red-700'
            : statusMessage.type === 'warning'
              ? 'border-amber-100 bg-amber-50 text-amber-800'
              : 'border-green-100 bg-green-50 text-green-700'
        }`}>
          {statusMessage.text}
        </div>
      )}

      <section className="rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-brand-gold" />
              <h2 className="text-xl font-bold text-brand-text">المنتجات المميزة</h2>
            </div>
            <p className="text-sm leading-6 text-brand-brown">
              تظهر هنا مرة واحدة فقط بدون حركة تلقائية. ترتيبها يستخدم حقل ترتيب المنتج الحالي.
            </p>
          </div>
          <button
            type="button"
            onClick={saveFeaturedOrder}
            disabled={!featuredDirty || savingFeatured}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {savingFeatured ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ ترتيب المميزة
          </button>
        </div>

        {featuredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-border bg-brand-cream/40 p-6 text-center text-sm text-brand-brown">
            لا توجد منتجات مميزة حالياً.
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto pb-2">
            <div className="flex w-max max-w-none gap-3">
              {featuredItems.map((item, index) => (
                <article
                  key={item.id}
                  data-reorder-kind="featured"
                  data-reorder-id={item.id}
                  className={`w-[168px] shrink-0 overflow-hidden rounded-2xl border bg-[#fbf9f7] shadow-sm transition-opacity ${
                    dragging?.kind === 'featured' && dragging.id === item.id ? 'opacity-60' : 'border-brand-border'
                  }`}
                >
                  <div className="relative aspect-square bg-brand-cream">
                    {getValidImageUrl(item.image_url) ? (
                      <SafeAdminImage src={getValidImageUrl(item.image_url)!} alt={item.name} />
                    ) : (
                      <EmptyImage />
                    )}
                  </div>
                  <div className="space-y-3 p-3">
                    <div className="min-h-[4rem]">
                      <h3 className="line-clamp-2 break-words text-sm font-bold leading-5 text-brand-text">{item.name}</h3>
                      <p className="mt-1 text-sm font-black text-brand-burgundy">{formatPrice(item, currency)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button type="button" onClick={() => moveFeaturedStep(item.id, -1)} disabled={index === 0} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-brown disabled:opacity-35">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(event) => startHandleDrag('featured', item.id, event)}
                        className="flex min-h-10 touch-none items-center justify-center rounded-lg border border-brand-border bg-brand-cream text-brand-burgundy active:cursor-grabbing"
                        aria-label="سحب لترتيب المنتج المميز"
                      >
                        <GripVertical className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => moveFeaturedStep(item.id, 1)} disabled={index === featuredItems.length - 1} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-brown disabled:opacity-35">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTo(`/asalaadmin26/items/${item.id}`)}
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-border bg-white text-sm font-bold text-brand-burgundy"
                    >
                      <Edit2 className="h-4 w-4" />
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromFeatured(item)}
                      disabled={workingId === item.id}
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-sm font-bold text-amber-800 disabled:opacity-60"
                    >
                      {workingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <StarOff className="h-4 w-4" />}
                      إزالة من المميزة
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {!selectedCategory ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-bold text-brand-text">الأقسام</h2>
              <p className="text-sm leading-6 text-brand-brown">اضغط على القسم لإدارة منتجاته، أو اسحب المقبض لتغيير ترتيبه.</p>
            </div>
            <button
              type="button"
              onClick={saveCategoryOrder}
              disabled={!categoriesDirty || savingCategories}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {savingCategories ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ ترتيب الأقسام
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-brand-brown">
              لا توجد أقسام حتى الآن.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category, index) => {
                const categoryImage = getCategoryImage(category)
                const productCount = productCounts.get(category.id) || 0

                return (
                  <article
                    key={category.id}
                    data-reorder-kind="category"
                    data-reorder-id={category.id}
                    className={`min-w-0 overflow-hidden rounded-2xl border bg-[#fbf9f7] shadow-sm transition-opacity ${
                      dragging?.kind === 'category' && dragging.id === category.id ? 'opacity-60' : 'border-brand-border'
                    }`}
                  >
                    <button type="button" onClick={() => selectCategory(category.id)} className="block w-full text-right">
                      <div className="relative aspect-[4/3] bg-brand-cream">
                        {categoryImage ? <SafeAdminImage src={categoryImage} alt={category.name} /> : <EmptyImage label={category.name} />}
                        {category.is_active === false && (
                          <span className="absolute right-3 top-3 rounded-full bg-gray-900/75 px-2.5 py-1 text-xs font-bold text-white">
                            غير نشط
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <h3 className="line-clamp-2 break-words text-lg font-bold leading-7 text-brand-burgundy">{category.name}</h3>
                        <p className="text-sm font-bold text-brand-brown">{productCount} منتج</p>
                      </div>
                    </button>

                    <div className="grid grid-cols-5 gap-2 border-t border-brand-border bg-white p-3">
                      <button type="button" onClick={() => moveCategoryStep(category.id, -1)} disabled={index === 0} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-brown disabled:opacity-35">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(event) => startHandleDrag('category', category.id, event)}
                        className="flex min-h-10 touch-none items-center justify-center rounded-lg border border-brand-border bg-brand-cream text-brand-burgundy active:cursor-grabbing"
                        aria-label="سحب لترتيب القسم"
                      >
                        <GripVertical className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => moveCategoryStep(category.id, 1)} disabled={index === categories.length - 1} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-brown disabled:opacity-35">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => navigateTo('/asalaadmin26/categories')} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-burgundy">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => deleteCategory(category)} disabled={workingId === category.id} className="flex min-h-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 disabled:opacity-60">
                        {workingId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="min-w-0 space-y-2">
              <button
                type="button"
                onClick={backToCategories}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-cream px-4 py-2 text-sm font-bold text-brand-burgundy transition-colors hover:bg-brand-beige sm:w-fit"
              >
                <ChevronRight className="h-4 w-4" />
                رجوع للأقسام
              </button>
              <div>
                <h2 className="break-words text-xl font-bold text-brand-text">{selectedCategory.name}</h2>
                <p className="text-sm leading-6 text-brand-brown">
                  {selectedCategoryItems.length} منتج. اسحب المقبض لتغيير ترتيب المنتجات داخل هذا القسم فقط.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={saveProductOrder}
              disabled={!productOrderDirty || savingProducts}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {savingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ ترتيب المنتجات
            </button>
          </div>

          {selectedCategoryItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-brand-brown">
              لا توجد منتجات في هذا القسم.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {selectedCategoryItems.map((item, index) => (
                <article
                  key={item.id}
                  data-reorder-kind="product"
                  data-reorder-id={item.id}
                  className={`min-w-0 overflow-hidden rounded-2xl border bg-[#fbf9f7] shadow-sm transition-opacity ${
                    dragging?.kind === 'product' && dragging.id === item.id ? 'opacity-60' : 'border-brand-border'
                  }`}
                >
                  <div className="relative aspect-square bg-brand-cream">
                    {getValidImageUrl(item.image_url) ? <SafeAdminImage src={getValidImageUrl(item.image_url)!} alt={item.name} /> : <EmptyImage />}
                    <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.is_available ? 'متاح' : 'غير متاح'}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="line-clamp-2 min-h-[3.5rem] break-words text-base font-bold leading-7 text-brand-text">{item.name}</h3>
                    <p className="text-sm font-black text-brand-gold">{formatPrice(item, currency)}</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2 border-t border-brand-border bg-white p-3">
                    <button type="button" onClick={() => moveProductStep(item.id, -1)} disabled={index === 0} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-brown disabled:opacity-35">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => startHandleDrag('product', item.id, event)}
                      className="flex min-h-10 touch-none items-center justify-center rounded-lg border border-brand-border bg-brand-cream text-brand-burgundy active:cursor-grabbing"
                      aria-label="سحب لترتيب المنتج"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => moveProductStep(item.id, 1)} disabled={index === selectedCategoryItems.length - 1} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-brown disabled:opacity-35">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => navigateTo(`/asalaadmin26/items/${item.id}`)} className="flex min-h-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-burgundy">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteProduct(item)} disabled={workingId === item.id} className="flex min-h-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 disabled:opacity-60">
                      {workingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
