import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { optimizeMenuImage } from '@/lib/image-optimizer'

const MENU_IMAGES_BUCKET = 'menu-images'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

type AdminSupabaseClient = SupabaseClient<Database>

export type MenuImageFolder = 'items' | 'categories'

export function validateMenuImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('الرجاء رفع ملف صورة صالح')
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت')
  }
}

export async function uploadMenuImage(
  supabase: AdminSupabaseClient,
  rawFile: File,
  folder: MenuImageFolder
) {
  validateMenuImageFile(rawFile)

  const file = await optimizeMenuImage(rawFile, {
    mode: folder === 'categories' ? 'category' : 'product',
  })
  const randomSuffix = Math.random().toString(36).slice(2, 10)
  const filePath = `${folder}/${Date.now()}-${randomSuffix}.webp`

  const { data, error } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: 'image/webp',
      cacheControl: '31536000',
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .getPublicUrl(data.path)

  return publicUrl
}
