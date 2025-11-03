import { createFileRoute } from '@tanstack/react-router';
import { useAdminOrders, useUpdateOrderStatus } from '@/features/admin/orders/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { OrderStatus } from '@/types/admin';

function formatOrderDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Неизвестная дата';
    }
    return format(date, 'PPp', { locale: ru });
  } catch (error) {
    console.error('Invalid date:', dateString, error);
    return 'Неизвестная дата';
  }
}

export const Route = createFileRoute('/admin/_admin/orders')({
  component: AdminOrdersPage,
});

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Новый',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function AdminOrdersPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (orderId: string, newStatus: OrderStatus, paid?: boolean) => {
    updateStatus.mutate({ id: orderId, status: newStatus, paid });
  };

  if (isLoading) {
    return <div className="text-center py-12">Загрузка заказов...</div>;
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Заказов пока нет</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Заказы</h1>

      {orders.map(order => (
        <Card key={order.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Заказ #{order.order_number}</h2>
              <p className="text-gray-600">{formatOrderDate(order.created_at)}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}
            >
              {statusLabels[order.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Клиент</p>
              <p>{order.customer?.full_name || 'Имя не указано'}</p>
              <p className="text-sm text-gray-600">{order.customer?.phone || order.customer?.email || 'Контакт не указан'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Доставка</p>
              <p>{order.delivery_type || 'Не указана'}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-lg font-semibold">
              Сумма: {order.total} {order.currency || '₽'}
              {order.paid && <span className="ml-2 text-sm text-green-600">(Оплачен)</span>}
            </p>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {order.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange(order.id, 'processing')}
                disabled={updateStatus.isPending}
              >
                В обработку
              </Button>
            )}
            {order.status === 'processing' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(order.id, 'shipped')}
                  disabled={updateStatus.isPending}
                >
                  Отправлен
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
            {order.status === 'shipped' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange(order.id, 'delivered')}
                disabled={updateStatus.isPending}
              >
                Доставлен
              </Button>
            )}
            {!order.paid && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(order.id, order.status, true)}
                disabled={updateStatus.isPending}
                className="ml-auto"
              >
                Отметить оплаченным
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
