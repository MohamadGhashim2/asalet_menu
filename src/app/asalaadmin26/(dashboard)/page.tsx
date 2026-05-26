import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // We can fetch some stats here later if we want.
  const { count: itemsCount } = await supabase.from('menu_items').select('*', { count: 'exact', head: true })
  const { count: categoriesCount } = await supabase.from('categories').select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">مرحباً بك في لوحة الإدارة</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-500">إجمالي الأقسام</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{categoriesCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-500">إجمالي المنتجات</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{itemsCount || 0}</p>
        </div>
      </div>
    </div>
  )
}
