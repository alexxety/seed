import { createFileRoute } from '@tanstack/react-router'
import { useProducts, useCategories } from '@/features/products/api'
import { useDeleteProduct } from '@/features/admin/products/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/_admin/products')({
  component: AdminProductsPage,
})

function AdminProductsPage() {
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const deleteProduct = useDeleteProduct()

  const getCategoryName = (categoryId: number) => {
    return categories?.find((c) => c.id === categoryId)?.name || 'Без категории'
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Удалить товар "${name}"?`)) {
      deleteProduct.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Загрузка товаров...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Товары</h1>
        <Button>Добавить товар</Button>
      </div>

      {!products || products.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Товаров пока нет</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="p-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
              <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{getCategoryName(product.category)}</p>
              <p className="text-lg font-bold mb-3">{product.price} ₽</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Редактировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleteProduct.isPending}
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
