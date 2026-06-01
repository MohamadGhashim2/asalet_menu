import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const PUBLIC_MENU_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=86400'

export type PublicMenuPayload = {
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

async function fetchPublicMenuData() {
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
  ].find((result) => result.error)?.error

  if (firstError) {
    throw new Error(firstError.message)
  }

  return {
    settings: settingsResult.data,
    categories: categoriesResult.data || [],
    items: itemsResult.data || [],
    groups: groupsResult.data || [],
    options: optionsResult.data || [],
    templateLinks: templateLinksResult.data || [],
    templates: templatesResult.data || [],
    templateOptions: templateOptionsResult.data || [],
    tables: tablesResult.data || [],
  } satisfies PublicMenuPayload
}

export const getPublicMenuData = unstable_cache(fetchPublicMenuData, ['public-menu-data-v2'], {
  revalidate: 300,
})
