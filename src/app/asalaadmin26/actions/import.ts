'use server'

import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export async function importMenuData() {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'غير مصرح لك' }
  }

  try {
    const seedPath = path.join(process.cwd(), 'data', 'menu-import', 'menu.seed.json')
    if (!fs.existsSync(seedPath)) {
      return { success: false, error: 'ملف menu.seed.json غير موجود' }
    }

    const seedContent = fs.readFileSync(seedPath, 'utf8')
    const data = JSON.parse(seedContent)

    // Maps to keep track of new UUIDs
    const categoryIdMap = new Map<string, string>()
    const itemIdMap = new Map<string, string>()
    const groupIdMap = new Map<string, string>()

    // 1. Settings
    if (data.restaurant) {
      await supabase.from('restaurant_settings').upsert({
        ...data.restaurant,
        id: (await supabase.from('restaurant_settings').select('id').single()).data?.id // Update existing or insert
      })
    }

    // 2. Categories
    for (const cat of (data.categories || [])) {
      const { id: oldId, ...catData } = cat
      const { data: newCat, error } = await supabase.from('categories').insert(catData).select().single()
      if (newCat) categoryIdMap.set(oldId, newCat.id)
    }

    // 3. Items
    for (const item of (data.items || [])) {
      const { id: oldId, category_id, ...itemData } = item
      const newCatId = categoryIdMap.get(category_id)
      if (newCatId) {
        const { data: newItem } = await supabase.from('menu_items').insert({
          ...itemData,
          category_id: newCatId
        }).select().single()
        if (newItem) itemIdMap.set(oldId, newItem.id)
      }
    }

    // 4. Option Groups
    for (const group of (data.option_groups || [])) {
      const { id: oldId, item_id, ...groupData } = group
      const newItemId = itemIdMap.get(item_id)
      if (newItemId) {
        const { data: newGroup } = await supabase.from('item_option_groups').insert({
          ...groupData,
          item_id: newItemId
        }).select().single()
        if (newGroup) groupIdMap.set(oldId, newGroup.id)
      }
    }

    // 5. Options
    for (const opt of (data.options || [])) {
      const { id: oldId, group_id, ...optData } = opt
      const newGroupId = groupIdMap.get(group_id)
      if (newGroupId) {
        await supabase.from('item_options').insert({
          ...optData,
          group_id: newGroupId
        })
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير معروف'
    return { success: false, error: message }
  }
}
