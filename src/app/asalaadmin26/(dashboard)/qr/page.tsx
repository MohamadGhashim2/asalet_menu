'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Table2 } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useAdminText } from '@/i18n/admin-text'

export default function QrPage() {
  const tx = useAdminText()
  const [url, setUrl] = useState('')

  useEffect(() => {
    // If NEXT_PUBLIC_SITE_URL is set, use it. Otherwise, use current window origin.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(siteUrl)
  }, [])

  if (!url) return <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">{tx('جاري تجهيز رمز QR...')}</div>

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex w-full flex-col items-center rounded-xl border border-brand-border bg-white p-5 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-brand-text">{tx('رمز الاستجابة السريعة (QR Code) للمنيو')}</h1>
        <p className="mt-2 text-sm leading-6 text-brand-brown">{tx('هذا هو الرمز العام للمنيو. يمكنك طباعته واستخدامه دون ربط الطلب بطاولة محددة.')}</p>

        <div className="my-6 max-w-full rounded-xl border-4 border-brand-cream bg-white p-4">
          <QRCode
            value={url}
            size={256}
            level="H"
          />
        </div>

        <p className="mb-4 text-center text-sm leading-6 text-brand-brown">
          {tx('قم بمسح الرمز أعلاه للوصول إلى المنيو الرقمي الخاص بك.')}<br />
          {tx('يبقى هذا الرمز متاحا بجانب رموز الطاولات المخصصة.')}
        </p>

        <div className="mt-4 w-full rounded-lg border border-brand-border bg-brand-cream/60 p-3 text-center">
          <span className="break-all font-mono text-sm text-brand-brown">{url}</span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="mt-6 min-h-11 w-full rounded-xl bg-brand-burgundy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark sm:w-auto"
        >
          {tx('طباعة الصفحة')}
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Table2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-gold" />
          <div className="min-w-0">
            <h2 className="font-bold text-brand-text">{tx('كيو آر الطاولات')}</h2>
            <p className="mt-1 text-sm leading-6 text-brand-brown">{tx('أنشئ رمزا مستقرا لكل طاولة ليظهر رقمها داخل رسالة الطلب.')}</p>
          </div>
        </div>
        <Link href="/asalaadmin26/tables" className="flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-brand-burgundy px-4 py-2 text-sm font-bold text-brand-burgundy transition-colors hover:bg-brand-burgundy/5">
          {tx('إدارة الطاولات')}
        </Link>
      </div>
    </div>
  )
}
