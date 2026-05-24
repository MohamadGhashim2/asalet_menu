'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2 } from 'lucide-react'

type Category = Database['public']['Tables']['categories']['Row']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSort, setEditSort] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSort, setNewSort] = useState(0)
  
  const supabase = createClient()

  async function fetchCategories() {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
    
    if (data) setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories()
  }, [])

  

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newName, sort_order: newSort })
      .select()
      .single()

    if (data) {
      setCategories([...categories, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      setIsAdding(false)
      setNewName('')
      setNewSort(0)
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return

    const { error } = await supabase
      .from('categories')
      .update({ name: editName, sort_order: editSort })
      .eq('id', id)

    if (!error) {
      setCategories(categories.map(c => c.id === id ? { ...c, name: editName, sort_order: editSort } : c).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      setIsEditing(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات التابعة له!')) return

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) {
      setCategories(categories.filter(c => c.id !== id))
    }
  }

  function startEdit(c: Category) {
    setIsEditing(c.id)
    setEditName(c.name)
    setEditSort(c.sort_order || 0)
  }

  if (loading) return <div>جاري التحميل...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">الأقسام</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة قسم
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-md" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
            <input type="number" className="w-full px-3 py-2 border rounded-md" value={newSort} onChange={e => setNewSort(parseInt(e.target.value) || 0)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">حفظ</button>
            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">إلغاء</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الترتيب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isEditing === category.id ? (
                    <input type="text" className="w-full px-2 py-1 border rounded" value={editName} onChange={e => setEditName(e.target.value)} />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isEditing === category.id ? (
                    <input type="number" className="w-24 px-2 py-1 border rounded" value={editSort} onChange={e => setEditSort(parseInt(e.target.value) || 0)} />
                  ) : (
                    <span className="text-sm text-gray-500">{category.sort_order}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {isEditing === category.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(category.id)} className="text-green-600 hover:text-green-900">حفظ</button>
                      <button onClick={() => setIsEditing(null)} className="text-gray-600 hover:text-gray-900">إلغاء</button>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button onClick={() => startEdit(category)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">لا يوجد أقسام</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
