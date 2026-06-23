'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Languages } from 'lucide-react'
import ImageUploader from '../../../components/ImageUploader'
import AdminSwitch from '../../../components/AdminSwitch'
import { deleteMenuImagesIfUnused } from '@/lib/storage-images'
import { useAdminText } from '@/i18n/admin-text'

type Category = Database['public']['Tables']['categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type OptionGroup = Database['public']['Tables']['item_option_groups']['Row']
type Option = Database['public']['Tables']['item_options']['Row']
type OptionGroupTranslation = Database['public']['Tables']['item_option_group_translations']['Row']
type OptionTranslation = Database['public']['Tables']['item_option_translations']['Row']
type ContentLocale = 'ar' | 'en' | 'tr'

export default function ItemFormPage({ params }: { params: Promise<{ id: string }> }) {
  const tx = useAdminText()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const isNew = id === 'new'
  
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null)
  const [imageUrlsPendingCleanup, setImageUrlsPendingCleanup] = useState<string[]>([])
  
  const [item, setItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    base_price: 0,
    category_id: '',
    is_available: true,
    is_featured: false,
    sort_order: 0,
  })
  const [englishItemName, setEnglishItemName] = useState('')
  const [englishItemDescription, setEnglishItemDescription] = useState('')
  const [turkishItemName, setTurkishItemName] = useState('')
  const [turkishItemDescription, setTurkishItemDescription] = useState('')
  const [contentLocale, setContentLocale] = useState<ContentLocale>('ar')
  
  // To handle null vs number input nicely
  const [basePriceInput, setBasePriceInput] = useState<string>('0')

  const [groups, setGroups] = useState<(OptionGroup & { options: Option[] })[]>([])
  const [englishGroupTitles, setEnglishGroupTitles] = useState<Record<string, string>>({})
  const [englishOptionNames, setEnglishOptionNames] = useState<Record<string, string>>({})
  const [turkishGroupTitles, setTurkishGroupTitles] = useState<Record<string, string>>({})
  const [turkishOptionNames, setTurkishOptionNames] = useState<Record<string, string>>({})
  
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
      const [{ data }, { data: itemTranslations }] = await Promise.all([
        supabase.from('menu_items').select('*').eq('id', id).single(),
        supabase.from('menu_item_translations').select('*').eq('menu_item_id', id).in('locale', ['en', 'tr']),
      ])
      if (data) {
        setItem(data)
        const englishTranslation = itemTranslations?.find((translation) => translation.locale === 'en')
        const turkishTranslation = itemTranslations?.find((translation) => translation.locale === 'tr')
        setEnglishItemName(englishTranslation?.name || '')
        setEnglishItemDescription(englishTranslation?.description || '')
        setTurkishItemName(turkishTranslation?.name || '')
        setTurkishItemDescription(turkishTranslation?.description || '')
        setSavedImageUrl(data.image_url || null)
        setBasePriceInput(data.base_price !== null ? String(data.base_price) : '')
        const { data: groupsData } = await supabase.from('item_option_groups').select('*, options:item_options(*)').eq('item_id', id).order('sort_order')
        const typedGroups = groupsData as unknown as Array<OptionGroup & { options: Option[] }> | null
        if (typedGroups) {
          setGroups(typedGroups)
          const groupIds = typedGroups.map((group) => group.id)
          const optionIds = typedGroups.flatMap((group) => group.options.map((option) => option.id))
          const [groupTranslationsResult, optionTranslationsResult] = await Promise.all([
            groupIds.length > 0
              ? supabase.from('item_option_group_translations').select('*').in('locale', ['en', 'tr']).in('item_option_group_id', groupIds)
              : Promise.resolve({ data: [] as OptionGroupTranslation[] }),
            optionIds.length > 0
              ? supabase.from('item_option_translations').select('*').in('locale', ['en', 'tr']).in('item_option_id', optionIds)
              : Promise.resolve({ data: [] as OptionTranslation[] }),
          ])
          setEnglishGroupTitles(Object.fromEntries((groupTranslationsResult.data || []).filter((translation) => translation.locale === 'en').map((translation) => [translation.item_option_group_id, translation.title])))
          setTurkishGroupTitles(Object.fromEntries((groupTranslationsResult.data || []).filter((translation) => translation.locale === 'tr').map((translation) => [translation.item_option_group_id, translation.title])))
          setEnglishOptionNames(Object.fromEntries((optionTranslationsResult.data || []).filter((translation) => translation.locale === 'en').map((translation) => [translation.item_option_id, translation.name])))
          setTurkishOptionNames(Object.fromEntries((optionTranslationsResult.data || []).filter((translation) => translation.locale === 'tr').map((translation) => [translation.item_option_id, translation.name])))
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [id])

  function handleProductImageChange(url: string | null) {
    const currentImageUrl = item.image_url || null

    if (currentImageUrl && currentImageUrl !== url) {
      setImageUrlsPendingCleanup(prev => (
        prev.includes(currentImageUrl) ? prev : [...prev, currentImageUrl]
      ))
    }

    setItem(prev => ({ ...prev, image_url: url }))
  }

  async function cleanupUnusedImages(imageUrls: Array<string | null | undefined>) {
    const cleanupResults = await deleteMenuImagesIfUnused(supabase, imageUrls)
    const cleanupError = cleanupResults.find(result => result.error)?.error

    if (cleanupError) {
      console.warn('Storage image cleanup failed:', cleanupError)
    }

    return cleanupError
  }

  async function saveEnglishItemTranslation(menuItemId: string) {
    const name = englishItemName.trim()
    if (!name) {
      return supabase.from('menu_item_translations').delete().eq('menu_item_id', menuItemId).eq('locale', 'en').then(({ error }) => error)
    }

    return supabase
      .from('menu_item_translations')
      .upsert({
        menu_item_id: menuItemId,
        locale: 'en',
        name,
        description: englishItemDescription.trim() || null,
      }, { onConflict: 'menu_item_id,locale' })
      .then(({ error }) => error)
  }

  async function saveTurkishItemTranslation(menuItemId: string) {
    const name = turkishItemName.trim()
    if (!name) {
      return supabase.from('menu_item_translations').delete().eq('menu_item_id', menuItemId).eq('locale', 'tr').then(({ error }) => error)
    }

    return supabase
      .from('menu_item_translations')
      .upsert({
        menu_item_id: menuItemId,
        locale: 'tr',
        name,
        description: turkishItemDescription.trim() || null,
      }, { onConflict: 'menu_item_id,locale' })
      .then(({ error }) => error)
  }

  async function saveEnglishGroupTranslation(groupId: string) {
    const title = (englishGroupTitles[groupId] || '').trim()
    if (!title) {
      const { error } = await supabase.from('item_option_group_translations').delete().eq('item_option_group_id', groupId).eq('locale', 'en')
      return error
    }

    const { error } = await supabase
      .from('item_option_group_translations')
      .upsert({ item_option_group_id: groupId, locale: 'en', title }, { onConflict: 'item_option_group_id,locale' })
    return error
  }

  async function saveEnglishOptionTranslation(optionId: string) {
    const name = (englishOptionNames[optionId] || '').trim()
    if (!name) {
      const { error } = await supabase.from('item_option_translations').delete().eq('item_option_id', optionId).eq('locale', 'en')
      return error
    }

    const { error } = await supabase
      .from('item_option_translations')
      .upsert({ item_option_id: optionId, locale: 'en', name }, { onConflict: 'item_option_id,locale' })
    return error
  }

  async function saveTurkishGroupTranslation(groupId: string) {
    const title = (turkishGroupTitles[groupId] || '').trim()
    if (!title) {
      const { error } = await supabase.from('item_option_group_translations').delete().eq('item_option_group_id', groupId).eq('locale', 'tr')
      return error
    }

    const { error } = await supabase
      .from('item_option_group_translations')
      .upsert({ item_option_group_id: groupId, locale: 'tr', title }, { onConflict: 'item_option_group_id,locale' })
    return error
  }

  async function saveTurkishOptionTranslation(optionId: string) {
    const name = (turkishOptionNames[optionId] || '').trim()
    if (!name) {
      const { error } = await supabase.from('item_option_translations').delete().eq('item_option_id', optionId).eq('locale', 'tr')
      return error
    }

    const { error } = await supabase
      .from('item_option_translations')
      .upsert({ item_option_id: optionId, locale: 'tr', name }, { onConflict: 'item_option_id,locale' })
    return error
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!item.name?.trim()) {
      setSaveMessage('يرجى إدخال اسم المنتج بالعربية أولاً')
      return
    }
    setSaving(true)
    setSaveMessage('')

    const nextImageUrl = item.image_url?.trim() || null
    const payload = {
      ...item,
      image_url: nextImageUrl,
      base_price: basePriceInput.trim() === '' ? null : parseFloat(basePriceInput)
    }

    if (isNew) {
      const { data, error } = await supabase.from('menu_items').insert(payload as never).select().single()
      if (error) {
        setSaveMessage('حدث خطأ أثناء حفظ المنتج: ' + error.message)
        setSaving(false)
        return
      }
      if (data) {
        const [englishTranslationError, turkishTranslationError] = await Promise.all([
          saveEnglishItemTranslation(data.id),
          saveTurkishItemTranslation(data.id),
        ])
        const translationError = englishTranslationError || turkishTranslationError
        const cleanupError = await cleanupUnusedImages(imageUrlsPendingCleanup.filter(url => url !== nextImageUrl))
        setSavedImageUrl(nextImageUrl)
        setImageUrlsPendingCleanup([])
        if (cleanupError) {
          console.warn('Storage image cleanup warning after creating product:', cleanupError)
        }
        if (translationError) {
          console.error('Product translation could not be saved:', translationError.message)
        }
        router.push(`/asalaadmin26/items/${data.id}`)
      }
    } else {
      const { error } = await supabase.from('menu_items').update(payload as never).eq('id', id)
      if (error) {
        setSaveMessage('حدث خطأ أثناء حفظ المنتج: ' + error.message)
      } else {
        const [englishTranslationError, turkishTranslationError] = await Promise.all([
          saveEnglishItemTranslation(id),
          saveTurkishItemTranslation(id),
        ])
        const translationError = englishTranslationError || turkishTranslationError
        const cleanupCandidates = [
          savedImageUrl && savedImageUrl !== nextImageUrl ? savedImageUrl : null,
          ...imageUrlsPendingCleanup.filter(url => url !== nextImageUrl),
        ]
        const cleanupError = await cleanupUnusedImages(cleanupCandidates)

        setItem(prev => ({ ...prev, image_url: nextImageUrl }))
        setSavedImageUrl(nextImageUrl)
        setImageUrlsPendingCleanup([])
        setSaveMessage(translationError
          ? 'تم حفظ المنتج، لكن تعذر حفظ إحدى الترجمات: ' + translationError.message
          : cleanupError
          ? 'تم حفظ المنتج بنجاح، لكن تعذر حذف الصورة القديمة من التخزين: ' + cleanupError
          : 'تم حفظ المنتج بنجاح')
      }
    }
    setSaving(false)
  }

  async function clearProductImage() {
    const currentImageUrl = item.image_url || null
    const cleanupCandidates = [currentImageUrl, savedImageUrl, ...imageUrlsPendingCleanup]

    setSaveMessage('')

    if (isNew) {
      const cleanupError = await cleanupUnusedImages(cleanupCandidates)
      setItem(prev => ({ ...prev, image_url: null }))
      setImageUrlsPendingCleanup([])
      setSaveMessage(cleanupError
        ? 'تم حذف الصورة من النموذج، لكن تعذر حذف ملف التخزين: ' + cleanupError
        : 'تم حذف الصورة من النموذج')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ image_url: null })
        .eq('id', id)

      if (error) {
        throw new Error('حدث خطأ أثناء حذف الصورة: ' + error.message)
      }

      const cleanupError = await cleanupUnusedImages(cleanupCandidates)
      setItem(prev => ({ ...prev, image_url: null }))
      setSavedImageUrl(null)
      setImageUrlsPendingCleanup([])
      setSaveMessage(cleanupError
        ? 'تم حذف الصورة من المنتج، لكن تعذر حذف ملف التخزين: ' + cleanupError
        : 'تم حذف الصورة من المنتج')
    } finally {
      setSaving(false)
    }
  }

  async function leaveProductPage() {
    const currentImageUrl = item.image_url || null
    const cleanupCandidates = [
      currentImageUrl && currentImageUrl !== savedImageUrl ? currentImageUrl : null,
      ...imageUrlsPendingCleanup.filter(url => url !== savedImageUrl),
    ]

    const cleanupError = await cleanupUnusedImages(cleanupCandidates)
    if (cleanupError) {
      console.warn('Storage image cleanup warning before leaving product page:', cleanupError)
    }

    router.push('/asalaadmin26/items')
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

    const englishTemplateTitle = (englishGroupTitles[group.id] || '').trim()
    if (englishTemplateTitle) {
      await supabase.from('option_group_template_translations').upsert({
        option_group_template_id: newTemplate.id,
        locale: 'en',
        display_title: englishTemplateTitle,
      }, { onConflict: 'option_group_template_id,locale' })
    }
    const turkishTemplateTitle = (turkishGroupTitles[group.id] || '').trim()
    if (turkishTemplateTitle) {
      await supabase.from('option_group_template_translations').upsert({
        option_group_template_id: newTemplate.id,
        locale: 'tr',
        display_title: turkishTemplateTitle,
      }, { onConflict: 'option_group_template_id,locale' })
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
      const { data: createdTemplateOptions } = await supabase.from('option_template_options').insert(optionsToInsert).select()
      const englishTemplateOptions = (createdTemplateOptions || []).flatMap((option, index) => {
        const name = (englishOptionNames[group.options[index]?.id] || '').trim()
        return name ? [{ option_template_option_id: option.id, locale: 'en', name }] : []
      })
      if (englishTemplateOptions.length > 0) {
        await supabase.from('option_template_option_translations').insert(englishTemplateOptions)
      }
      const turkishTemplateOptions = (createdTemplateOptions || []).flatMap((option, index) => {
        const name = (turkishOptionNames[group.options[index]?.id] || '').trim()
        return name ? [{ option_template_option_id: option.id, locale: 'tr', name }] : []
      })
      if (turkishTemplateOptions.length > 0) {
        await supabase.from('option_template_option_translations').insert(turkishTemplateOptions)
      }
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
    setEnglishGroupTitles((current) => {
      const next = { ...current }
      delete next[group.id]
      return next
    })
    setEnglishOptionNames((current) => {
      const next = { ...current }
      group.options.forEach((option) => delete next[option.id])
      return next
    })
    setTurkishGroupTitles((current) => {
      const next = { ...current }
      delete next[group.id]
      return next
    })
    setTurkishOptionNames((current) => {
      const next = { ...current }
      group.options.forEach((option) => delete next[option.id])
      return next
    })
    if (newLink) {
      setLinkedTemplates(prev => [...prev, newLink as never]);
      setAvailableTemplates(prev => [newTemplate, ...prev]);
    }
    
    alert('تم تحويل المجموعة إلى قالب وربطها بنجاح');
  }

  if (loading) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">{tx('جاري التحميل...')}</div>

  const localizedName = contentLocale === 'ar'
    ? item.name || ''
    : contentLocale === 'en'
      ? englishItemName
      : turkishItemName
  const localizedDescription = contentLocale === 'ar'
    ? item.description || ''
    : contentLocale === 'en'
      ? englishItemDescription
      : turkishItemDescription
  const contentLanguageName = contentLocale === 'ar' ? 'العربية' : contentLocale === 'en' ? 'English' : 'Türkçe'
  const contentNameLabel = contentLocale === 'ar' ? 'اسم المنتج' : contentLocale === 'en' ? 'English product name' : 'Ürün adı'
  const contentDescriptionLabel = contentLocale === 'ar' ? 'الوصف' : contentLocale === 'en' ? 'English description' : 'Ürün açıklaması'

  function updateLocalizedName(value: string) {
    if (contentLocale === 'ar') setItem({ ...item, name: value })
    else if (contentLocale === 'en') setEnglishItemName(value)
    else setTurkishItemName(value)
  }

  function updateLocalizedDescription(value: string) {
    if (contentLocale === 'ar') setItem({ ...item, description: value })
    else if (contentLocale === 'en') setEnglishItemDescription(value)
    else setTurkishItemDescription(value)
  }

  function localizedGroupTitle(group: OptionGroup) {
    return contentLocale === 'ar' ? group.title : contentLocale === 'en' ? englishGroupTitles[group.id] || '' : turkishGroupTitles[group.id] || ''
  }

  function updateLocalizedGroupTitle(groupId: string, value: string) {
    if (contentLocale === 'ar') void updateGroup(groupId, { title: value })
    else if (contentLocale === 'en') setEnglishGroupTitles((current) => ({ ...current, [groupId]: value }))
    else setTurkishGroupTitles((current) => ({ ...current, [groupId]: value }))
  }

  function saveLocalizedGroupTitle(groupId: string) {
    if (contentLocale === 'en') return saveEnglishGroupTranslation(groupId)
    if (contentLocale === 'tr') return saveTurkishGroupTranslation(groupId)
    return Promise.resolve(null)
  }

  function localizedOptionName(option: Option) {
    return contentLocale === 'ar' ? option.name : contentLocale === 'en' ? englishOptionNames[option.id] || '' : turkishOptionNames[option.id] || ''
  }

  function updateLocalizedOptionName(groupId: string, optionId: string, value: string) {
    if (contentLocale === 'ar') void updateOption(groupId, optionId, { name: value })
    else if (contentLocale === 'en') setEnglishOptionNames((current) => ({ ...current, [optionId]: value }))
    else setTurkishOptionNames((current) => ({ ...current, [optionId]: value }))
  }

  function saveLocalizedOptionName(optionId: string) {
    if (contentLocale === 'en') return saveEnglishOptionTranslation(optionId)
    if (contentLocale === 'tr') return saveTurkishOptionTranslation(optionId)
    return Promise.resolve(null)
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-bold text-brand-text">{isNew ? tx('إضافة منتج') : tx('تعديل المنتج')}</h1>
          <p className="text-sm leading-6 text-brand-brown">{tx('عدّل بيانات المنتج وصورته وخياراته من أقسام واضحة.')}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-brown">
            <Languages className="h-4 w-4 text-brand-burgundy" />
            <span className="sr-only">{tx('لغة المحتوى')}</span>
            <select
              value={contentLocale}
              onChange={(event) => setContentLocale(event.target.value as ContentLocale)}
              className="min-w-28 bg-transparent text-sm font-bold outline-none"
              dir="ltr"
              aria-label={tx('لغة المحتوى')}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </select>
          </label>
          <button
            type="button"
            onClick={leaveProductPage}
            className="min-h-11 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-brown transition-colors hover:bg-brand-cream"
          >
            {tx('العودة للمنتجات')}
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="min-h-11 rounded-xl bg-brand-burgundy px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:opacity-50"
          >
            {saving ? tx('جاري الحفظ...') : tx('حفظ المنتج')}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`rounded-lg border p-4 text-sm font-bold ${saveMessage.includes('خطأ') ? 'border-red-100 bg-red-50 text-red-700' : saveMessage.includes('تعذر') ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-green-100 bg-green-50 text-green-700'}`}>
          {saveMessage}
        </div>
      )}

      <form id="product-form" onSubmit={saveItem} className="space-y-6">
        <section className="rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-brand-text">{tx('محتوى المنتج')}</h2>
              <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-brown">{contentLanguageName}</span>
            </div>
            <p className="text-sm leading-6 text-brand-brown">
              {contentLocale === 'ar'
                ? tx('أدخل المحتوى الأساسي بالعربية. الاسم العربي مطلوب.')
                : 'Optional. Leave the name blank to use the Arabic content as the fallback.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-bold text-brand-text">{contentNameLabel}</label>
              <input required={contentLocale === 'ar'} dir={contentLocale === 'ar' ? 'rtl' : 'ltr'} type="text" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={localizedName} onChange={e => updateLocalizedName(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-bold text-brand-text">{tx('القسم')}</label>
              <select required className="min-h-11 w-full rounded-lg border border-brand-border bg-white px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={item.category_id || ''} onChange={e => setItem({ ...item, category_id: e.target.value })}>
                <option value="">{tx('اختر القسم')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="min-w-0 md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-brand-text">{contentDescriptionLabel}</label>
              <textarea dir={contentLocale === 'ar' ? 'rtl' : 'ltr'} className="w-full rounded-lg border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" rows={4} value={localizedDescription} onChange={e => updateLocalizedDescription(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-bold text-brand-text">{tx('السعر الأساسي')}</label>
              <input type="number" step="0.01" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={basePriceInput} onChange={e => setBasePriceInput(e.target.value)} placeholder={tx('اتركه فارغاً إذا كان يعتمد على الخيارات')} />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-bold text-brand-text">{tx('الترتيب')}</label>
              <input type="number" className="min-h-11 w-full rounded-lg border border-brand-border px-3 py-2 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={item.sort_order || 0} onChange={e => setItem({ ...item, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminSwitch
              checked={item.is_available || false}
              onCheckedChange={(checked) => setItem({ ...item, is_available: checked })}
              label={tx('متاح للطلب')}
              labelPosition="start"
              className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-cream/40 p-4 hover:bg-brand-cream"
              labelClassName="text-sm font-bold text-brand-text"
            />
            <AdminSwitch
              checked={item.is_featured || false}
              onCheckedChange={(checked) => setItem({ ...item, is_featured: checked })}
              label={tx('منتج مميز')}
              labelPosition="start"
              className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-cream/40 p-4 hover:bg-brand-cream"
              labelClassName="text-sm font-bold text-brand-text"
            />
          </div>
        </section>

        <section className="rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-bold text-brand-text">{tx('صورة المنتج')}</h2>
            <p className="text-sm leading-6 text-brand-brown">{tx('المقاس المقترح: 1200 × 1200 بكسل')}</p>
            <p className="text-sm leading-6 text-brand-brown">{tx('يفضل رفع صورة مربعة وواضحة')}</p>
          </div>
          <div>
            <ImageUploader 
              value={item.image_url || null} 
              onChange={handleProductImageChange}
              onClear={clearProductImage}
            />
          </div>
        </section>
      </form>

      <details className="rounded-xl border border-brand-border bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 text-lg font-bold text-brand-text marker:text-brand-burgundy sm:px-6">
          {tx('القوالب المرتبطة')}
        </summary>
        <div className="space-y-4 border-t border-brand-border p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-brand-text">{tx('القوالب المرتبطة')}</h2>
          <p className="text-sm leading-6 text-brand-brown">{tx('اربط المنتج بقوالب إضافات مشتركة مثل الأحجام أو الإضافات المتكررة.')}</p>
        </div>

        {isNew ? (
          <div className="rounded-xl border border-dashed border-brand-border bg-brand-cream/40 p-6 text-center text-sm text-brand-brown">
            {tx('يرجى حفظ المنتج أولاً لتتمكن من ربط القوالب.')}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-brand-border bg-brand-cream/50 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-bold text-brand-text">{tx('اختر قالباً لربطه بهذا المنتج')}</label>
                  <select
                    className="min-h-11 w-full rounded-lg border border-brand-border bg-white px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                    value={selectedTemplateToLink}
                    onChange={e => setSelectedTemplateToLink(e.target.value)}
                  >
                    <option value="">{tx('-- اختر قالب --')}</option>
                    {availableTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.template_name} (يظهر للزبون: {t.display_title})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={linkTemplate}
                  disabled={!selectedTemplateToLink}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-burgundy px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:opacity-50 sm:w-auto"
                >
                  {tx('ربط القالب')}
                </button>
              </div>
            </div>

            {linkedTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">{tx('لا توجد قوالب مرتبطة حالياً بهذا المنتج.')}</div>
            ) : (
              <div className="grid gap-4">
                {linkedTemplates.map(link => (
                  <div key={link.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words font-bold text-gray-800">{link.option_group_templates.template_name}</h3>
                      <p className="mt-1 break-words text-sm leading-6 text-gray-500">{tx('النوع: {kind} | يظهر للزبون كـ: {name}', { kind: link.option_group_templates.kind || '', name: link.option_group_templates.display_title || '' })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => unlinkTemplate(link.id)}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4" /> {tx('فك الارتباط')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </details>

      <details className="rounded-xl border border-brand-border bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 text-lg font-bold text-brand-text marker:text-brand-burgundy sm:px-6">
          {tx('مجموعات الخيارات')}
        </summary>
        <div className="space-y-4 border-t border-brand-border p-5 sm:p-6">
        <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-brand-text">{tx('مجموعات الخيارات')}</h2>
            <p className="text-sm leading-6 text-brand-brown">{tx('خيارات خاصة بهذا المنتج فقط، مثل الحجم أو الإضافات.')}</p>
          </div>
          <button 
            type="button" 
            onClick={addGroup} 
            disabled={isNew}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors sm:w-auto ${isNew ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'bg-brand-burgundy text-white hover:bg-brand-burgundy-dark'}`}
          >
            <Plus className="h-4 w-4" /> {tx('إضافة مجموعة')}
          </button>
        </div>

        {isNew ? (
          <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-brand-brown">
            {tx('يرجى حفظ المنتج أولاً لتتمكن من إضافة الخيارات والتعديلات.')}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-brand-brown">
            {tx('لا توجد مجموعات خيارات خاصة بهذا المنتج.')}
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 border-b border-brand-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="min-w-0 break-words text-lg font-bold text-brand-text">{localizedGroupTitle(group) || group.title || tx('مجموعة خيارات')}</h3>
                <button type="button" onClick={() => deleteGroup(group.id)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 sm:w-auto">
                  <Trash2 className="h-4 w-4" />
                  {tx('حذف المجموعة')}
                </button>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="min-w-0 md:col-span-2" dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{contentLocale === 'ar' ? 'عنوان المجموعة' : contentLocale === 'en' ? 'English customer title' : 'Müşteri başlığı'}</label>
                  <input
                    type="text"
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
                    value={localizedGroupTitle(group)}
                    onChange={e => updateLocalizedGroupTitle(group.id, e.target.value)}
                    onBlur={() => void saveLocalizedGroupTitle(group.id)}
                    placeholder={contentLocale === 'ar' ? 'مثال: اختر الحجم' : contentLocale === 'en' ? 'Optional English title' : 'İsteğe bağlı Türkçe başlık'}
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-bold text-gray-700">{tx('النوع')}</label>
                  <select className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={group.kind || 'variant'} onChange={e => updateGroup(group.id, { kind: e.target.value as never })}>
                    <option value="variant">{tx('محدد (Variant)')}</option>
                    <option value="addon">{tx('إضافة (Addon)')}</option>
                    <option value="modifier">{tx('تعديل (Modifier)')}</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-bold text-gray-700">{tx('طريقة الاختيار')}</label>
                  <select className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10" value={group.selection_type || 'single'} onChange={e => updateGroup(group.id, { selection_type: e.target.value as never })}>
                    <option value="single">{tx('اختيار واحد')}</option>
                    <option value="multiple">{tx('متعدد')}</option>
                  </select>
                </div>
                <AdminSwitch
                  checked={group.is_required || false}
                  onCheckedChange={(checked) => updateGroup(group.id, { is_required: checked })}
                  label={tx('إجباري')}
                  labelPosition="start"
                  className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
                  labelClassName="text-sm font-bold text-gray-700"
                />
                <AdminSwitch
                  checked={group.is_active ?? true}
                  onCheckedChange={(checked) => updateGroup(group.id, { is_active: checked })}
                  label={tx('نشط')}
                  labelPosition="start"
                  className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
                  labelClassName="text-sm font-bold text-gray-700"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <h4 className="mb-4 text-sm font-bold text-gray-800">{tx('الخيارات:')}</h4>
                <div className="space-y-4 sm:space-y-3">
                  {group.options.map(opt => (
                    <div key={opt.id} className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_9rem_auto] sm:items-end sm:gap-3 sm:rounded-lg sm:p-3">
                      <div className="min-w-0" dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">{contentLocale === 'ar' ? 'الاسم' : contentLocale === 'en' ? 'English option' : 'Türkçe seçenek'}</label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-brand-burgundy focus:ring-brand-burgundy sm:py-2"
                          value={localizedOptionName(opt)}
                          onChange={e => updateLocalizedOptionName(group.id, opt.id, e.target.value)}
                          onBlur={() => void saveLocalizedOptionName(opt.id)}
                          placeholder={contentLocale === 'ar' ? 'الاسم (مثال: حجم كبير)' : contentLocale === 'en' ? 'Optional English name' : 'İsteğe bağlı Türkçe ad'}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 sm:hidden">{tx('السعر الإضافي')}</label>
                        <input type="number" step="0.01" className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy" value={opt.price || 0} onChange={e => updateOption(group.id, opt.id, { price: parseFloat(e.target.value) || 0 })} placeholder={tx('السعر الإضافي')} />
                      </div>
                      <div className="w-full sm:w-auto">
                        <button type="button" onClick={() => deleteOption(group.id, opt.id)} className="text-red-600 bg-red-50 sm:bg-transparent border border-red-100 sm:border-transparent hover:bg-red-100 py-3 sm:py-2 px-4 sm:px-2 rounded-xl sm:rounded-lg flex items-center justify-center transition-colors w-full sm:w-auto font-bold">
                          <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-0 mr-2" />
                          <span className="text-sm sm:hidden">{tx('حذف الخيار')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {group.options.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                      {tx('لا توجد خيارات في هذه المجموعة.')}
                    </div>
                  )}
                  <button type="button" onClick={() => addOption(group.id)} className="w-full sm:w-auto mt-3 px-6 py-3.5 sm:py-2.5 bg-brand-burgundy/10 text-brand-burgundy hover:bg-brand-burgundy/20 rounded-xl sm:rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm">
                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" /> {tx('إضافة خيار')}
                  </button>
                </div>
              </div>
              
              {/* Convert to Template Section */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <AdminSwitch
                  checked={templateStates[group.id]?.checked || false}
                  onCheckedChange={(checked) => {
                    setTemplateStates(prev => ({
                      ...prev,
                      [group.id]: {
                        checked,
                        template_name: prev[group.id]?.template_name || group.title,
                        display_title: prev[group.id]?.display_title || group.title
                      }
                    }));
                  }}
                  label={tx('حفظ هذه المجموعة كقالب (اختياري)')}
                  labelPosition="start"
                  className="mb-4 flex w-full items-center justify-between gap-4 rounded-xl border border-brand-burgundy/10 bg-brand-cream/30 p-4 hover:bg-brand-cream/50 sm:w-fit sm:justify-start sm:rounded-lg sm:p-3"
                  labelClassName="text-sm font-bold text-brand-burgundy"
                />
                
                {templateStates[group.id]?.checked && (
                  <div className="bg-brand-cream/50 p-4 rounded-lg border border-brand-burgundy/20 space-y-4">
                    <p className="text-xs text-brand-brown">{tx('اسم القالب يظهر داخل لوحة الإدارة فقط، أما العنوان الظاهر فهو الذي يراه الزبون داخل المنيو.')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{tx('اسم القالب داخل الإدارة')}</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-brand-burgundy focus:border-brand-burgundy bg-white"
                          value={templateStates[group.id].template_name}
                          onChange={e => setTemplateStates(prev => ({...prev, [group.id]: {...prev[group.id], template_name: e.target.value}}))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{tx('العنوان الظاهر للزبون')}</label>
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
                        type="button"
                        onClick={() => convertToTemplate(group)}
                        className="min-h-11 w-full rounded-xl bg-brand-burgundy px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
                      >
                        {tx('تأكيد وحفظ كقالب')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
        </div>
      </details>
    </div>
  )
}
