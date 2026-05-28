import { createClient } from '@/lib/supabase/server'
import MenuClient from './MenuClient'

export const revalidate = 60 // Revalidate every minute

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: settings },
    { data: categories },
    { data: items },
    { data: groups },
    { data: options },
    { data: templateLinks },
    { data: templates },
    { data: templateOptions }
  ] = await Promise.all([
    supabase.from('restaurant_settings').select('*').single(),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('item_option_groups').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('item_options').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('item_option_template_links').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('option_group_templates').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('option_template_options').select('*').eq('is_active', true).order('sort_order')
  ])

  // Process items to include their groups and options
  const processedItems = items?.map(item => {
    // 1. Local Option Groups
    const itemGroups = groups?.filter(g => g.item_id === item.id).map(group => ({
      ...group,
      source: 'item' as const,
      options: options?.filter(o => o.group_id === group.id) || []
    })) || []

    // 2. Linked Templates
    const linkedGroups = templateLinks?.filter(l => l.item_id === item.id).flatMap(link => {
      const template = templates?.find(t => t.id === link.template_id)
      if (!template) return []

      const tOpts = templateOptions?.filter(o => o.template_id === template.id).map(opt => ({
        id: `template-option:${opt.id}`,
        group_id: `template:${template.id}`,
        name: opt.name,
        price: opt.price,
        is_default: opt.is_default,
        sort_order: opt.sort_order,
        is_active: opt.is_active,
        created_at: opt.created_at,
        updated_at: opt.updated_at
      })) || []

      // Sort options by sort_order
      tOpts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

      return [{
        id: `template:${template.id}`,
        item_id: item.id,
        title: template.display_title,
        kind: template.kind,
        selection_type: template.selection_type,
        is_required: template.is_required,
        min_select: template.min_select,
        max_select: template.max_select,
        sort_order: link.sort_order || template.sort_order || 0,
        is_active: template.is_active,
        created_at: template.created_at,
        updated_at: template.updated_at,
        source: 'template' as const,
        options: tOpts
      }]
    }) || []

    // Merge and sort
    const allGroups = [...itemGroups, ...linkedGroups]
    allGroups.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    return {
      ...item,
      groups: allGroups
    }
  }) || []

  // Sort categories by sort_order ascending then created_at ascending
  const sortedCategories = (categories || []).sort((a, b) => {
    const sortA = a.sort_order ?? 0;
    const sortB = b.sort_order ?? 0;
    if (sortA !== sortB) return sortA - sortB;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });

  return (
    <main className="min-h-screen">

      <MenuClient 
        settings={settings || undefined}
        categories={sortedCategories}
        items={processedItems}
      />
    </main>
  )
}
