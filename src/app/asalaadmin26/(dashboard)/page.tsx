import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // We can fetch some stats here later if we want.
  const { count: itemsCount } = await supabase.from('menu_items').select('*', { count: 'exact', head: true })
  const { count: categoriesCount } = await supabase.from('categories').select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-brand-text sm:text-3xl">مرحباً بك في لوحة الإدارة</h1>
        <p className="text-sm leading-6 text-brand-brown">ملخص سريع لمحتوى المنيو الحالي.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-brand-brown">إجمالي الأقسام</h2>
          <p className="mt-2 text-3xl font-bold text-brand-text">{categoriesCount || 0}</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-brand-brown">إجمالي المنتجات</h2>
          <p className="mt-2 text-3xl font-bold text-brand-text">{itemsCount || 0}</p>
        </div>
      </div>
    </div>
  )
}
