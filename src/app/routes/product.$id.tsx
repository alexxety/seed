import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useProduct } from '@/features/products/api'
import { useCartStore } from '@/features/cart/store'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/product/$id')({
  component: ProductPage,
})

function ProductPage() {
  const navigate = useNavigate()
  const { id } = Route.useParams()
  const product = useProduct(Number(id))
  const addItem = useCartStore((state) => state.addItem)
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <div className="text-5xl">❌</div>
        <div className="text-lg">Товар не найден</div>
      </div>
    )
  }

  const handleAddToCart = () => {
    addItem(product, quantity)
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen">
      <Header onBack={() => navigate({ to: '/' })} showCart />
      <div className="p-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-80 object-cover rounded-lg mb-4"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent) {
              const placeholder = document.createElement('div')
              placeholder.className = 'w-full h-80 flex items-center justify-center bg-gray-100 text-7xl rounded-lg mb-4'
              placeholder.textContent = '🌱'
              parent.insertBefore(placeholder, parent.firstChild)
            }
          }}
        />
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <p className="text-tg-hint mb-4">{product.description}</p>
        <div className="text-3xl font-bold text-tg-button mb-6">
          {product.price.toLocaleString('ru-RU')} ₽
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-gray-200 text-xl"
          >
            -
          </button>
          <span className="text-xl font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-full bg-gray-200 text-xl"
          >
            +
          </button>
        </div>

        <Button onClick={handleAddToCart} className="w-full" size="lg">
          Добавить в корзину
        </Button>
      </div>
    </div>
  )
}
