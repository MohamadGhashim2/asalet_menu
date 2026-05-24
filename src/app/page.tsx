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
    { data: options }
  ] = await Promise.all([
    supabase.from('restaurant_settings').select('*').single(),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order'),
    supabase.from('item_option_groups').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('item_options').select('*').eq('is_active', true).order('sort_order')
  ])

  // Process items to include their groups and options
  const processedItems = items?.map(item => {
    const itemGroups = groups?.filter(g => g.item_id === item.id).map(group => ({
      ...group,
      options: options?.filter(o => o.group_id === group.id) || []
    })) || []
    return {
      ...item,
      groups: itemGroups
    }
  }) || []

  return (
    <main className="min-h-screen pb-20 max-w-md mx-auto bg-gray-50 shadow-xl relative">
      {/* Header */}
      <header className="bg-white px-4 py-6 text-center shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">المنيو</h1>
      </header>

      <MenuClient 
        settings={settings || undefined}
        categories={categories || []}
        items={processedItems}
      />
    </main>
  )
}
