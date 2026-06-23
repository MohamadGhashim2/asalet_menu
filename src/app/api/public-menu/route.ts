import { NextResponse } from 'next/server'
import { getPublicMenuData, PUBLIC_MENU_CACHE_CONTROL } from '@/lib/public-menu-data'
import { resolveCatalogLocale } from '@/lib/catalog-locale'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const locale = resolveCatalogLocale(new URL(request.url).searchParams.get('locale'))
    const menuData = await getPublicMenuData(locale)

    return NextResponse.json(menuData, {
      headers: {
        'Cache-Control': PUBLIC_MENU_CACHE_CONTROL,
        'Content-Language': locale,
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
