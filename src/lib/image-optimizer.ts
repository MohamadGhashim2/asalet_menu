const MENU_IMAGE_SIZE = 1200
const MENU_IMAGE_QUALITY = 0.98
const MENU_IMAGE_BACKGROUND = '#F7F1E8'

export type MenuImageMode = 'product' | 'category'

export async function optimizeMenuImage(
  file: File,
  options?: { mode?: MenuImageMode }
): Promise<File> {
  void options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = event => {
      const image = new window.Image()

      image.onload = () => {
        if (!image.width || !image.height) {
          reject(new Error('تعذر قراءة أبعاد الصورة'))
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = MENU_IMAGE_SIZE
        canvas.height = MENU_IMAGE_SIZE

        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('تعذر تجهيز الصورة للرفع'))
          return
        }

        context.fillStyle = MENU_IMAGE_BACKGROUND
        context.fillRect(0, 0, MENU_IMAGE_SIZE, MENU_IMAGE_SIZE)
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'

        const scale = Math.min(
          1,
          MENU_IMAGE_SIZE / image.width,
          MENU_IMAGE_SIZE / image.height
        )
        const width = image.width * scale
        const height = image.height * scale
        const x = (MENU_IMAGE_SIZE - width) / 2
        const y = (MENU_IMAGE_SIZE - height) / 2

        context.drawImage(image, x, y, width, height)
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('تعذر تحويل الصورة إلى WebP'))
            return
          }

          resolve(new File([blob], 'menu-image.webp', { type: 'image/webp' }))
        }, 'image/webp', MENU_IMAGE_QUALITY)
      }

      image.onerror = () => reject(new Error('فشل تحميل الصورة'))
      image.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error('فشل قراءة الملف'))
    reader.readAsDataURL(file)
  })
}
