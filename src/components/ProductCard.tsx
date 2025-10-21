import { Link } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="overflow-hidden">
      <Link
        to="/product/$id"
        params={{ id: product.id.toString() }}
        className="block"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent) {
              parent.innerHTML = '<div class="w-full h-48 flex items-center justify-center bg-gray-100 text-5xl">🌱</div>'
            }
          }}
        />
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-2xl font-bold text-tg-button">
            {product.price.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </Link>
      {onAddToCart && (
        <div className="px-4 pb-4">
          <Button
            onClick={() => onAddToCart(product)}
            className="w-full"
          >
            В корзину
          </Button>
        </div>
      )}
    </Card>
  )
}
