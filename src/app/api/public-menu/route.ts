import { NextResponse } from 'next/server'
import { getPublicMenuData, PUBLIC_MENU_CACHE_CONTROL } from '@/lib/public-menu-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const menuData = await getPublicMenuData()

    return NextResponse.json(menuData, {
      headers: {
        'Cache-Control': PUBLIC_MENU_CACHE_CONTROL,
      },
    })
  } catch (error) {
    console.error('Public menu API load failed:', error)

    return NextResponse.json(
      { error: 'Public menu is temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}
