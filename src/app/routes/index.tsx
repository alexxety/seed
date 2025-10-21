import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useProducts, useCategories } from '@/features/products/api'
import { useCartStore } from '@/features/cart/store'
import { ProductCard } from '@/components/ProductCard'
import { CategoryFilter } from '@/components/CategoryFilter'
import { Header } from '@/components/Header'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const { data: products, isLoading, error } = useProducts()
  const { data: categories } = useCategories()
  const addItem = useCartStore((state) => state.addItem)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <div className="text-5xl">⏳</div>
        <div className="text-lg text-tg-hint">Загрузка товаров...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 px-4">
        <div className="text-5xl">❌</div>
        <div className="text-lg text-red-600 text-center">
          Ошибка загрузки: {error.message}
        </div>
      </div>
    )
  }

  const filteredProducts = selectedCategory
    ? products?.filter((p) => p.category === selectedCategory)
    : products

  return (
    <div className="min-h-screen pb-20">
      <Header title="Каталог" showCart />
      <div className="p-4 space-y-4">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={(p) => addItem(p, 1)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
