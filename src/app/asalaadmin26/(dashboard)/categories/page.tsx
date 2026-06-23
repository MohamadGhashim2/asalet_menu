'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2, Image as ImageIcon, Languages } from 'lucide-react'
import ImageUploader from '../../components/ImageUploader'
import Image from 'next/image'
import { deleteMenuImagesIfUnused } from '@/lib/storage-images'
import { useAdminText } from '@/i18n/admin-text'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryTranslation = Database['public']['Tables']['category_translations']['Row']
type EditorLocale = 'ar' | 'en' | 'tr'

export default function CategoriesPage() {
  const tx = useAdminText()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEnglishName, setEditEnglishName] = useState('')
  const [editEnglishDescription, setEditEnglishDescription] = useState('')
  const [editTurkishName, setEditTurkishName] = useState('')
  const [editTurkishDescription, setEditTurkishDescription] = useState('')
  const [editSort, setEditSort] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEnglishName, setNewEnglishName] = useState('')
  const [newEnglishDescription, setNewEnglishDescription] = useState('')
  const [newTurkishName, setNewTurkishName] = useState('')
  const [newTurkishDescription, setNewTurkishDescription] = useState('')
  const [newSort, setNewSort] = useState(0)
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [addingSaving, setAddingSaving] = useState(false)
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editOriginalImageUrl, setEditOriginalImageUrl] = useState<string | null>(null)
  const [newImageUrlsPendingCleanup, setNewImageUrlsPendingCleanup] = useState<string[]>([])
  const [editImageUrlsPendingCleanup, setEditImageUrlsPendingCleanup] = useState<string[]>([])
  const [englishByCategoryId, setEnglishByCategoryId] = useState<Record<string, CategoryTranslation>>({})
  const [turkishByCategoryId, setTurkishByCategoryId] = useState<Record<string, CategoryTranslation>>({})
  const [newEditorLocale, setNewEditorLocale] = useState<EditorLocale>('ar')
  const [editEditorLocale, setEditEditorLocale] = useState<EditorLocale>('ar')

  const supabase = createClient()

  async function fetchCategories() {
    setLoading(true)
    const [categoriesResult, translationsResult] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('category_translations').select('*').in('locale', ['en', 'tr']),
    ])

    if (categoriesResult.data) setCategories(categoriesResult.data)
    if (translationsResult.data) {
      setEnglishByCategoryId(Object.fromEntries(translationsResult.data.filter((translation) => translation.locale === 'en').map((translation) => [translation.category_id, translation])))
      setTurkishByCategoryId(Object.fromEntries(translationsResult.data.filter((translation) => translation.locale === 'tr').map((translation) => [translation.category_id, translation])))
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories()
  }, [])

  async function cleanupUnusedImages(imageUrls: Array<string | null | undefined>) {
    const cleanupResults = await deleteMenuImagesIfUnused(supabase, imageUrls)
    const cleanupError = cleanupResults.find(result => result.error)?.error

    if (cleanupError) {
      console.warn('Storage image cleanup failed:', cleanupError)
    }

    return cleanupError
  }

  async function saveEnglishTranslation(categoryId: string, name: string, description: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      const { error } = await supabase
        .from('category_translations')
        .delete()
        .eq('category_id', categoryId)
        .eq('locale', 'en')
      if (!error) {
        setEnglishByCategoryId((current) => {
          const next = { ...current }
          delete next[categoryId]
          return next
        })
      }
      return error
    }

    const { data, error } = await supabase
      .from('category_translations')
      .upsert({
        category_id: categoryId,
        locale: 'en',
        name: normalizedName,
        description: description.trim() || null,
      }, { onConflict: 'category_id,locale' })
      .select()
      .single()

    if (data) setEnglishByCategoryId((current) => ({ ...current, [categoryId]: data }))
    return error
  }

  async function saveTurkishTranslation(categoryId: string, name: string, description: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      const { error } = await supabase
        .from('category_translations')
        .delete()
        .eq('category_id', categoryId)
        .eq('locale', 'tr')
      if (!error) {
        setTurkishByCategoryId((current) => {
          const next = { ...current }
          delete next[categoryId]
          return next
        })
      }
      return error
    }

    const { data, error } = await supabase
      .from('category_translations')
      .upsert({
        category_id: categoryId,
        locale: 'tr',
        name: normalizedName,
        description: description.trim() || null,
      }, { onConflict: 'category_id,locale' })
      .select()
      .single()

    if (data) setTurkishByCategoryId((current) => ({ ...current, [categoryId]: data }))
    return error
  }

  function handleNewImageChange(url: string | null) {
    const currentImageUrl = newImageUrl || null

    if (currentImageUrl && currentImageUrl !== url) {
      setNewImageUrlsPendingCleanup(prev => (
        prev.includes(currentImageUrl) ? prev : [...prev, currentImageUrl]
      ))
    }

    setNewImageUrl(url)
  }

  function handleEditImageChange(url: string | null) {
    const currentImageUrl = editImageUrl || null

    if (currentImageUrl && currentImageUrl !== url) {
      setEditImageUrlsPendingCleanup(prev => (
        prev.includes(currentImageUrl) ? prev : [...prev, currentImageUrl]
      ))
    }

    setEditImageUrl(url)
  }

  async function clearNewCategoryImage() {
    const cleanupError = await cleanupUnusedImages([newImageUrl, ...newImageUrlsPendingCleanup])
    setNewImageUrl(null)
    setNewImageUrlsPendingCleanup([])
    setStatusMessage(cleanupError
      ? 'تم حذف الصورة من النموذج، لكن تعذر حذف ملف التخزين: ' + cleanupError
      : 'تم حذف الصورة من النموذج')
  }

  async function clearEditingCategoryImage(id: string) {
    const cleanupCandidates = [editImageUrl, editOriginalImageUrl, ...editImageUrlsPendingCleanup]
    setSavingCategoryId(id)
    setStatusMessage('')

    try {
      const { error } = await supabase
        .from('categories')
        .update({ image_url: null })
        .eq('id', id)

      if (error) {
        throw new Error('حدث خطأ أثناء حذف الصورة: ' + error.message)
      }

      const cleanupError = await cleanupUnusedImages(cleanupCandidates)
      setCategories(categories.map(c => c.id === id ? { ...c, image_url: null } : c))
      setEditImageUrl(null)
      setEditOriginalImageUrl(null)
      setEditImageUrlsPendingCleanup([])
      setStatusMessage(cleanupError
        ? 'تم حذف صورة القسم، لكن تعذر حذف ملف التخزين: ' + cleanupError
        : 'تم حذف صورة القسم')
    } finally {
      setSavingCategoryId(null)
    }
  }

  async function cancelAdd() {
    const cleanupError = await cleanupUnusedImages([newImageUrl, ...newImageUrlsPendingCleanup])
    setIsAdding(false)
    setNewName('')
    setNewDescription('')
    setNewEnglishName('')
    setNewEnglishDescription('')
    setNewTurkishName('')
    setNewTurkishDescription('')
    setNewEditorLocale('ar')
    setNewSort(0)
    setNewImageUrl(null)
    setNewImageUrlsPendingCleanup([])

    if (cleanupError) {
      setStatusMessage('تم إلغاء الإضافة، لكن تعذر حذف الصورة المرفوعة من التخزين: ' + cleanupError)
    }
  }

  async function cancelEdit() {
    const cleanupCandidates = [
      editImageUrl && editImageUrl !== editOriginalImageUrl ? editImageUrl : null,
      ...editImageUrlsPendingCleanup,
    ]
    const cleanupError = await cleanupUnusedImages(cleanupCandidates)

    setIsEditing(null)
    setEditImageUrl(null)
    setEditOriginalImageUrl(null)
    setEditImageUrlsPendingCleanup([])

    if (cleanupError) {
      setStatusMessage('تم إلغاء التعديل، لكن تعذر حذف الصورة المرفوعة من التخزين: ' + cleanupError)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingSaving(true)
    setStatusMessage('')

    const nextImageUrl = newImageUrl?.trim() || null
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newName.trim(), description: newDescription.trim() || null, sort_order: newSort, image_url: nextImageUrl })
      .select()
      .single()

    if (error) {
      setStatusMessage('حدث خطأ أثناء إضافة القسم: ' + error.message)
      console.error(error)
      setAddingSaving(false)
      return
    }

    if (data) {
      const [englishTranslationError, turkishTranslationError] = await Promise.all([
        saveEnglishTranslation(data.id, newEnglishName, newEnglishDescription),
        saveTurkishTranslation(data.id, newTurkishName, newTurkishDescription),
      ])
      const translationError = englishTranslationError || turkishTranslationError
      const cleanupError = await cleanupUnusedImages(newImageUrlsPendingCleanup.filter(url => url !== nextImageUrl))
      setCategories([...categories, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      setIsAdding(false)
      setNewName('')
      setNewDescription('')
      setNewEnglishName('')
      setNewEnglishDescription('')
      setNewTurkishName('')
      setNewTurkishDescription('')
      setNewSort(0)
      setNewImageUrl(null)
      setNewImageUrlsPendingCleanup([])
      setStatusMessage(translationError
        ? 'تمت إضافة القسم، لكن تعذر حفظ إحدى الترجمات: ' + translationError.message
        : cleanupError
        ? 'تمت إضافة القسم بنجاح، لكن تعذر حذف صورة قديمة من التخزين: ' + cleanupError
        : 'تمت إضافة القسم بنجاح')
    }
    setAddingSaving(false)
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setSavingCategoryId(id)
    setStatusMessage('')

    const nextImageUrl = editImageUrl?.trim() || null
    const { error } = await supabase
      .from('categories')
      .update({ name: editName.trim(), description: editDescription.trim() || null, sort_order: editSort, image_url: nextImageUrl })
      .eq('id', id)

    if (error) {
      setStatusMessage('حدث خطأ أثناء تحديث القسم: ' + error.message)
      console.error(error)
      setSavingCategoryId(null)
      return
    }

    const [englishTranslationError, turkishTranslationError] = await Promise.all([
      saveEnglishTranslation(id, editEnglishName, editEnglishDescription),
      saveTurkishTranslation(id, editTurkishName, editTurkishDescription),
    ])
    const translationError = englishTranslationError || turkishTranslationError
    const cleanupCandidates = [
      editOriginalImageUrl && editOriginalImageUrl !== nextImageUrl ? editOriginalImageUrl : null,
      ...editImageUrlsPendingCleanup.filter(url => url !== nextImageUrl),
    ]
    const cleanupError = await cleanupUnusedImages(cleanupCandidates)

    setCategories(categories.map(c => c.id === id ? { ...c, name: editName.trim(), description: editDescription.trim() || null, sort_order: editSort, image_url: nextImageUrl } : c).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    setIsEditing(null)
    setEditOriginalImageUrl(null)
    setEditImageUrlsPendingCleanup([])
    setSavingCategoryId(null)
    setStatusMessage(translationError
      ? 'تم حفظ القسم، لكن تعذر حفظ إحدى الترجمات: ' + translationError.message
      : cleanupError
      ? 'تم حفظ القسم بنجاح، لكن تعذر حذف الصورة القديمة من التخزين: ' + cleanupError
      : 'تم حفظ القسم بنجاح')
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات التابعة له!')) return

    const categoryToDelete = categories.find(category => category.id === id)
    const { data: productsInCategory, error: productsError } = await supabase
      .from('menu_items')
      .select('image_url')
      .eq('category_id', id)

    if (productsError) {
      console.warn('Could not fetch category product images before delete:', productsError.message)
    }

    const cleanupCandidates = [
      categoryToDelete?.image_url,
      ...(productsInCategory || []).map(product => product.image_url),
    ]

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) {
      const cleanupError = await cleanupUnusedImages(cleanupCandidates)
      setCategories(categories.filter(c => c.id !== id))
      if (cleanupError) {
        setStatusMessage('تم حذف القسم، لكن تعذر حذف بعض الصور من التخزين: ' + cleanupError)
      } else if (productsError) {
        setStatusMessage('تم حذف القسم، لكن تعذر فحص صور المنتجات التابعة قبل الحذف: ' + productsError.message)
      } else {
        setStatusMessage('تم حذف القسم')
      }
    } else {
      setStatusMessage('حدث خطأ أثناء حذف القسم: ' + error.message)
    }
  }

  function startEdit(c: Category) {
    setIsAdding(false)
    setIsEditing(c.id)
    setEditName(c.name)
    setEditDescription(c.description || '')
    setEditEnglishName(englishByCategoryId[c.id]?.name || '')
    setEditEnglishDescription(englishByCategoryId[c.id]?.description || '')
    setEditTurkishName(turkishByCategoryId[c.id]?.name || '')
    setEditTurkishDescription(turkishByCategoryId[c.id]?.description || '')
    setEditSort(c.sort_order || 0)
    setEditImageUrl(c.image_url || null)
    setEditOriginalImageUrl(c.image_url || null)
    setEditImageUrlsPendingCleanup([])
    setEditEditorLocale('ar')
  }

  if (loading) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">{tx('جاري التحميل...')}</div>

  const newLocalizedName = newEditorLocale === 'ar' ? newName : newEditorLocale === 'en' ? newEnglishName : newTurkishName
  const newLocalizedDescription = newEditorLocale === 'ar' ? newDescription : newEditorLocale === 'en' ? newEnglishDescription : newTurkishDescription
  const editLocalizedName = editEditorLocale === 'ar' ? editName : editEditorLocale === 'en' ? editEnglishName : editTurkishName
  const editLocalizedDescription = editEditorLocale === 'ar' ? editDescription : editEditorLocale === 'en' ? editEnglishDescription : editTurkishDescription
  const contentLanguageLabel = (locale: EditorLocale) => locale === 'ar' ? 'العربية' : locale === 'en' ? 'English' : 'Türkçe'
  const contentNameLabel = (locale: EditorLocale) => locale === 'ar' ? 'اسم القسم بالعربية' : locale === 'en' ? 'English category name' : 'Türkçe kategori adı'
  const contentDescriptionLabel = (locale: EditorLocale) => locale === 'ar' ? 'الوصف بالعربية' : locale === 'en' ? 'English description' : 'Türkçe açıklama'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand-text">{tx('الأقسام')}</h1>
          <p className="text-sm leading-6 text-brand-brown">{tx('إدارة أقسام المنيو وصورها وترتيب ظهورها.')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsEditing(null)
            setIsAdding(true)
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          {tx('إضافة قسم')}
        </button>
      </div>

      {statusMessage && (
        <div className={`rounded-lg border p-4 text-sm font-bold ${statusMessage.includes('خطأ') ? 'border-red-100 bg-red-50 text-red-700' : statusMessage.includes('تعذر') ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-green-100 bg-green-50 text-green-700'}`}>
          {statusMessage}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-brand-border bg-brand-cream/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-brand-text">{tx('إضافة قسم جديد')}</h2>
              <p className="mt-1 text-sm text-brand-brown">{tx('أدخل العربية أولاً، ثم أضف الإنجليزية أو التركية عند توفرها.')}</p>
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-text">
              <Languages className="h-4 w-4 text-brand-burgundy" />
              <span>{tx('لغة المحتوى')}</span>
              <select value={newEditorLocale} onChange={e => setNewEditorLocale(e.target.value as EditorLocale)} className="bg-transparent outline-none" dir="ltr">
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0" dir={newEditorLocale === 'ar' ? 'rtl' : 'ltr'}>
              <label className="mb-2 block text-sm font-bold text-brand-text">{contentNameLabel(newEditorLocale)}</label>
              <input
                required={newEditorLocale === 'ar'}
                type="text"
                className="min-h-12 w-full rounded-xl border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                value={newLocalizedName}
                onChange={e => newEditorLocale === 'ar' ? setNewName(e.target.value) : newEditorLocale === 'en' ? setNewEnglishName(e.target.value) : setNewTurkishName(e.target.value)}
                placeholder={newEditorLocale === 'ar' ? 'مثال: وجبات الدجاج' : newEditorLocale === 'en' ? 'Example: Chicken meals' : 'Örnek: Tavuk yemekleri'}
              />
              <label className="mb-2 mt-4 block text-sm font-bold text-brand-text">{contentDescriptionLabel(newEditorLocale)}</label>
              <textarea
                className="w-full rounded-xl border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                rows={4}
                value={newLocalizedDescription}
                onChange={e => newEditorLocale === 'ar' ? setNewDescription(e.target.value) : newEditorLocale === 'en' ? setNewEnglishDescription(e.target.value) : setNewTurkishDescription(e.target.value)}
              />
              {newEditorLocale !== 'ar' && !newName.trim() && (
                <p className="mt-2 text-xs font-medium text-amber-700" dir="ltr">{tx('يجب إدخال الاسم العربي قبل حفظ القسم.')}</p>
              )}
            </div>
            <div className="min-w-0 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-brand-text">{tx('الترتيب')}</label>
                <input type="number" className="min-h-12 w-full rounded-xl border border-brand-border px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={newSort} onChange={e => setNewSort(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-brand-text">{tx('صورة القسم')}</label>
                <ImageUploader
                  value={newImageUrl}
                  onChange={handleNewImageChange}
                  onClear={clearNewCategoryImage}
                  folder="categories"
                  helperText={tx('تظهر هذه الصورة للزبائن في قائمة الأقسام.')}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-brand-border bg-brand-cream/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={cancelAdd} className="min-h-11 rounded-xl border border-brand-border bg-white px-5 py-2 text-sm font-bold text-brand-brown hover:bg-brand-cream">{tx('إلغاء')}</button>
            <button type="submit" disabled={addingSaving || !newName.trim()} className="min-h-11 rounded-xl bg-brand-burgundy px-5 py-2 text-sm font-bold text-white hover:bg-brand-burgundy-dark disabled:cursor-not-allowed disabled:opacity-50">{addingSaving ? tx('جاري الحفظ...') : tx('حفظ القسم')}</button>
          </div>
        </form>
      )}

      {isEditing && (() => {
        const category = categories.find(current => current.id === isEditing)
        if (!category) return null

        return (
          <section className="overflow-hidden rounded-2xl border border-brand-burgundy/20 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-brand-border bg-brand-cream/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-brand-text">{tx('تعديل القسم: {name}', { name: category.name })}</h2>
                <p className="mt-1 text-sm text-brand-brown">{tx('لغة واحدة ظاهرة في كل مرة لتبقى البيانات واضحة.')}</p>
              </div>
              <label className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-text">
                <Languages className="h-4 w-4 text-brand-burgundy" />
                <span>{tx('لغة المحتوى')}</span>
                <select value={editEditorLocale} onChange={e => setEditEditorLocale(e.target.value as EditorLocale)} className="bg-transparent outline-none" dir="ltr">
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0" dir={editEditorLocale === 'ar' ? 'rtl' : 'ltr'}>
                <label className="mb-2 block text-sm font-bold text-brand-text">{contentNameLabel(editEditorLocale)}</label>
                <input
                  type="text"
                  className="min-h-12 w-full rounded-xl border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                  value={editLocalizedName}
                  onChange={e => editEditorLocale === 'ar' ? setEditName(e.target.value) : editEditorLocale === 'en' ? setEditEnglishName(e.target.value) : setEditTurkishName(e.target.value)}
                  placeholder={editEditorLocale === 'ar' ? 'اسم القسم' : editEditorLocale === 'en' ? 'English category name' : 'Türkçe kategori adı'}
                />
                <label className="mb-2 mt-4 block text-sm font-bold text-brand-text">{contentDescriptionLabel(editEditorLocale)}</label>
                <textarea
                  className="w-full rounded-xl border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                  rows={4}
                  value={editLocalizedDescription}
                  onChange={e => editEditorLocale === 'ar' ? setEditDescription(e.target.value) : editEditorLocale === 'en' ? setEditEnglishDescription(e.target.value) : setEditTurkishDescription(e.target.value)}
                />
                {editEditorLocale !== 'ar' && !editLocalizedName.trim() && (
                  <p className="mt-2 text-xs font-medium text-brand-brown">Blank {contentLanguageLabel(editEditorLocale)} fields use the Arabic content in the customer menu.</p>
                )}
              </div>
              <div className="min-w-0 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-brand-text">{tx('الترتيب')}</label>
                  <input type="number" className="min-h-12 w-full rounded-xl border border-brand-border px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={editSort} onChange={e => setEditSort(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-brand-text">{tx('صورة القسم')}</label>
                  <ImageUploader value={editImageUrl} onChange={handleEditImageChange} onClear={() => clearEditingCategoryImage(category.id)} folder="categories" helperText={tx('تظهر هذه الصورة للزبائن في قائمة الأقسام.')} />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-brand-border bg-brand-cream/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={cancelEdit} className="min-h-11 rounded-xl border border-brand-border bg-white px-5 py-2 text-sm font-bold text-brand-brown hover:bg-brand-cream">{tx('إلغاء')}</button>
              <button type="button" disabled={savingCategoryId === category.id || !editName.trim()} onClick={() => handleUpdate(category.id)} className="min-h-11 rounded-xl bg-brand-burgundy px-5 py-2 text-sm font-bold text-white hover:bg-brand-burgundy-dark disabled:cursor-not-allowed disabled:opacity-50">{savingCategoryId === category.id ? tx('جاري الحفظ...') : tx('حفظ التغييرات')}</button>
            </div>
          </section>
        )
      })()}

      <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الصورة')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الاسم')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الترجمات')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الترتيب')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tx('الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {category.image_url ? (
                        <div className="relative w-12 h-12 rounded bg-gray-100 border overflow-hidden">
                          <Image src={category.image_url} alt={category.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 border flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="block text-sm font-medium text-gray-900">{category.name}</span>
                    {category.description && <span className="mt-1 block max-w-md truncate text-xs text-gray-500">{category.description}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${(englishByCategoryId[category.id]?.name || turkishByCategoryId[category.id]?.name) ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {englishByCategoryId[category.id]?.name && turkishByCategoryId[category.id]?.name ? 'English + Türkçe' : englishByCategoryId[category.id]?.name ? tx('English جاهزة') : turkishByCategoryId[category.id]?.name ? tx('Türkçe hazır') : tx('العربية فقط')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-gray-500">{category.sort_order}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-4">
                      <button type="button" onClick={() => startEdit(category)} className="text-brand-burgundy hover:text-brand-burgundy-dark" aria-label={`تعديل ${category.name}`}><Edit2 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-900" aria-label={`حذف ${category.name}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">{tx('لا يوجد أقسام')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block divide-y divide-brand-border md:hidden">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-4 bg-white p-4">
              <>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {category.image_url ? (
                        <div className="relative w-16 h-16 rounded bg-gray-100 border overflow-hidden">
                          <Image src={category.image_url} alt={category.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-gray-100 border flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="break-words text-base font-bold leading-6 text-gray-900">{category.name}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500"><span>{tx('الترتيب: {count}', { count: category.sort_order || 0 })}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${(englishByCategoryId[category.id]?.name || turkishByCategoryId[category.id]?.name) ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{englishByCategoryId[category.id]?.name && turkishByCategoryId[category.id]?.name ? 'English + Türkçe' : englishByCategoryId[category.id]?.name ? tx('English جاهزة') : turkishByCategoryId[category.id]?.name ? tx('Türkçe hazır') : tx('العربية فقط')}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button type="button" onClick={() => startEdit(category)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-brand-burgundy shadow-sm transition-colors hover:bg-gray-100">
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm font-bold">{tx('تعديل')}</span>
                    </button>
                    <button type="button" onClick={() => handleDelete(category.id)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-red-600 shadow-sm transition-colors hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-bold">{tx('حذف')}</span>
                    </button>
                  </div>
              </>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-8 text-center text-sm text-brand-brown">{tx('لا يوجد أقسام حتى الآن.')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
