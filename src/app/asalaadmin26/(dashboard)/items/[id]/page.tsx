'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import ImageUploader from '../../../components/ImageUploader'

type Category = Database['public']['Tables']['categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type OptionGroup = Database['public']['Tables']['item_option_groups']['Row']
type Option = Database['public']['Tables']['item_options']['Row']

export default function ItemFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const isNew = id === 'new'
  
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  
  const [item, setItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    base_price: 0,
    category_id: '',
    is_available: true,
    is_featured: false,
    sort_order: 0,
  })
  
  // To handle null vs number input nicely
  const [basePriceInput, setBasePriceInput] = useState<string>('0')

  const [groups, setGroups] = useState<(OptionGroup & { options: Option[] })[]>([])

  async function fetchData() {
    const { data: cats } = await supabase.from('categories').select('*')
    if (cats) {
      const collator = new Intl.Collator('ar')
      const sortedCats = cats.sort((a, b) => collator.compare(a.name, b.name))
      setCategories(sortedCats)
      if (sortedCats.length > 0 && !item.category_id) {
        setItem(prev => ({ ...prev, category_id: sortedCats[0].id }))
      }
    }

    if (id !== 'new') {
      const { data } = await supabase.from('menu_items').select('*').eq('id', id).single()
      if (data) {
        setItem(data)
        setBasePriceInput(data.base_price !== null ? String(data.base_price) : '')
        const { data: groupsData } = await supabase.from('item_option_groups').select('*, options:item_options(*)').eq('item_id', id).order('sort_order')
        if (groupsData) {
          setGroups(groupsData as never[])
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  async function saveItem(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...item,
      base_price: basePriceInput.trim() === '' ? null : parseFloat(basePriceInput)
    }

    if (isNew) {
      const { data, error } = await supabase.from('menu_items').insert(payload as never).select().single()
      if (data) {
        router.push(`/asalaadmin26/items/${data.id}`)
      }
    } else {
      await supabase.from('menu_items').update(payload as never).eq('id', id)
      alert('تم الحفظ بنجاح')
    }
    setSaving(false)
  }

  async function addGroup() {
    if (isNew) return alert('يرجى حفظ المنتج أولاً قبل إضافة خيارات')
    const { data } = await supabase.from('item_option_groups').insert({
      item_id: id,
      title: 'مجموعة جديدة',
      kind: 'variant',
      selection_type: 'single',
    }).select().single()
    
    if (data) setGroups([...groups, { ...data, options: [] }])
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('تأكيد الحذف؟')) return
    await supabase.from('item_option_groups').delete().eq('id', groupId)
    setGroups(groups.filter(g => g.id !== groupId))
  }

  async function updateGroup(groupId: string, updates: Partial<OptionGroup>) {
    await supabase.from('item_option_groups').update(updates).eq('id', groupId)
    setGroups(groups.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }

  async function addOption(groupId: string) {
    const { data } = await supabase.from('item_options').insert({
      group_id: groupId,
      name: 'خيار جديد',
      price: 0,
    }).select().single()
    if (data) {
      setGroups(groups.map(g => g.id === groupId ? { ...g, options: [...g.options, data] } : g))
    }
  }

  async function updateOption(groupId: string, optionId: string, updates: Partial<Option>) {
    await supabase.from('item_options').update(updates).eq('id', optionId)
    setGroups(groups.map(g => g.id === groupId ? {
      ...g,
      options: g.options.map(o => o.id === optionId ? { ...o, ...updates } : o)
    } : g))
  }

  async function deleteOption(groupId: string, optionId: string) {
    await supabase.from('item_options').delete().eq('id', optionId)
    setGroups(groups.map(g => g.id === groupId ? {
      ...g,
      options: g.options.filter(o => o.id !== optionId)
    } : g))
  }

  if (loading) return <div>جاري التحميل...</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'إضافة منتج' : 'تعديل المنتج'}</h1>
        <button onClick={() => router.push('/asalaadmin26/items')} className="text-gray-600 hover:text-gray-900">العودة للمنتجات</button>
      </div>

      <form onSubmit={saveItem} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-md" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
            <select required className="w-full px-3 py-2 border rounded-md" value={item.category_id || ''} onChange={e => setItem({ ...item, category_id: e.target.value })}>
              <option value="">اختر القسم</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={item.description || ''} onChange={e => setItem({ ...item, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأساسي (اتركه فارغاً إذا كان يعتمد على الخيارات)</label>
            <input type="number" step="0.01" className="w-full px-3 py-2 border rounded-md" value={basePriceInput} onChange={e => setBasePriceInput(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">صورة المنتج</label>
            <ImageUploader 
              value={item.image_url || null} 
              onChange={(url) => setItem({ ...item, image_url: url })} 
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.is_available || false} onChange={e => setItem({ ...item, is_available: e.target.checked })} />
              <span className="text-sm">متاح للطلب</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.is_featured || false} onChange={e => setItem({ ...item, is_featured: e.target.checked })} />
              <span className="text-sm">منتج مميز</span>
            </label>
          </div>
        </div>
        
        <button type="submit" disabled={saving} className="bg-brand-burgundy text-white px-6 py-2 rounded-md hover:bg-brand-burgundy-dark disabled:opacity-50">
          {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
        </button>
      </form>

      <div className="space-y-4">
        <div className="flex justify-between items-center mt-8">
          <h2 className="text-xl font-bold text-gray-900">مجموعات الخيارات (Variants/Addons)</h2>
          <button 
            type="button" 
            onClick={addGroup} 
            disabled={isNew}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${isNew ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            <Plus className="w-4 h-4" /> إضافة مجموعة
          </button>
        </div>

        {isNew ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            يرجى حفظ المنتج أولاً لتتمكن من إضافة الخيارات والتعديلات
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex gap-4 mb-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">عنوان المجموعة</label>
                  <input type="text" className="w-full px-2 py-1 border rounded" value={group.title} onChange={e => updateGroup(group.id, { title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">النوع</label>
                  <select className="w-full px-2 py-1 border rounded" value={group.kind || 'variant'} onChange={e => updateGroup(group.id, { kind: e.target.value as never })}>
                    <option value="variant">نوع (Variant)</option>
                    <option value="addon">إضافة (Addon)</option>
                    <option value="modifier">تعديل (Modifier)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">طبيعة الاختيار</label>
                  <select className="w-full px-2 py-1 border rounded" value={group.selection_type || 'single'} onChange={e => updateGroup(group.id, { selection_type: e.target.value as never })}>
                    <option value="single">اختيار واحد</option>
                    <option value="multiple">متعدد</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={group.is_required || false} onChange={e => updateGroup(group.id, { is_required: e.target.checked })} /> إجباري</label>
                </div>
                <button onClick={() => deleteGroup(group.id)} className="text-red-600 hover:text-red-900 mb-1"><Trash2 className="w-5 h-5" /></button>
              </div>

              <div className="pl-4 border-r-2 border-gray-300 mr-4 pr-4">
                <h4 className="text-sm font-semibold mb-2">الخيارات:</h4>
                <div className="space-y-2">
                  {group.options.map(opt => (
                    <div key={opt.id} className="flex gap-2 items-center bg-white p-2 rounded border">
                      <input type="text" className="flex-1 px-2 py-1 border rounded text-sm" value={opt.name} onChange={e => updateOption(group.id, opt.id, { name: e.target.value })} placeholder="الاسم (مثال: حجم كبير)" />
                      <input type="number" className="w-32 px-2 py-1 border rounded text-sm" value={opt.price || 0} onChange={e => updateOption(group.id, opt.id, { price: parseFloat(e.target.value) || 0 })} placeholder="السعر الإضافي" />
                      <button onClick={() => deleteOption(group.id, opt.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => addOption(group.id)} className="text-sm text-brand-burgundy hover:text-brand-burgundy-dark flex items-center gap-1 mt-2">
                    <Plus className="w-3 h-3" /> إضافة خيار
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
