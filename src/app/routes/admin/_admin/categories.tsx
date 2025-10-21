import { createFileRoute } from '@tanstack/react-router'
import { useCategories } from '@/features/products/api'
import { useDeleteCategory } from '@/features/admin/categories/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/_admin/categories')({
  component: AdminCategoriesPage,
})

function AdminCategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const deleteCategory = useDeleteCategory()

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Удалить категорию "${name}"?`)) {
      deleteCategory.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Загрузка категорий...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Категории</h1>
        <Button>Добавить категорию</Button>
      </div>

      {!categories || categories.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Категорий пока нет</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{category.emoji}</span>
                <h3 className="text-xl font-semibold">{category.name}</h3>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Редактировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(category.id, category.name)}
                  disabled={deleteCategory.isPending}
                  className="text-red-600 hover:bg-red-50"
                >
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
