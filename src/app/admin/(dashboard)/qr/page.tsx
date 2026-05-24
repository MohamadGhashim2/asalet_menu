'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'

export default function QrPage() {
  const [url, setUrl] = useState('')

  useEffect(() => {
    // If NEXT_PUBLIC_SITE_URL is set, use it. Otherwise, use current window origin.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(siteUrl)
  }, [])

  if (!url) return null

  return (
    <div className="max-w-2xl bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">رمز الاستجابة السريعة (QR Code) للمنيو</h1>
      
      <div className="bg-white p-4 border-4 border-gray-100 rounded-xl mb-6">
        <QRCode
          value={url}
          size={256}
          level="H"
        />
      </div>

      <p className="text-gray-600 mb-4 text-center">
        قم بمسح الرمز أعلاه للوصول إلى المنيو الرقمي الخاص بك.<br />
        يمكنك طباعة هذا الرمز ووضعه على الطاولات.
      </p>

      <div className="w-full mt-4 p-3 bg-gray-50 rounded text-center border border-gray-200">
        <span className="text-sm font-mono text-gray-500 break-all">{url}</span>
      </div>
      
      <button 
        onClick={() => {
          const svg = document.querySelector('svg')
          if (!svg) return
          const svgData = new XMLSerializer().serializeToString(svg)
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('new') // Wait, standard way to download QR code needs a canvas, but for MVP let's just ask them to right click or print
          window.print()
        }}
        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
      >
        طباعة الصفحة
      </button>
    </div>
  )
}
