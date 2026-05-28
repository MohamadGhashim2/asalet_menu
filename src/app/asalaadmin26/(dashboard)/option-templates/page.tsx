'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Trash2, Plus, Link as LinkIcon, Loader2 } from 'lucide-react'

type OptionTemplate = Database['public']['Tables']['option_group_templates']['Row']
type TemplateOption = Database['public']['Tables']['option_template_options']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export default function OptionTemplatesPage() {
  const supabase = createClient()
  
  const [templates, setTemplates] = useState<(OptionTemplate & { options: TemplateOption[] })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // For Bulk Linking Modal
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')

  async function fetchData() {
    const { data: tpls } = await supabase
      .from('option_group_templates')
      .select('*, options:option_template_options(*)')
      .order('created_at', { ascending: false })
      
    if (tpls) {
      setTemplates(tpls as never[])
    }
    
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order')
    if (cats) {
      setCategories(cats)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function addTemplate() {
    const { data } = await supabase.from('option_group_templates').insert({
      template_name: 'قالب جديد (اسم داخلي)',
      display_title: 'عنوان جديد (للزبائن)',
      kind: 'addon',
      selection_type: 'multiple',
    }).select().single()
    
    if (data) {
      setTemplates([{ ...data, options: [] }, ...templates])
    }
  }

  async function updateTemplate(id: string, updates: Partial<OptionTemplate>) {
    await supabase.from('option_group_templates').update(updates).eq('id', id)
    setTemplates(templates.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function deleteTemplate(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا القالب نهائياً؟ سيتم حذفه من جميع المنتجات المرتبطة.')) return
    await supabase.from('option_group_templates').delete().eq('id', id)
    setTemplates(templates.filter(t => t.id !== id))
  }

  async function addOption(templateId: string) {
    const { data } = await supabase.from('option_template_options').insert({
      template_id: templateId,
      name: 'خيار جديد',
      price: 0,
    }).select().single()
    
    if (data) {
      setTemplates(templates.map(t => t.id === templateId ? { ...t, options: [...t.options, data] } : t))
    }
  }

  async function updateOption(templateId: string, optionId: string, updates: Partial<TemplateOption>) {
    await supabase.from('option_template_options').update(updates).eq('id', optionId)
    setTemplates(templates.map(t => t.id === templateId ? {
      ...t,
      options: t.options.map(o => o.id === optionId ? { ...o, ...updates } : o)
    } : t))
  }

  async function deleteOption(templateId: string, optionId: string) {
    await supabase.from('option_template_options').delete().eq('id', optionId)
    setTemplates(templates.map(t => t.id === templateId ? {
      ...t,
      options: t.options.filter(o => o.id !== optionId)
    } : t))
  }
  
  async function handleBulkLink() {
    if (!selectedTemplate || !selectedCategory) return
    setBulkLoading(true)
    setBulkMessage('')
    
    try {
      // Get all items in this category
      const { data: items } = await supabase.from('menu_items').select('id').eq('category_id', selectedCategory)
      if (!items || items.length === 0) {
        setBulkMessage('لا يوجد منتجات في هذا القسم.')
        setBulkLoading(false)
        return
      }
      
      let successCount = 0
      let duplicateCount = 0
      
      // Attempt to link all items
      for (const item of items) {
        // Upsert style or catch duplicate unique constraint error
        const { error } = await supabase.from('item_option_template_links').insert({
          item_id: item.id,
          template_id: selectedTemplate,
        })
        
        if (error) {
          // If duplicate unique constraint
          if (error.code === '23505') {
             duplicateCount++
          }
        } else {
          successCount++
        }
      }
      
      setBulkMessage(`تم الربط بنجاح مع ${successCount} منتج. (تم تجاهل ${duplicateCount} منتجات لارتباطها مسبقاً)`)
    } catch (e) {
      setBulkMessage('حدث خطأ أثناء الربط.')
    }
    
    setBulkLoading(false)
  }

  if (loading) return <div>جاري التحميل...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">قوالب الإضافات (Templates)</h1>
        <button 
          onClick={addTemplate}
          className="bg-brand-burgundy text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-brand-burgundy-dark transition-colors"
        >
          <Plus className="w-4 h-4" /> إنشاء قالب جديد
        </button>
      </div>
      
      <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-6 border border-blue-100">
        <p className="font-bold mb-1">ملاحظة:</p>
        <p>التعديل على أي قالب هنا سينعكس فوراً على جميع المنتجات المرتبطة به. لا داعي لتعديل الإضافات المشتركة لكل منتج على حدة.</p>
      </div>

      <div className="space-y-8">
        {templates.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
            لا توجد قوالب حالياً. قم بإنشاء قالب جديد لربطه بالمنتجات لاحقاً.
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
              <div className="absolute top-5 left-5 flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedTemplate(template.id)
                    setBulkMessage('')
                    setShowBulkModal(true)
                  }}
                  className="bg-brand-cream text-brand-burgundy border border-brand-burgundy/20 hover:bg-brand-burgundy hover:text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                  title="ربط جماعي بقسم كامل"
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
                <button onClick={() => deleteTemplate(template.id)} className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-sm">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-5 pr-14 md:pr-0">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم القالب (داخلي للإدارة)</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy bg-gray-50" value={template.template_name} onChange={e => updateTemplate(template.id, { template_name: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-brand-burgundy mb-1">العنوان للزبون (Public Title)</label>
                  <input type="text" className="w-full px-3 py-2 border border-brand-burgundy/30 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy" value={template.display_title} onChange={e => updateTemplate(template.id, { display_title: e.target.value })} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <div className="w-full sm:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy bg-white" value={template.kind || 'addon'} onChange={e => updateTemplate(template.id, { kind: e.target.value as never })}>
                    <option value="variant">نوع (Variant)</option>
                    <option value="addon">إضافة (Addon)</option>
                    <option value="modifier">تعديل (Modifier)</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">طبيعة الاختيار</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-burgundy focus:border-brand-burgundy bg-white" value={template.selection_type || 'multiple'} onChange={e => updateTemplate(template.id, { selection_type: e.target.value as never })}>
                    <option value="single">اختيار واحد</option>
                    <option value="multiple">متعدد</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/3 flex items-end pb-1">
                  <label className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors w-full">
                    <input type="checkbox" className="w-5 h-5 text-brand-burgundy rounded focus:ring-brand-burgundy border-gray-300" checked={template.is_required || false} onChange={e => updateTemplate(template.id, { is_required: e.target.checked })} /> 
                    <span className="text-sm font-medium text-gray-700">إجباري</span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-800 mb-3">خيارات القالب:</h4>
                <div className="space-y-3">
                  {template.options.map(opt => (
                    <div key={opt.id} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="w-full flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">الاسم</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy" value={opt.name} onChange={e => updateOption(template.id, opt.id, { name: e.target.value })} placeholder="الاسم (مثال: حجم كبير)" />
                      </div>
                      <div className="w-full sm:w-32 shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">السعر الإضافي</label>
                        <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy" value={opt.price || 0} onChange={e => updateOption(template.id, opt.id, { price: parseFloat(e.target.value) || 0 })} placeholder="السعر" />
                      </div>
                      <div className="w-full sm:w-auto flex justify-end shrink-0">
                        <button onClick={() => deleteOption(template.id, opt.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center justify-center transition-colors w-full sm:w-auto mt-1 sm:mt-0 border border-red-100 sm:border-none bg-red-50 sm:bg-transparent">
                          <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                          <span className="text-sm sm:hidden font-medium">حذف الخيار</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addOption(template.id)} className="w-full sm:w-auto mt-2 px-4 py-3 sm:py-2 bg-brand-burgundy/10 text-brand-burgundy hover:bg-brand-burgundy/20 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                    <Plus className="w-4 h-4" /> إضافة خيار
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Link Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">ربط القالب بقسم كامل</h3>
            <p className="text-gray-600 mb-6 text-sm">سيتم ربط القالب المختار بجميع المنتجات داخل القسم المحدد. سيتم تجاهل المنتجات المرتبطة مسبقاً بهذا القالب.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">اختر القسم</label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-brand-burgundy focus:border-brand-burgundy"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">-- يرجى الاختيار --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            {bulkMessage && (
              <div className={`p-3 rounded-lg mb-6 text-sm ${bulkMessage.includes('بنجاح') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {bulkMessage}
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowBulkModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                disabled={bulkLoading}
              >
                إغلاق
              </button>
              <button 
                onClick={handleBulkLink}
                disabled={!selectedCategory || bulkLoading}
                className="bg-brand-burgundy text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-burgundy-dark disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {bulkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                بدء الربط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
