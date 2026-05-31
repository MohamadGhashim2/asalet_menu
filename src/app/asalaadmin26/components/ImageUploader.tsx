'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadMenuImage } from '@/lib/admin-image-upload'
import { UploadCloud, Loader2, X } from 'lucide-react'

interface ImageUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
  onClear?: () => void | Promise<void>
  folder?: 'items' | 'categories'
  helperText?: string
}

export default function ImageUploader({ value, onChange, onClear, folder = 'items', helperText }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleUpload = async (rawFile: File) => {
    try {
      setError(null)
      setIsUploading(true)

      const publicUrl = await uploadMenuImage(supabase, rawFile, folder)
      onChange(publicUrl)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الصورة'
      setError(message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0])
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  const handleClear = async () => {
    try {
      setError(null)
      setIsClearing(true)

      if (onClear) {
        await onClear()
      } else {
        onChange(null)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الصورة'
      setError(message)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="w-full">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={onFileChange}
      />

      {value ? (
        <div className="rounded-xl border border-brand-border bg-white p-3">
          <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-lg bg-brand-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="صورة مرفوعة"
              className="max-h-full max-w-full object-contain"
            />
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 text-brand-burgundy">
                <Loader2 className="mb-2 h-8 w-8 animate-spin" />
                <span className="text-sm font-bold">جاري رفع الصورة...</span>
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isClearing}
              className="flex min-h-11 items-center justify-center rounded-lg border border-brand-border bg-brand-cream px-3 py-2 text-sm font-bold text-brand-burgundy transition-colors hover:bg-brand-beige disabled:opacity-60"
            >
              تغيير الصورة
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isUploading || isClearing}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {isClearing ? 'جاري حذف الصورة...' : 'حذف الصورة'}
            </button>
          </div>
          <div className="mt-3 space-y-1 text-xs leading-5 text-gray-500">
            <p>المقاس المقترح: 1200 × 1200 بكسل</p>
            <p>يفضل رفع صورة مربعة وواضحة</p>
            <p>سيتم ضغط الصورة وتحويلها إلى WebP قبل الرفع</p>
            {helperText && <p className="font-bold text-brand-burgundy">{helperText}</p>}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-border bg-white p-5 transition-colors hover:border-brand-burgundy hover:bg-brand-cream/60"
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-brand-burgundy">
              <Loader2 className="mb-2 h-8 w-8 animate-spin" />
              <span className="text-sm font-medium">جاري الرفع...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500 text-center">
              <UploadCloud className="mb-2 h-8 w-8 text-brand-gold" />
              <span className="mb-1 text-sm font-bold text-gray-700">اضغط هنا أو اسحب الصورة</span>
              <span className="mt-1 text-xs text-gray-500">المقاس المقترح: 1200 × 1200 بكسل</span>
              <span className="text-xs text-gray-500">يفضل رفع صورة مربعة وواضحة</span>
              <span className="text-xs text-gray-500">سيتم ضغط الصورة وتحويلها إلى WebP قبل الرفع</span>
              {helperText && <span className="text-xs text-brand-burgundy mt-1 font-medium">{helperText}</span>}
              <span className="text-xs text-brand-gold mt-1">PNG, JPG, WEBP (الحد الأقصى 5MB)</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Optional: Keep a manual fallback input */}
      <div className="mt-3">
        <input
          type="text"
          className="min-h-11 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-gray-600 outline-none transition-colors focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10"
          placeholder="أو أدخل رابط الصورة يدوياً (https://...)"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
