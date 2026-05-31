'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react'
import ImageUploader from '../../components/ImageUploader'
import Image from 'next/image'
import { deleteMenuImagesIfUnused } from '@/lib/storage-images'

type Category = Database['public']['Tables']['categories']['Row']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSort, setEditSort] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSort, setNewSort] = useState(0)
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [addingSaving, setAddingSaving] = useState(false)
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editOriginalImageUrl, setEditOriginalImageUrl] = useState<string | null>(null)
  const [newImageUrlsPendingCleanup, setNewImageUrlsPendingCleanup] = useState<string[]>([])
  const [editImageUrlsPendingCleanup, setEditImageUrlsPendingCleanup] = useState<string[]>([])

  const supabase = createClient()

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (data) setCategories(data)
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
      .insert({ name: newName, sort_order: newSort, image_url: nextImageUrl })
      .select()
      .single()

    if (error) {
      setStatusMessage('حدث خطأ أثناء إضافة القسم: ' + error.message)
      console.error(error)
      setAddingSaving(false)
      return
    }

    if (data) {
      const cleanupError = await cleanupUnusedImages(newImageUrlsPendingCleanup.filter(url => url !== nextImageUrl))
      setCategories([...categories, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      setIsAdding(false)
      setNewName('')
      setNewSort(0)
      setNewImageUrl(null)
      setNewImageUrlsPendingCleanup([])
      setStatusMessage(cleanupError
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
      .update({ name: editName, sort_order: editSort, image_url: nextImageUrl })
      .eq('id', id)

    if (error) {
      setStatusMessage('حدث خطأ أثناء تحديث القسم: ' + error.message)
      console.error(error)
      setSavingCategoryId(null)
      return
    }

    const cleanupCandidates = [
      editOriginalImageUrl && editOriginalImageUrl !== nextImageUrl ? editOriginalImageUrl : null,
      ...editImageUrlsPendingCleanup.filter(url => url !== nextImageUrl),
    ]
    const cleanupError = await cleanupUnusedImages(cleanupCandidates)

    setCategories(categories.map(c => c.id === id ? { ...c, name: editName, sort_order: editSort, image_url: nextImageUrl } : c).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    setIsEditing(null)
    setEditOriginalImageUrl(null)
    setEditImageUrlsPendingCleanup([])
    setSavingCategoryId(null)
    setStatusMessage(cleanupError
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
    setIsEditing(c.id)
    setEditName(c.name)
    setEditSort(c.sort_order || 0)
    setEditImageUrl(c.image_url || null)
    setEditOriginalImageUrl(c.image_url || null)
    setEditImageUrlsPendingCleanup([])
  }

  if (loading) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">جاري التحميل...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand-text">الأقسام</h1>
          <p className="text-sm leading-6 text-brand-brown">إدارة أقسام المنيو وصورها وترتيب ظهورها.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          إضافة قسم
        </button>
      </div>

      {statusMessage && (
        <div className={`rounded-lg border p-4 text-sm font-bold ${statusMessage.includes('خطأ') ? 'border-red-100 bg-red-50 text-red-700' : statusMessage.includes('تعذر') ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-green-100 bg-green-50 text-green-700'}`}>
          {statusMessage}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="flex flex-col gap-5 rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-bold text-brand-text">الاسم</label>
              <input required type="text" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-bold text-brand-text">الترتيب</label>
              <input type="number" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={newSort} onChange={e => setNewSort(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-brand-text">صورة القسم</label>
            <ImageUploader
              value={newImageUrl}
              onChange={handleNewImageChange}
              onClear={clearNewCategoryImage}
              folder="categories"
              helperText="ستظهر هذه الصورة في الصفحة الرئيسية للأقسام (المقاس المقترح: 1200 × 1200 بكسل)"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:flex sm:justify-end">
            <button type="button" onClick={cancelAdd} className="min-h-11 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-brown hover:bg-brand-cream sm:w-auto">إلغاء</button>
            <button type="submit" disabled={addingSaving} className="min-h-11 rounded-xl bg-brand-burgundy px-4 py-2 text-sm font-bold text-white hover:bg-brand-burgundy-dark disabled:opacity-50 sm:w-auto">{addingSaving ? 'جاري الحفظ...' : 'حفظ القسم'}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصورة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الترتيب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing === category.id ? (
                      <div className="w-32">
                        <ImageUploader
                          value={editImageUrl}
                          onChange={handleEditImageChange}
                          onClear={() => clearEditingCategoryImage(category.id)}
                          folder="categories"
                        />
                      </div>
                    ) : (
                      category.image_url ? (
                        <div className="relative w-12 h-12 rounded bg-gray-100 border overflow-hidden">
                          <Image src={category.image_url} alt={category.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 border flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing === category.id ? (
                      <input type="text" className="w-full px-2 py-1 border rounded" value={editName} onChange={e => setEditName(e.target.value)} />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing === category.id ? (
                      <input type="number" className="w-24 px-2 py-1 border rounded" value={editSort} onChange={e => setEditSort(parseInt(e.target.value) || 0)} />
                    ) : (
                      <span className="text-sm text-gray-500">{category.sort_order}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isEditing === category.id ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleUpdate(category.id)} className="text-green-600 hover:text-green-900">حفظ</button>
                        <button type="button" onClick={cancelEdit} className="text-gray-600 hover:text-gray-900">إلغاء</button>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <button type="button" onClick={() => startEdit(category)} className="text-brand-burgundy hover:text-brand-burgundy-dark"><Edit2 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">لا يوجد أقسام</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block divide-y divide-brand-border md:hidden">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-4 bg-white p-4">
              {isEditing === category.id ? (
                <div className="flex flex-col gap-3">
                  <div className="w-full">
                    <ImageUploader
                      value={editImageUrl}
                      onChange={handleEditImageChange}
                      onClear={() => clearEditingCategoryImage(category.id)}
                      folder="categories"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600">الاسم</label>
                    <input type="text" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600">الترتيب</label>
                    <input type="number" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={editSort} onChange={e => setEditSort(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button type="button" disabled={savingCategoryId === category.id} onClick={() => handleUpdate(category.id)} className="min-h-11 rounded-xl bg-brand-burgundy py-3 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50">{savingCategoryId === category.id ? 'جاري الحفظ...' : 'حفظ'}</button>
                    <button type="button" onClick={cancelEdit} className="min-h-11 rounded-xl border border-gray-200 bg-gray-100 py-3 text-sm font-bold text-gray-700 transition-colors">إلغاء</button>
                  </div>
                </div>
              ) : (
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
                      <div className="text-sm text-gray-500 mt-1">الترتيب: {category.sort_order}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button type="button" onClick={() => startEdit(category)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-brand-burgundy shadow-sm transition-colors hover:bg-gray-100">
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm font-bold">تعديل</span>
                    </button>
                    <button type="button" onClick={() => handleDelete(category.id)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-red-600 shadow-sm transition-colors hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-bold">حذف</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-8 text-center text-sm text-brand-brown">لا يوجد أقسام حتى الآن.</div>
          )}
        </div>
      </div>
    </div>
  )
}
