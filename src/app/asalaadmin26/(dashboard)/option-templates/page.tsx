'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Trash2, Plus, Link as LinkIcon, Loader2, Languages } from 'lucide-react'
import AdminSwitch from '../../components/AdminSwitch'
import { useAdminText } from '@/i18n/admin-text'

type OptionTemplate = Database['public']['Tables']['option_group_templates']['Row']
type TemplateOption = Database['public']['Tables']['option_template_options']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type TemplateTranslation = Database['public']['Tables']['option_group_template_translations']['Row']
type TemplateOptionTranslation = Database['public']['Tables']['option_template_option_translations']['Row']
type ContentLocale = 'ar' | 'en' | 'tr'

export default function OptionTemplatesPage() {
  const tx = useAdminText()
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
  const [actionMessage, setActionMessage] = useState('')
  const [contentLocale, setContentLocale] = useState<ContentLocale>('ar')
  const [englishByTemplateId, setEnglishByTemplateId] = useState<Record<string, TemplateTranslation>>({})
  const [englishByOptionId, setEnglishByOptionId] = useState<Record<string, TemplateOptionTranslation>>({})
  const [turkishByTemplateId, setTurkishByTemplateId] = useState<Record<string, TemplateTranslation>>({})
  const [turkishByOptionId, setTurkishByOptionId] = useState<Record<string, TemplateOptionTranslation>>({})

  async function fetchData() {
    const [{ data: tpls }, { data: templateTranslations }, { data: optionTranslations }] = await Promise.all([
      supabase
        .from('option_group_templates')
        .select('*, options:option_template_options(*)')
        .order('created_at', { ascending: false }),
      supabase.from('option_group_template_translations').select('*').in('locale', ['en', 'tr']),
      supabase.from('option_template_option_translations').select('*').in('locale', ['en', 'tr']),
    ])
      
    if (tpls) {
      setTemplates(tpls as never[])
    }
    if (templateTranslations) {
      setEnglishByTemplateId(Object.fromEntries(templateTranslations.filter((translation) => translation.locale === 'en').map((translation) => [translation.option_group_template_id, translation])))
      setTurkishByTemplateId(Object.fromEntries(templateTranslations.filter((translation) => translation.locale === 'tr').map((translation) => [translation.option_group_template_id, translation])))
    }
    if (optionTranslations) {
      setEnglishByOptionId(Object.fromEntries(optionTranslations.filter((translation) => translation.locale === 'en').map((translation) => [translation.option_template_option_id, translation])))
      setTurkishByOptionId(Object.fromEntries(optionTranslations.filter((translation) => translation.locale === 'tr').map((translation) => [translation.option_template_option_id, translation])))
    }
    
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order')
    if (cats) {
      setCategories(cats)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [])

  async function addTemplate() {
    setActionMessage('')
    const { data } = await supabase.from('option_group_templates').insert({
      template_name: 'قالب جديد (اسم داخلي)',
      display_title: 'عنوان جديد (للزبائن)',
      kind: 'addon',
      selection_type: 'multiple',
    }).select().single()
    
    if (data) {
      setTemplates([{ ...data, options: [] }, ...templates])
      setActionMessage('تم إنشاء قالب جديد')
    }
  }

  async function updateTemplate(id: string, updates: Partial<OptionTemplate>) {
    await supabase.from('option_group_templates').update(updates).eq('id', id)
    setTemplates(templates.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function saveEnglishTemplateTitle(templateId: string, displayTitle: string) {
    const normalizedTitle = displayTitle.trim()
    if (!normalizedTitle) {
      const { error } = await supabase.from('option_group_template_translations').delete().eq('option_group_template_id', templateId).eq('locale', 'en')
      if (!error) setEnglishByTemplateId((current) => {
        const next = { ...current }
        delete next[templateId]
        return next
      })
      return error
    }

    const { data, error } = await supabase
      .from('option_group_template_translations')
      .upsert({ option_group_template_id: templateId, locale: 'en', display_title: normalizedTitle }, { onConflict: 'option_group_template_id,locale' })
      .select()
      .single()
    if (data) setEnglishByTemplateId((current) => ({ ...current, [templateId]: data }))
    return error
  }

  async function saveEnglishTemplateOptionName(optionId: string, name: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      const { error } = await supabase.from('option_template_option_translations').delete().eq('option_template_option_id', optionId).eq('locale', 'en')
      if (!error) setEnglishByOptionId((current) => {
        const next = { ...current }
        delete next[optionId]
        return next
      })
      return error
    }

    const { data, error } = await supabase
      .from('option_template_option_translations')
      .upsert({ option_template_option_id: optionId, locale: 'en', name: normalizedName }, { onConflict: 'option_template_option_id,locale' })
      .select()
      .single()
    if (data) setEnglishByOptionId((current) => ({ ...current, [optionId]: data }))
    return error
  }

  async function saveTurkishTemplateTitle(templateId: string, displayTitle: string) {
    const normalizedTitle = displayTitle.trim()
    if (!normalizedTitle) {
      const { error } = await supabase.from('option_group_template_translations').delete().eq('option_group_template_id', templateId).eq('locale', 'tr')
      if (!error) setTurkishByTemplateId((current) => {
        const next = { ...current }
        delete next[templateId]
        return next
      })
      return error
    }

    const { data, error } = await supabase
      .from('option_group_template_translations')
      .upsert({ option_group_template_id: templateId, locale: 'tr', display_title: normalizedTitle }, { onConflict: 'option_group_template_id,locale' })
      .select()
      .single()
    if (data) setTurkishByTemplateId((current) => ({ ...current, [templateId]: data }))
    return error
  }

  async function saveTurkishTemplateOptionName(optionId: string, name: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      const { error } = await supabase.from('option_template_option_translations').delete().eq('option_template_option_id', optionId).eq('locale', 'tr')
      if (!error) setTurkishByOptionId((current) => {
        const next = { ...current }
        delete next[optionId]
        return next
      })
      return error
    }

    const { data, error } = await supabase
      .from('option_template_option_translations')
      .upsert({ option_template_option_id: optionId, locale: 'tr', name: normalizedName }, { onConflict: 'option_template_option_id,locale' })
      .select()
      .single()
    if (data) setTurkishByOptionId((current) => ({ ...current, [optionId]: data }))
    return error
  }

  function localizedTemplateTitle(template: OptionTemplate) {
    return contentLocale === 'ar' ? template.display_title : contentLocale === 'en' ? englishByTemplateId[template.id]?.display_title || '' : turkishByTemplateId[template.id]?.display_title || ''
  }

  function updateLocalizedTemplateTitle(templateId: string, value: string) {
    if (contentLocale === 'ar') void updateTemplate(templateId, { display_title: value })
    else if (contentLocale === 'en') setEnglishByTemplateId((current) => ({
      ...current,
      [templateId]: { ...current[templateId], option_group_template_id: templateId, locale: 'en', display_title: value } as TemplateTranslation,
    }))
    else setTurkishByTemplateId((current) => ({
      ...current,
      [templateId]: { ...current[templateId], option_group_template_id: templateId, locale: 'tr', display_title: value } as TemplateTranslation,
    }))
  }

  function saveLocalizedTemplateTitle(templateId: string, value: string) {
    if (contentLocale === 'en') return saveEnglishTemplateTitle(templateId, value)
    if (contentLocale === 'tr') return saveTurkishTemplateTitle(templateId, value)
    return Promise.resolve(null)
  }

  function localizedTemplateOptionName(option: TemplateOption) {
    return contentLocale === 'ar' ? option.name : contentLocale === 'en' ? englishByOptionId[option.id]?.name || '' : turkishByOptionId[option.id]?.name || ''
  }

  function updateLocalizedTemplateOptionName(templateId: string, optionId: string, value: string) {
    if (contentLocale === 'ar') void updateOption(templateId, optionId, { name: value })
    else if (contentLocale === 'en') setEnglishByOptionId((current) => ({
      ...current,
      [optionId]: { ...current[optionId], option_template_option_id: optionId, locale: 'en', name: value } as TemplateOptionTranslation,
    }))
    else setTurkishByOptionId((current) => ({
      ...current,
      [optionId]: { ...current[optionId], option_template_option_id: optionId, locale: 'tr', name: value } as TemplateOptionTranslation,
    }))
  }

  function saveLocalizedTemplateOptionName(optionId: string, value: string) {
    if (contentLocale === 'en') return saveEnglishTemplateOptionName(optionId, value)
    if (contentLocale === 'tr') return saveTurkishTemplateOptionName(optionId, value)
    return Promise.resolve(null)
  }

  async function deleteTemplate(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا القالب نهائياً؟ سيتم حذفه من جميع المنتجات المرتبطة.')) return
    await supabase.from('option_group_templates').delete().eq('id', id)
    setTemplates(templates.filter(t => t.id !== id))
    setActionMessage('تم حذف القالب')
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
    } catch {
      setBulkMessage('حدث خطأ أثناء الربط.')
    }
    
    setBulkLoading(false)
  }

  if (loading) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">{tx('جاري التحميل...')}</div>

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand-text">{tx('قوالب الإضافات')}</h1>
          <p className="text-sm leading-6 text-brand-brown">{tx('قوالب مشتركة يمكن ربطها بعدة منتجات وتعديلها من مكان واحد.')}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-text">
            <Languages className="h-4 w-4 text-brand-burgundy" />
            <span className="sr-only">{tx('لغة محتوى الزبون')}</span>
            <select value={contentLocale} onChange={e => setContentLocale(e.target.value as ContentLocale)} className="bg-transparent outline-none" dir="ltr" aria-label={tx('لغة محتوى الزبون')}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </select>
          </label>
          <button
            type="button"
            onClick={addTemplate}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-burgundy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
          >
            <Plus className="h-4 w-4" /> {tx('إنشاء قالب جديد')}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">
          {actionMessage}
        </div>
      )}
      
      <div className="rounded-xl border border-brand-border bg-white p-4 text-sm text-brand-brown shadow-sm">
        <p className="font-bold mb-1">{tx('ملاحظة:')}</p>
        <p>{tx('التعديل على أي قالب هنا سينعكس فوراً على جميع المنتجات المرتبطة به. لا داعي لتعديل الإضافات المشتركة لكل منتج على حدة.')}</p>
      </div>

      <div className="space-y-8">
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-brand-brown sm:p-12">
            {tx('لا توجد قوالب حالياً. قم بإنشاء قالب جديد لربطه بالمنتجات لاحقاً.')}
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className="rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-4 border-b border-brand-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words text-lg font-bold text-brand-text">{template.template_name}</h2>
                  <p className="break-words text-sm text-brand-brown">{tx('العنوان الظاهر للزبون: {name}', { name: template.display_title })}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(template.id)
                    setBulkMessage('')
                    setShowBulkModal(true)
                  }}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-burgundy/20 bg-brand-cream px-3 py-2 text-sm font-bold text-brand-burgundy shadow-sm transition-colors hover:bg-brand-burgundy hover:text-white"
                  title="ربط جماعي بقسم كامل"
                >
                  <LinkIcon className="h-4 w-4" />
                  {tx('ربط بقسم')}
                </button>
                <button type="button" onClick={() => deleteTemplate(template.id)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-100">
                  <Trash2 className="h-4 w-4" />
                  {tx('حذف')}
                </button>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-bold text-gray-700">{tx('اسم القالب داخل الإدارة')}</label>
                  <input type="text" className="min-h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={template.template_name} onChange={e => updateTemplate(template.id, { template_name: e.target.value })} />
                </div>
                <div className="min-w-0" dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}>
                  <label className="mb-2 block text-sm font-bold text-brand-burgundy">{contentLocale === 'ar' ? tx('العنوان الظاهر للزبون') : contentLocale === 'en' ? 'English customer title' : 'Müşteri başlığı'}</label>
                  <input
                    type="text"
                    className="min-h-11 w-full rounded-lg border border-brand-burgundy/30 px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                    value={localizedTemplateTitle(template)}
                    onChange={e => updateLocalizedTemplateTitle(template.id, e.target.value)}
                    onBlur={e => void saveLocalizedTemplateTitle(template.id, e.target.value)}
                    placeholder={contentLocale === 'ar' ? 'مثال: الإضافات' : contentLocale === 'en' ? 'Optional English customer title' : 'İsteğe bağlı Türkçe başlık'}
                  />
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-gray-700">{tx('النوع')}</label>
                  <select className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={template.kind || 'addon'} onChange={e => updateTemplate(template.id, { kind: e.target.value as never })}>
                    <option value="variant">{tx('محدد (Variant)')}</option>
                    <option value="addon">{tx('إضافة (Addon)')}</option>
                    <option value="modifier">{tx('تعديل (Modifier)')}</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-gray-700">{tx('طريقة الاختيار')}</label>
                  <select className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={template.selection_type || 'multiple'} onChange={e => updateTemplate(template.id, { selection_type: e.target.value as never })}>
                    <option value="single">{tx('اختيار واحد')}</option>
                    <option value="multiple">{tx('متعدد')}</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <AdminSwitch
                    checked={template.is_required || false}
                    onCheckedChange={(checked) => updateTemplate(template.id, { is_required: checked })}
                    label={tx('إجباري')}
                    labelPosition="start"
                    className="flex h-[62px] w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 sm:h-auto sm:justify-start sm:rounded-lg sm:p-3"
                    labelClassName="text-sm font-bold text-gray-700"
                  />
                </div>
                <div className="min-w-0">
                  <AdminSwitch
                    checked={template.is_active ?? true}
                    onCheckedChange={(checked) => updateTemplate(template.id, { is_active: checked })}
                    label={tx('نشط')}
                    labelPosition="start"
                    className="flex h-[62px] w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 sm:h-auto sm:rounded-lg sm:p-3"
                    labelClassName="text-sm font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <h4 className="text-sm font-bold text-gray-800 mb-4">{tx('خيارات القالب:')}</h4>
                <div className="space-y-4 sm:space-y-3">
                  {template.options.map(opt => (
                    <div key={opt.id} className="grid w-full grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_8rem_auto] sm:items-end sm:gap-3 sm:rounded-lg sm:p-3">
                      <div className="w-full flex-1" dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">{contentLocale === 'ar' ? 'الاسم' : contentLocale === 'en' ? 'English option' : 'Türkçe seçenek'}</label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-brand-burgundy focus:ring-brand-burgundy sm:py-2"
                          value={localizedTemplateOptionName(opt)}
                          onChange={e => updateLocalizedTemplateOptionName(template.id, opt.id, e.target.value)}
                          onBlur={e => void saveLocalizedTemplateOptionName(opt.id, e.target.value)}
                          placeholder={contentLocale === 'ar' ? 'الاسم (مثال: حجم كبير)' : contentLocale === 'en' ? 'Optional English name' : 'İsteğe bağlı Türkçe ad'}
                        />
                      </div>
                      <div className="w-full sm:w-32 shrink-0">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 sm:hidden">{tx('السعر الإضافي')}</label>
                        <input type="number" step="0.01" className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy" value={opt.price || 0} onChange={e => updateOption(template.id, opt.id, { price: parseFloat(e.target.value) || 0 })} placeholder={tx('السعر')} />
                      </div>
                      <div className="w-full sm:w-auto flex justify-end shrink-0 pt-1 sm:pt-0">
                        <button type="button" onClick={() => deleteOption(template.id, opt.id)} className="text-red-600 bg-red-50 sm:bg-transparent border border-red-100 sm:border-transparent hover:bg-red-100 py-3 sm:py-2 px-4 sm:px-2 rounded-xl sm:rounded-lg flex items-center justify-center transition-colors w-full sm:w-auto font-bold">
                          <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-0 mr-2" />
                          <span className="text-sm sm:hidden">{tx('حذف الخيار')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {template.options.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                      {tx('لا توجد خيارات داخل هذا القالب.')}
                    </div>
                  )}
                  <button type="button" onClick={() => addOption(template.id)} className="w-full sm:w-auto mt-3 px-6 py-3.5 sm:py-2.5 bg-brand-burgundy/10 text-brand-burgundy hover:bg-brand-burgundy/20 rounded-xl sm:rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" /> {tx('إضافة خيار')}
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
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h3 className="text-xl font-bold mb-4">{tx('ربط القالب بقسم كامل')}</h3>
            <p className="text-gray-600 mb-6 text-sm">{tx('سيتم ربط القالب المختار بجميع المنتجات داخل القسم المحدد. سيتم تجاهل المنتجات المرتبطة مسبقاً بهذا القالب.')}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{tx('اختر القسم')}</label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-brand-burgundy focus:border-brand-burgundy"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">{tx('-- يرجى الاختيار --')}</option>
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
            
            <div className="grid grid-cols-1 gap-3 sm:flex sm:justify-end">
              <button 
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="min-h-11 rounded-lg px-5 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-100"
                disabled={bulkLoading}
              >
                {tx('إغلاق')}
              </button>
              <button 
                type="button"
                onClick={handleBulkLink}
                disabled={!selectedCategory || bulkLoading}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-burgundy px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-burgundy-dark disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                {tx('بدء الربط')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
