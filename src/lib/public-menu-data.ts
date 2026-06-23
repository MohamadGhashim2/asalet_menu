import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { CatalogLocale } from '@/lib/catalog-locale'

export const PUBLIC_MENU_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=86400'

export type PublicMenuPayload = {
  locale: CatalogLocale
  settings: Pick<Database['public']['Tables']['restaurant_settings']['Row'], 'whatsapp' | 'currency'> | null
  categories: Array<Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'image_url' | 'sort_order' | 'created_at'>>
  items: Array<Pick<Database['public']['Tables']['menu_items']['Row'], 'id' | 'category_id' | 'name' | 'description' | 'base_price' | 'image_url' | 'is_featured' | 'sort_order' | 'created_at'>>
  groups: Array<Pick<Database['public']['Tables']['item_option_groups']['Row'], 'id' | 'item_id' | 'title' | 'kind' | 'selection_type' | 'is_required' | 'min_select' | 'max_select' | 'sort_order'>>
  options: Array<Pick<Database['public']['Tables']['item_options']['Row'], 'id' | 'group_id' | 'name' | 'price' | 'is_default' | 'sort_order'>>
  templateLinks: Array<Pick<Database['public']['Tables']['item_option_template_links']['Row'], 'item_id' | 'template_id' | 'sort_order'>>
  templates: Array<Pick<Database['public']['Tables']['option_group_templates']['Row'], 'id' | 'display_title' | 'kind' | 'selection_type' | 'is_required' | 'min_select' | 'max_select' | 'sort_order'>>
  templateOptions: Array<Pick<Database['public']['Tables']['option_template_options']['Row'], 'id' | 'template_id' | 'name' | 'price' | 'is_default' | 'sort_order'>>
  tables: Array<Pick<Database['public']['Tables']['restaurant_tables']['Row'], 'id' | 'label' | 'code'>>
}

function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )
}

function isMissingTranslationTableError(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /could not find the table 'public\..*_translations' in the schema cache/i.test(error?.message || '')
}

async function fetchPublicMenuData(locale: CatalogLocale) {
  const supabase = createPublicClient()
  const [
    settingsResult,
    categoriesResult,
    itemsResult,
    groupsResult,
    optionsResult,
    templateLinksResult,
    templatesResult,
    templateOptionsResult,
    tablesResult,
    categoryTranslationsResult,
    itemTranslationsResult,
    groupTranslationsResult,
    optionTranslationsResult,
    templateTranslationsResult,
    templateOptionTranslationsResult,
  ] = await Promise.all([
    supabase.from('restaurant_settings').select('whatsapp, currency').maybeSingle(),
    supabase
      .from('categories')
      .select('id, name, image_url, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('menu_items')
      .select('id, category_id, name, description, base_price, image_url, is_featured, sort_order, created_at')
      .eq('is_available', true)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('item_option_groups')
      .select('id, item_id, title, kind, selection_type, is_required, min_select, max_select, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('item_options')
      .select('id, group_id, name, price, is_default, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('item_option_template_links')
      .select('item_id, template_id, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('option_group_templates')
      .select('id, display_title, kind, selection_type, is_required, min_select, max_select, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('option_template_options')
      .select('id, template_id, name, price, is_default, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('restaurant_tables')
      .select('id, label, code')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('category_translations').select('category_id, name, description').eq('locale', locale),
    supabase.from('menu_item_translations').select('menu_item_id, name, description').eq('locale', locale),
    supabase.from('item_option_group_translations').select('item_option_group_id, title').eq('locale', locale),
    supabase.from('item_option_translations').select('item_option_id, name').eq('locale', locale),
    supabase.from('option_group_template_translations').select('option_group_template_id, display_title').eq('locale', locale),
    supabase.from('option_template_option_translations').select('option_template_option_id, name').eq('locale', locale),
  ])

  const firstError = [
    settingsResult,
    categoriesResult,
    itemsResult,
    groupsResult,
    optionsResult,
    templateLinksResult,
    templatesResult,
    templateOptionsResult,
    tablesResult,
    categoryTranslationsResult,
    itemTranslationsResult,
    groupTranslationsResult,
    optionTranslationsResult,
    templateTranslationsResult,
  ].find((result) => {
    // Deploying the app before the SQL migration must not take the Arabic menu
    // offline. A missing optional translation table simply means Arabic fallback.
    return result.error && !isMissingTranslationTableError(result.error)
  })?.error

  if (firstError) {
    throw new Error(firstError.message)
  }

  const categoryTranslationsById = new Map((categoryTranslationsResult.data || []).map((translation) => [translation.category_id, translation]))
  const itemTranslationsById = new Map((itemTranslationsResult.data || []).map((translation) => [translation.menu_item_id, translation]))
  const groupTranslationsById = new Map((groupTranslationsResult.data || []).map((translation) => [translation.item_option_group_id, translation]))
  const optionTranslationsById = new Map((optionTranslationsResult.data || []).map((translation) => [translation.item_option_id, translation]))
  const templateTranslationsById = new Map((templateTranslationsResult.data || []).map((translation) => [translation.option_group_template_id, translation]))
  const templateOptionTranslationsById = new Map((templateOptionTranslationsResult.data || []).map((translation) => [translation.option_template_option_id, translation]))

  return {
    locale,
    settings: settingsResult.data,
    categories: (categoriesResult.data || []).map((category) => {
      const translation = categoryTranslationsById.get(category.id)
      return { ...category, name: translation?.name || category.name }
    }),
    items: (itemsResult.data || []).map((item) => {
      const translation = itemTranslationsById.get(item.id)
      return {
        ...item,
        name: translation?.name || item.name,
        description: translation?.description ?? item.description,
      }
    }),
    groups: (groupsResult.data || []).map((group) => {
      const translation = groupTranslationsById.get(group.id)
      return { ...group, title: translation?.title || group.title }
    }),
    options: (optionsResult.data || []).map((option) => {
      const translation = optionTranslationsById.get(option.id)
      return { ...option, name: translation?.name || option.name }
    }),
    templateLinks: templateLinksResult.data || [],
    templates: (templatesResult.data || []).map((template) => {
      const translation = templateTranslationsById.get(template.id)
      return { ...template, display_title: translation?.display_title || template.display_title }
    }),
    templateOptions: (templateOptionsResult.data || []).map((option) => {
      const translation = templateOptionTranslationsById.get(option.id)
      return { ...option, name: translation?.name || option.name }
    }),
    tables: tablesResult.data || [],
  } satisfies PublicMenuPayload
}

const getCachedPublicMenuData = unstable_cache(fetchPublicMenuData, ['public-menu-data-v4'], {
  revalidate: 300,
})

export function getPublicMenuData(locale: CatalogLocale) {
  return getCachedPublicMenuData(locale)
}
