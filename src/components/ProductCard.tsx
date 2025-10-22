import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const hasImage = product.image && product.image.trim() !== ''
  const [imageError, setImageError] = useState(false)

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Зона 1: Изображение */}
      <Link
        to="/product/$id"
        params={{ id: product.id.toString() }}
        className="block"
      >
        {hasImage && !imageError ? (
          <div className="w-full h-48 relative bg-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-green-100 via-emerald-50 to-lime-100">
            <span className="text-7xl">🌱</span>
            <span className="text-sm text-gray-600 font-medium">Фото скоро появится</span>
          </div>
        )}
      </Link>

      {/* Зона 2: Контент (название и цена) */}
      <Link
        to="/product/$id"
        params={{ id: product.id.toString() }}
        className="block flex-1"
      >
        <div className="p-4 min-h-[96px]">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-2xl font-bold text-tg-button">
            {product.price.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </Link>

      {/* Зона 3: Кнопка */}
      {onAddToCart && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <Button
            onClick={() => onAddToCart(product)}
            className="w-full mt-2"
          >
            В корзину
          </Button>
        </div>
      )}
    </Card>
  )
}
