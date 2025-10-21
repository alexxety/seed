import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCartStore } from '@/features/cart/store'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const navigate = useNavigate()
  const { items, total, updateQuantity, removeItem } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header title="Корзина" onBack={() => navigate({ to: '/' })} />
        <div className="flex items-center justify-center h-[80vh] flex-col gap-4">
          <div className="text-6xl">🛒</div>
          <div className="text-xl text-tg-hint">Корзина пуста</div>
          <Button onClick={() => navigate({ to: '/' })}>
            Перейти к покупкам
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32">
      <Header title="Корзина" onBack={() => navigate({ to: '/' })} />
      <div className="p-4 space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    const placeholder = document.createElement('div')
                    placeholder.className = 'w-20 h-20 flex items-center justify-center bg-gray-100 rounded text-3xl'
                    placeholder.textContent = '🌱'
                    parent.insertBefore(placeholder, parent.firstChild)
                  }
                }}
              />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-tg-button font-bold">
                  {item.price.toLocaleString('ru-RU')} ₽
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-sm"
                  >
                    -
                  </button>
                  <span className="font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-sm"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-auto text-red-500"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Итого:</span>
          <span className="text-2xl font-bold text-tg-button">
            {total.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <Button
          onClick={() => navigate({ to: '/checkout' })}
          className="w-full"
          size="lg"
        >
          Оформить заказ
        </Button>
      </div>
    </div>
  )
}
