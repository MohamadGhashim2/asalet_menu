import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const MENU_IMAGES_BUCKET = 'menu-images'
const MENU_IMAGES_PUBLIC_PREFIX = `/storage/v1/object/public/${MENU_IMAGES_BUCKET}/`

type AdminSupabaseClient = SupabaseClient<Database>

export type DeleteMenuImageResult = {
  deleted: boolean
  skippedReason?: string
  error?: string
}

export function getMenuImageStoragePath(url: string | null | undefined): string | null {
  const trimmedUrl = url?.trim()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!trimmedUrl || !supabaseUrl || trimmedUrl.includes('/menu-assets/')) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedUrl)
    const parsedSupabaseUrl = new URL(supabaseUrl)

    if (parsedUrl.origin !== parsedSupabaseUrl.origin) {
      return null
    }

    if (!parsedUrl.pathname.startsWith(MENU_IMAGES_PUBLIC_PREFIX)) {
      return null
    }

    const encodedPath = parsedUrl.pathname.slice(MENU_IMAGES_PUBLIC_PREFIX.length)
    if (!encodedPath) {
      return null
    }

    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}

export function isSupabaseMenuImageUrl(url: string | null | undefined): boolean {
  return getMenuImageStoragePath(url) !== null
}

export async function countImageReferences(
  supabase: AdminSupabaseClient,
  imageUrl: string
): Promise<number> {
  if (!isSupabaseMenuImageUrl(imageUrl)) {
    return 0
  }

  const [itemsResult, categoriesResult] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('image_url', imageUrl),
    supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('image_url', imageUrl),
  ])

  const error = itemsResult.error || categoriesResult.error
  if (error) {
    throw new Error(error.message)
  }

  return (itemsResult.count || 0) + (categoriesResult.count || 0)
}

export async function deleteMenuImageIfUnused(
  supabase: AdminSupabaseClient,
  imageUrl: string | null | undefined,
  _options?: { ignoreCurrent?: boolean }
): Promise<DeleteMenuImageResult> {
  void _options

  const path = getMenuImageStoragePath(imageUrl)

  if (!path || !imageUrl) {
    return { deleted: false, skippedReason: 'not-menu-image-url' }
  }

  try {
    const references = await countImageReferences(supabase, imageUrl)

    if (references > 0) {
      return { deleted: false, skippedReason: 'image-still-referenced' }
    }

    const { error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .remove([path])

    if (error) {
      return { deleted: false, error: error.message }
    }

    return { deleted: true }
  } catch (error) {
    return {
      deleted: false,
      error: error instanceof Error ? error.message : 'Unknown storage cleanup error',
    }
  }
}

export async function deleteMenuImagesIfUnused(
  supabase: AdminSupabaseClient,
  imageUrls: Array<string | null | undefined>
): Promise<DeleteMenuImageResult[]> {
  const uniqueUrls = Array.from(new Set(imageUrls.filter((url): url is string => Boolean(url))))
  const results: DeleteMenuImageResult[] = []

  for (const imageUrl of uniqueUrls) {
    results.push(await deleteMenuImageIfUnused(supabase, imageUrl))
  }

  return results
}

export const getStoragePathFromPublicUrl = getMenuImageStoragePath
