import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_MENU_CACHE_TAG } from '@/lib/public-menu-data'

export const dynamic = 'force-dynamic'

// Invalidates the cached public menu so dashboard edits appear immediately.
// Only an authenticated admin (same session that can edit the menu) may call it.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Next 16 requires a cache-life profile as the second argument; "max" is the
  // value its own deprecation notice recommends for a plain tag invalidation.
  revalidateTag(PUBLIC_MENU_CACHE_TAG, 'max')

  return NextResponse.json({ revalidated: true }, { headers: { 'Cache-Control': 'no-store' } })
}
