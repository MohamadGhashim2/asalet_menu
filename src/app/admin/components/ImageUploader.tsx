'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, Image as ImageIcon, Loader2, X } from 'lucide-react'
import Image from 'next/image'

interface ImageUploaderProps {
  value: string | null
  onChange: (url: string) => void
  folder?: 'items' | 'categories'
  helperText?: string
}

export default function ImageUploader({ value, onChange, folder = 'items', helperText }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()

  const handleUpload = async (file: File) => {
    try {
      setError(null)
      setIsUploading(true)

      // Validation
      if (!file.type.startsWith('image/')) {
        throw new Error('الرجاء رفع ملف صورة صالح')
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت')
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(data.path)

      onChange(publicUrl)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الصورة')
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
        <div className="relative group border rounded-lg overflow-hidden h-40 bg-gray-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded Image"
            className="max-h-full max-w-full object-contain"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-gray-900 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              تغيير الصورة
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-red-600 text-white p-1.5 rounded-md hover:bg-red-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-brand-burgundy/100 transition-colors h-40"
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-brand-burgundy">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-sm font-medium">جاري الرفع...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500 text-center">
              <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
              <span className="text-sm font-bold mb-1 text-gray-700">اضغط هنا أو اسحب الصورة</span>
              <span className="text-xs text-gray-500 mt-1">المقاس المقترح: 500 × 500 بكسل</span>
              <span className="text-xs text-gray-500">يفضل أن تكون الصورة مربعة وواضحة</span>
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
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-1.5 border rounded-md text-sm text-gray-500 bg-gray-50"
          placeholder="أو أدخل رابط الصورة يدوياً (/menu-assets/...)"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
