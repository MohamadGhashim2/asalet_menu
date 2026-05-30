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

  if (!url) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">جاري تجهيز رمز QR...</div>

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-xl border border-brand-border bg-white p-5 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-brand-text">رمز الاستجابة السريعة (QR Code) للمنيو</h1>
      <p className="mt-2 text-sm leading-6 text-brand-brown">اطبع الرمز وضعه على الطاولات ليصل الزبون إلى المنيو مباشرة.</p>
      
      <div className="my-6 max-w-full rounded-xl border-4 border-brand-cream bg-white p-4">
        <QRCode
          value={url}
          size={256}
          level="H"
        />
      </div>

      <p className="mb-4 text-center text-sm leading-6 text-brand-brown">
        قم بمسح الرمز أعلاه للوصول إلى المنيو الرقمي الخاص بك.<br />
        يمكنك طباعة هذا الرمز ووضعه على الطاولات.
      </p>

      <div className="mt-4 w-full rounded-lg border border-brand-border bg-brand-cream/60 p-3 text-center">
        <span className="break-all font-mono text-sm text-brand-brown">{url}</span>
      </div>
      
      <button 
        type="button"
        onClick={() => window.print()}
        className="mt-6 min-h-11 w-full rounded-xl bg-brand-burgundy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
      >
        طباعة الصفحة
      </button>
    </div>
  )
}
