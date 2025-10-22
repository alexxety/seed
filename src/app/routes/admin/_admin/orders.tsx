import { createFileRoute } from '@tanstack/react-router'
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrder } from '@/features/admin/orders/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { OrderStatus } from '@/types'

export const Route = createFileRoute('/admin/_admin/orders')({
  component: AdminOrdersPage,
})

const statusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В обработке',
  completed: 'Выполнен',
  cancelled: 'Отменен',
}

const statusColors: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function AdminOrdersPage() {
  const { data: orders, isLoading } = useAdminOrders()
  const updateStatus = useUpdateOrderStatus()
  const deleteOrder = useDeleteOrder()

  const handleStatusChange = (orderId: number, newStatus: OrderStatus) => {
    updateStatus.mutate({ id: orderId, status: newStatus })
  }

  const handleDeleteOrder = (orderId: number, orderNumber: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить заказ ${orderNumber}?`)) {
      deleteOrder.mutate(orderId)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Загрузка заказов...</div>
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Заказов пока нет</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Заказы</h1>

      {orders.map((order) => (
        <Card key={order.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Заказ #{order.order_number}</h2>
              <p className="text-gray-600">
                {format(new Date(order.created_at), 'PPp', { locale: ru })}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Клиент</p>
              <p>{order.customer_name}</p>
              <p className="text-sm text-gray-600">{order.customer_phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Доставка</p>
              <p>{order.delivery_type === 'address' ? 'Адрес' : 'ПВЗ'}</p>
              <p className="text-sm text-gray-600">{order.delivery_details}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-lg font-semibold">Сумма: {order.total_amount} ₽</p>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {order.status === 'new' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange(order.id, 'in_progress')}
                disabled={updateStatus.isPending}
              >
                В обработку
              </Button>
            )}
            {order.status === 'in_progress' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(order.id, 'completed')}
                  disabled={updateStatus.isPending}
                >
                  Выполнен
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(order.id, 'cancelled')}
                  disabled={updateStatus.isPending}
                >
                  Отменить
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteOrder(order.id, order.order_number)}
              disabled={deleteOrder.isPending}
              className="ml-auto"
            >
              Удалить
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
