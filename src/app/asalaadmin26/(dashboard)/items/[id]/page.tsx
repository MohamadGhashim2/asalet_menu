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
  
  // Template Linking State
  const [availableTemplates, setAvailableTemplates] = useState<Database['public']['Tables']['option_group_templates']['Row'][]>([])
  const [linkedTemplates, setLinkedTemplates] = useState<(Database['public']['Tables']['item_option_template_links']['Row'] & { option_group_templates: Database['public']['Tables']['option_group_templates']['Row'] })[]>([])
  const [selectedTemplateToLink, setSelectedTemplateToLink] = useState('')

  const [templateStates, setTemplateStates] = useState<Record<string, {
    checked: boolean,
    template_name: string,
    display_title: string
  }>>({})

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
    
    // Fetch active templates for dropdown
    const { data: templates } = await supabase.from('option_group_templates').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (templates) setAvailableTemplates(templates)

    if (id !== 'new') {
      const { data } = await supabase.from('menu_items').select('*').eq('id', id).single()
      if (data) {
        setItem(data)
        setBasePriceInput(data.base_price !== null ? String(data.base_price) : '')
        const { data: groupsData } = await supabase.from('item_option_groups').select('*, options:item_options(*)').eq('item_id', id).order('sort_order')
        if (groupsData) {
          setGroups(groupsData as never[])
        }
        
        // Fetch linked templates for this item
        const { data: links } = await supabase
          .from('item_option_template_links')
          .select('*, option_group_templates(*)')
          .eq('item_id', id)
          .order('created_at')
        if (links) setLinkedTemplates(links as never[])
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

  async function linkTemplate() {
    if (!selectedTemplateToLink) return
    const { data, error } = await supabase.from('item_option_template_links').insert({
      item_id: id,
      template_id: selectedTemplateToLink,
    }).select('*, option_group_templates(*)').single()

    if (error) {
      if (error.code === '23505') alert('هذا القالب مرتبط بهذا الطبق مسبقاً')
      else alert('حدث خطأ أثناء الربط')
      return
    }

    if (data) {
      setLinkedTemplates([...linkedTemplates, data as never])
      setSelectedTemplateToLink('')
    }
  }

  async function unlinkTemplate(linkId: string) {
    if (!confirm('تأكيد إلغاء الربط؟ لن يتم حذف القالب الأساسي، بل سيتم فصله عن هذا المنتج فقط.')) return
    await supabase.from('item_option_template_links').delete().eq('id', linkId)
    setLinkedTemplates(linkedTemplates.filter(l => l.id !== linkId))
  }

  async function convertToTemplate(group: OptionGroup & { options: Option[] }) {
    const tState = templateStates[group.id];
    if (!tState || !tState.template_name.trim() || !tState.display_title.trim()) {
      return alert('يرجى إدخال اسم القالب والعنوان الظاهر');
    }
    if (group.options.length === 0) {
      return alert('يجب إضافة خيار واحد على الأقل للقالب');
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('option_group_templates')
      .select('id')
      .eq('template_name', tState.template_name.trim())
      .maybeSingle();

    if (existing) {
      return alert('يوجد قالب بهذا الاسم مسبقاً، اختر اسماً آخر أو اربط القالب الموجود.');
    }

    // Insert template
    const { data: newTemplate, error: tErr } = await supabase
      .from('option_group_templates')
      .insert({
        template_name: tState.template_name.trim(),
        display_title: tState.display_title.trim(),
        kind: group.kind,
        selection_type: group.selection_type,
        is_required: group.is_required,
        min_select: group.min_select,
        max_select: group.max_select,
        sort_order: group.sort_order,
        is_active: true
      }).select().single();

    if (tErr || !newTemplate) {
      return alert('حدث خطأ أثناء إنشاء القالب');
    }

    // Insert options
    if (group.options.length > 0) {
      const optionsToInsert = group.options.map(opt => ({
        template_id: newTemplate.id,
        name: opt.name,
        price: opt.price,
        is_default: opt.is_default,
        sort_order: opt.sort_order,
        is_active: opt.is_active
      }));
      await supabase.from('option_template_options').insert(optionsToInsert);
    }

    // Link to current item
    const { data: newLink } = await supabase
      .from('item_option_template_links')
      .insert({
        item_id: id,
        template_id: newTemplate.id
      }).select('*, option_group_templates(*)').single();

    // Delete old group
    await supabase.from('item_option_groups').delete().eq('id', group.id);

    // Update UI State
    setGroups(prev => prev.filter(g => g.id !== group.id));
    if (newLink) {
      setLinkedTemplates(prev => [...prev, newLink as never]);
      setAvailableTemplates(prev => [newTemplate, ...prev]);
    }
    
    alert('تم تحويل المجموعة إلى قالب وربطها بنجاح');
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
            <div key={group.id} className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm mb-6 last:mb-0">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">مجموعة خيارات</h3>
                <button onClick={() => deleteGroup(group.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center justify-center transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المجموعة</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy" value={group.title} onChange={e => updateGroup(group.id, { title: e.target.value })} />
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy bg-white" value={group.kind || 'variant'} onChange={e => updateGroup(group.id, { kind: e.target.value as never })}>
                    <option value="variant">نوع (Variant)</option>
                    <option value="addon">إضافة (Addon)</option>
                    <option value="modifier">تعديل (Modifier)</option>
                  </select>
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-sm font-medium text-gray-700 mb-1">طبيعة الاختيار</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy bg-white" value={group.selection_type || 'single'} onChange={e => updateGroup(group.id, { selection_type: e.target.value as never })}>
                    <option value="single">اختيار واحد</option>
                    <option value="multiple">متعدد</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors w-full sm:w-fit">
                  <input type="checkbox" className="w-5 h-5 text-brand-burgundy rounded focus:ring-brand-burgundy border-gray-300" checked={group.is_required || false} onChange={e => updateGroup(group.id, { is_required: e.target.checked })} /> 
                  <span className="text-sm font-medium text-gray-700">إجباري (يجب اختيار خيار واحد على الأقل)</span>
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-800 mb-3">الخيارات:</h4>
                <div className="space-y-3">
                  {group.options.map(opt => (
                    <div key={opt.id} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="w-full flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">الاسم</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy" value={opt.name} onChange={e => updateOption(group.id, opt.id, { name: e.target.value })} placeholder="الاسم (مثال: حجم كبير)" />
                      </div>
                      <div className="w-full sm:w-32 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">السعر الإضافي</label>
                        <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy" value={opt.price || 0} onChange={e => updateOption(group.id, opt.id, { price: parseFloat(e.target.value) || 0 })} placeholder="السعر الإضافي" />
                      </div>
                      <div className="w-full sm:w-auto flex justify-end shrink-0">
                        <button onClick={() => deleteOption(group.id, opt.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center justify-center transition-colors w-full sm:w-auto mt-1 sm:mt-0 border border-red-100 sm:border-none bg-red-50 sm:bg-transparent">
                          <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                          <span className="text-sm sm:hidden font-medium">حذف الخيار</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addOption(group.id)} className="w-full sm:w-auto mt-2 px-4 py-3 sm:py-2 bg-brand-burgundy/10 text-brand-burgundy hover:bg-brand-burgundy/20 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                    <Plus className="w-4 h-4" /> إضافة خيار
                  </button>
                </div>
              </div>
              
              {/* Convert to Template Section */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer mb-3 w-fit">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-brand-burgundy rounded focus:ring-brand-burgundy border-gray-300"
                    checked={templateStates[group.id]?.checked || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTemplateStates(prev => ({
                        ...prev,
                        [group.id]: {
                          checked,
                          template_name: prev[group.id]?.template_name || group.title,
                          display_title: prev[group.id]?.display_title || group.title
                        }
                      }));
                    }}
                  />
                  <span className="text-sm font-bold text-brand-burgundy">حفظ هذه المجموعة كقالب (اختياري)</span>
                </label>
                
                {templateStates[group.id]?.checked && (
                  <div className="bg-brand-cream/50 p-4 rounded-lg border border-brand-burgundy/20 space-y-4">
                    <p className="text-xs text-brand-brown">اسم القالب يظهر داخل لوحة الإدارة فقط، أما العنوان الظاهر فهو الذي يراه الزبون داخل المنيو.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">اسم القالب داخل الإدارة</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy bg-white"
                          value={templateStates[group.id].template_name}
                          onChange={e => setTemplateStates(prev => ({...prev, [group.id]: {...prev[group.id], template_name: e.target.value}}))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">العنوان الظاهر للزبون</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy bg-white"
                          value={templateStates[group.id].display_title}
                          onChange={e => setTemplateStates(prev => ({...prev, [group.id]: {...prev[group.id], display_title: e.target.value}}))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => convertToTemplate(group)}
                        className="bg-brand-burgundy text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-burgundy-dark transition-colors shadow-sm"
                      >
                        تأكيد وحفظ كقالب
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      <div className="space-y-4 mt-12 border-t pt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">القوالب المرتبطة (Linked Templates)</h2>
        </div>

        {isNew ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            يرجى حفظ المنتج أولاً لتتمكن من ربط القوالب
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-100 flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full flex-1">
                <label className="block text-sm font-medium text-blue-900 mb-1">اختر قالباً لربطه بهذا المنتج</label>
                <select 
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={selectedTemplateToLink}
                  onChange={e => setSelectedTemplateToLink(e.target.value)}
                >
                  <option value="">-- اختر قالب --</option>
                  {availableTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name} (يظهر للزبون: {t.display_title})</option>
                  ))}
                </select>
              </div>
              <button 
                type="button" 
                onClick={linkTemplate}
                disabled={!selectedTemplateToLink}
                className="bg-blue-600 text-white w-full sm:w-auto px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium h-[42px] flex items-center justify-center"
              >
                ربط القالب
              </button>
            </div>

            {linkedTemplates.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4 bg-gray-50 rounded-lg border border-gray-100">لا توجد قوالب مرتبطة حالياً بهذا المنتج.</div>
            ) : (
              <div className="grid gap-4">
                {linkedTemplates.map(link => (
                  <div key={link.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-gray-800">{link.option_group_templates.template_name}</h3>
                      <p className="text-sm text-gray-500 mt-1">النوع: {link.option_group_templates.kind} | يظهر للزبون كـ: {link.option_group_templates.display_title}</p>
                    </div>
                    <button 
                      onClick={() => unlinkTemplate(link.id)} 
                      className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium border border-red-100 w-full sm:w-auto"
                    >
                      <Trash2 className="w-4 h-4" /> فك الارتباط
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
