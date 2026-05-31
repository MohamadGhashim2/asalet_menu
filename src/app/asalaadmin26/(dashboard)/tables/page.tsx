'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Download,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Save,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import AdminSwitch from '../../components/AdminSwitch'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type RestaurantTable = Database['public']['Tables']['restaurant_tables']['Row']

type Feedback = {
  tone: 'success' | 'error'
  text: string
} | null

const getQrFileName = (table: RestaurantTable) => {
  const safeLabel = table.label
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')

  return `asalet-${safeLabel || table.code}-qr.png`
}

export default function TablesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [siteUrl, setSiteUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [printTable, setPrintTable] = useState<RestaurantTable | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin)
  }, [])

  useEffect(() => {
    let isCurrent = true

    const loadTables = async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!isCurrent) return

      if (error) {
        setFeedback({ tone: 'error', text: `تعذر تحميل الطاولات: ${error.message}` })
      } else {
        setTables(data || [])
      }
      setLoading(false)
    }

    void loadTables()

    return () => {
      isCurrent = false
    }
  }, [supabase])

  useEffect(() => {
    const clearPrintTable = () => setPrintTable(null)
    window.addEventListener('afterprint', clearPrintTable)
    return () => window.removeEventListener('afterprint', clearPrintTable)
  }, [])

  const getTableUrl = (code: string) => {
    if (!siteUrl) return ''

    const url = new URL(siteUrl)
    url.search = ''
    url.hash = ''
    url.searchParams.set('table', code)
    return url.toString()
  }

  const createTable = async () => {
    const label = newLabel.trim()
    if (!label) {
      setFeedback({ tone: 'error', text: 'يرجى كتابة اسم أو رقم الطاولة.' })
      return
    }

    setCreating(true)
    setFeedback(null)
    const maxSortOrder = tables.reduce((max, table) => Math.max(max, table.sort_order), 0)
    const code = `tbl_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        label,
        code,
        sort_order: maxSortOrder + 1,
      })
      .select()
      .single()

    if (error) {
      setFeedback({ tone: 'error', text: `تعذر إضافة الطاولة: ${error.message}` })
    } else {
      setTables(current => [...current, data])
      setNewLabel('')
      setFeedback({ tone: 'success', text: `تمت إضافة ${data.label}.` })
    }
    setCreating(false)
  }

  const updateTable = async (
    tableId: string,
    updates: Database['public']['Tables']['restaurant_tables']['Update'],
    successText: string,
  ) => {
    setSavingId(tableId)
    setFeedback(null)
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tableId)
      .select()
      .single()

    if (error) {
      setFeedback({ tone: 'error', text: `تعذر حفظ التغييرات: ${error.message}` })
    } else {
      setTables(current => current
        .map(table => table.id === tableId ? data : table)
        .sort((a, b) => a.sort_order - b.sort_order || (a.created_at || '').localeCompare(b.created_at || '')))
      setFeedback({ tone: 'success', text: successText })
    }
    setSavingId(null)
    return !error
  }

  const startEditing = (table: RestaurantTable) => {
    setEditingId(table.id)
    setEditLabel(table.label)
    setEditSortOrder(table.sort_order)
    setFeedback(null)
  }

  const saveEditing = async (table: RestaurantTable) => {
    const label = editLabel.trim()
    if (!label) {
      setFeedback({ tone: 'error', text: 'اسم الطاولة مطلوب.' })
      return
    }

    const saved = await updateTable(
      table.id,
      { label, sort_order: Number.isFinite(editSortOrder) ? editSortOrder : table.sort_order },
      'تم تحديث بيانات الطاولة.',
    )
    if (saved) setEditingId(null)
  }

  const deleteTable = async (table: RestaurantTable) => {
    if (!window.confirm(`هل تريد حذف ${table.label}؟ لن يعمل رابطها بعد الحذف.`)) return

    setSavingId(table.id)
    setFeedback(null)
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', table.id)
    if (error) {
      setFeedback({ tone: 'error', text: `تعذر حذف الطاولة: ${error.message}` })
    } else {
      setTables(current => current.filter(currentTable => currentTable.id !== table.id))
      setFeedback({ tone: 'success', text: `تم حذف ${table.label}.` })
    }
    setSavingId(null)
  }

  const copyTableUrl = async (tableUrl: string) => {
    try {
      await navigator.clipboard.writeText(tableUrl)
      setFeedback({ tone: 'success', text: 'تم نسخ رابط الطاولة.' })
    } catch {
      setFeedback({ tone: 'error', text: 'تعذر نسخ الرابط. يمكنك نسخه يدويا.' })
    }
  }

  const downloadTableQr = (table: RestaurantTable) => {
    const qrContainer = document.getElementById(`table-qr-${table.id}`)
    const svg = qrContainer?.querySelector('svg')
    if (!svg) {
      setFeedback({ tone: 'error', text: 'تعذر تجهيز ملف كيو آر.' })
      return
    }

    const source = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const image = new window.Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 1200
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(svgUrl)
        setFeedback({ tone: 'error', text: 'تعذر تجهيز ملف كيو آر.' })
        return
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 72, 72, 1056, 1056)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(svgUrl)
        if (!blob) {
          setFeedback({ tone: 'error', text: 'تعذر تجهيز ملف كيو آر.' })
          return
        }

        const pngUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = pngUrl
        link.download = getQrFileName(table)
        link.click()
        URL.revokeObjectURL(pngUrl)
        setFeedback({ tone: 'success', text: `تم تحميل كيو آر ${table.label}.` })
      }, 'image/png')
    }

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      setFeedback({ tone: 'error', text: 'تعذر تجهيز ملف كيو آر.' })
    }
    image.src = svgUrl
  }

  const printTableQr = (table: RestaurantTable) => {
    setPrintTable(table)
    window.setTimeout(() => window.print(), 0)
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">الطاولات</h1>
          <p className="mt-1 text-sm leading-6 text-brand-brown">أنشئ رابطا وكيو آر مستقرا لكل طاولة ليظهر رقمها داخل رسالة الطلب.</p>
        </div>

        {feedback && (
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {feedback.text}
          </div>
        )}

        <section className="rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="font-bold text-brand-text">إضافة طاولة</h2>
            <p className="mt-1 text-sm leading-6 text-brand-brown">اكتب الاسم كما تريد أن يظهر للعميل، مثل: طاولة 1.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-bold text-brand-text">اسم الطاولة</span>
              <input
                value={newLabel}
                onChange={event => setNewLabel(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void createTable()
                }}
                placeholder="مثال: طاولة 1"
                className="min-h-11 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition-colors focus:border-brand-gold"
              />
            </label>
            <button
              type="button"
              onClick={() => void createTable()}
              disabled={creating}
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-xl bg-brand-burgundy px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-burgundy-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {creating ? 'جاري الإضافة...' : 'إضافة طاولة'}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-brand-text">قائمة الطاولات</h2>
              <p className="mt-1 text-sm text-brand-brown">{tables.length} طاولة</p>
            </div>
            <Table2 className="h-6 w-6 shrink-0 text-brand-gold" />
          </div>

          {loading ? (
            <div className="rounded-xl border border-brand-border bg-white p-5 text-sm text-brand-brown">جاري تحميل الطاولات...</div>
          ) : tables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center">
              <QrCode className="mx-auto h-9 w-9 text-brand-gold" />
              <p className="mt-3 font-bold text-brand-text">لا توجد طاولات بعد</p>
              <p className="mt-1 text-sm leading-6 text-brand-brown">أضف أول طاولة ليظهر رابطها وكيو آر الخاص بها هنا.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tables.map(table => {
                const tableUrl = getTableUrl(table.code)
                const isEditing = editingId === table.id
                const isSaving = savingId === table.id

                return (
                  <article key={table.id} className="min-w-0 rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div id={`table-qr-${table.id}`} className="mx-auto flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white p-3 sm:mx-0">
                        {tableUrl ? <QRCode value={tableUrl} size={152} level="H" /> : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="grid gap-3">
                            <label>
                              <span className="mb-1 block text-xs font-bold text-brand-brown">اسم الطاولة</span>
                              <input
                                value={editLabel}
                                onChange={event => setEditLabel(event.target.value)}
                                className="min-h-10 w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-gold"
                              />
                            </label>
                            <label>
                              <span className="mb-1 block text-xs font-bold text-brand-brown">الترتيب</span>
                              <input
                                type="number"
                                value={editSortOrder}
                                onChange={event => setEditSortOrder(Number(event.target.value))}
                                className="min-h-10 w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-gold"
                              />
                            </label>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="break-words text-lg font-bold text-brand-text">{table.label}</h3>
                                <p className="mt-1 text-xs text-brand-brown">الترتيب: {table.sort_order}</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${table.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {table.is_active ? 'نشطة' : 'متوقفة'}
                              </span>
                            </div>
                            <AdminSwitch
                              checked={table.is_active}
                              onCheckedChange={checked => void updateTable(table.id, { is_active: checked }, checked ? 'تم تفعيل الطاولة.' : 'تم إيقاف الطاولة.')}
                              label="نشطة"
                              disabled={isSaving}
                              className="mt-4 inline-flex min-h-10 items-center gap-3 rounded-lg"
                              labelClassName="text-sm font-bold text-brand-text"
                            />
                          </>
                        )}

                        <div className="mt-4 rounded-lg border border-brand-border bg-brand-cream/60 p-2.5">
                          <p className="break-all text-left font-mono text-[11px] leading-5 text-brand-brown" dir="ltr">{tableUrl}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void saveEditing(table)}
                            disabled={isSaving}
                            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-burgundy px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-brown disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                            إلغاء
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(table)}
                          disabled={isSaving}
                          className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-burgundy disabled:opacity-60"
                        >
                          <Pencil className="h-4 w-4" />
                          تعديل
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void copyTableUrl(tableUrl)}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-brown"
                      >
                        <Copy className="h-4 w-4" />
                        نسخ الرابط
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTableQr(table)}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-brown"
                      >
                        <Download className="h-4 w-4" />
                        تحميل كيو آر
                      </button>
                      <button
                        type="button"
                        onClick={() => printTableQr(table)}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-brown"
                      >
                        <Printer className="h-4 w-4" />
                        طباعة
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteTable(table)}
                        disabled={isSaving}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {printTable && (
        <div className="table-print-card hidden">
          <div className="flex h-full w-full flex-col items-center justify-center bg-white p-6 text-center">
            <h1 className="text-3xl font-black text-brand-burgundy">أصالة مندي</h1>
            <p className="mt-3 text-2xl font-bold text-brand-text">{printTable.label}</p>
            <div className="my-6 rounded-xl border-4 border-brand-cream bg-white p-4">
              <QRCode value={getTableUrl(printTable.code)} size={520} level="H" />
            </div>
            <p className="text-xl font-bold text-brand-text">امسح الكود لعرض المنيو</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A6 portrait;
            margin: 0;
          }

          body * {
            visibility: hidden !important;
          }

          .table-print-card,
          .table-print-card * {
            visibility: visible !important;
          }

          .table-print-card {
            display: flex !important;
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
          }
        }
      `}</style>
    </>
  )
}
