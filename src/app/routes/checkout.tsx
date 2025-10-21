import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, FormEvent } from 'react'
import { useCartStore } from '@/features/cart/store'
import { useCreateOrder } from '@/features/orders/api'
import { useTelegram } from '@/lib/telegram'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, total, clearCart } = useCartStore()
  const { user } = useTelegram()
  const createOrder = useCreateOrder()

  const [formData, setFormData] = useState({
    fullName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    phone: '',
    deliveryType: 'address' as 'address' | 'pvz',
    deliveryDetails: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    try {
      const result = await createOrder.mutateAsync({
        customer: {
          ...formData,
          telegramUsername: user?.username,
          telegramId: user?.id,
          telegramFirstName: user?.first_name,
          telegramLastName: user?.last_name,
        },
        items,
        total,
      })

      clearCart()
      navigate({
        to: '/success/$orderNumber',
        params: { orderNumber: result.orderNumber },
      })
    } catch (error) {
      alert('Ошибка при оформлении заказа')
    }
  }

  if (items.length === 0) {
    navigate({ to: '/' })
    return null
  }

  return (
    <div className="min-h-screen pb-32">
      <Header title="Оформление заказа" onBack={() => navigate({ to: '/cart' })} />
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ФИО</label>
            <Input
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="Иван Иванов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Телефон</label>
            <Input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Доставка</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, deliveryType: 'address' })
                }
                className={`flex-1 py-2 px-4 rounded-lg border-2 ${
                  formData.deliveryType === 'address'
                    ? 'border-tg-button bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                📍 По адресу
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, deliveryType: 'pvz' })
                }
                className={`flex-1 py-2 px-4 rounded-lg border-2 ${
                  formData.deliveryType === 'pvz'
                    ? 'border-tg-button bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                📦 СДЕК ПВЗ
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {formData.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ'}
            </label>
            <Input
              required
              value={formData.deliveryDetails}
              onChange={(e) =>
                setFormData({ ...formData, deliveryDetails: e.target.value })
              }
              placeholder={
                formData.deliveryType === 'address'
                  ? 'ул. Ленина, д. 1, кв. 1'
                  : 'MSK123'
              }
            />
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Ваш заказ</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold">
                  {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold text-lg">Итого:</span>
            <span className="text-2xl font-bold text-tg-button">
              {total.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </Card>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={createOrder.isPending}
        >
          {createOrder.isPending ? 'Отправка...' : 'Подтвердить заказ'}
        </Button>
      </form>
    </div>
  )
}
