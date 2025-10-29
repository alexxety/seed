import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSuperAdminAuthStore } from '@/features/superadmin/store'
import { getAllShops, updateShopStatus, deleteShop, type Shop } from '@/features/superadmin/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/superadmin/_superadmin/shops')({
  component: ShopsPage,
})

function ShopsPage() {
  const getToken = useSuperAdminAuthStore((state) => state.getToken)
  const queryClient = useQueryClient()
  const token = getToken()

  const { data: shops, isLoading, error } = useQuery({
    queryKey: ['superadmin-shops'],
    queryFn: () => getAllShops(token!),
    enabled: !!token,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'blocked' | 'pending' }) =>
      updateShopStatus(id, status, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-shops'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteShop(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-shops'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-gray-400">Загрузка магазинов...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-400">Ошибка загрузки магазинов</p>
          <p className="text-gray-500 text-sm mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  const handleToggleStatus = (shop: Shop) => {
    const newStatus = shop.status === 'active' ? 'blocked' : 'active'
    if (
      confirm(
        `Вы уверены, что хотите ${newStatus === 'blocked' ? 'заблокировать' : 'активировать'} магазин ${shop.subdomain}.x-bro.com?`
      )
    ) {
      updateStatusMutation.mutate({ id: shop.id, status: newStatus })
    }
  }

  const handleDelete = (shop: Shop) => {
    if (
      confirm(
        `⚠️ ВНИМАНИЕ! Вы собираетесь удалить магазин ${shop.subdomain}.x-bro.com и его DNS запись.\n\nЭто действие необратимо!\n\nПродолжить?`
      )
    ) {
      deleteMutation.mutate(shop.id)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-400 border border-green-700">
            Активен
          </span>
        )
      case 'blocked':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-400 border border-red-700">
            Заблокирован
          </span>
        )
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-700">
            Ожидает
          </span>
        )
      default:
        return null
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'free':
        return <span className="text-xs text-gray-500">Бесплатный</span>
      case 'basic':
        return <span className="text-xs text-blue-400">Базовый</span>
      case 'pro':
        return <span className="text-xs text-purple-400">Про</span>
      default:
        return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Все Магазины</h2>
        <p className="text-gray-400">
          Всего зарегистрировано: <span className="font-semibold text-white">{shops?.length || 0}</span> магазинов
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Активные магазины</div>
          <div className="text-2xl font-bold text-green-400">
            {shops?.filter((s) => s.status === 'active').length || 0}
          </div>
        </Card>
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Заблокированные</div>
          <div className="text-2xl font-bold text-red-400">
            {shops?.filter((s) => s.status === 'blocked').length || 0}
          </div>
        </Card>
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Ожидают проверки</div>
          <div className="text-2xl font-bold text-yellow-400">
            {shops?.filter((s) => s.status === 'pending').length || 0}
          </div>
        </Card>
      </div>

      {/* Shops List */}
      <div className="space-y-4">
        {shops && shops.length === 0 ? (
          <Card className="p-8 bg-gray-800 border-gray-700 text-center">
            <div className="text-5xl mb-4">🏪</div>
            <p className="text-gray-400">Пока нет зарегистрированных магазинов</p>
          </Card>
        ) : (
          shops?.map((shop) => (
            <Card key={shop.id} className="p-6 bg-gray-800 border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Shop Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-white">
                      {shop.subdomain}.x-bro.com
                    </h3>
                    {getStatusBadge(shop.status)}
                    {getPlanBadge(shop.plan)}
                  </div>

                  {/* Owner Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Владелец:</p>
                      <p className="text-white font-medium">{shop.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Email:</p>
                      <p className="text-white">{shop.ownerEmail}</p>
                    </div>
                    {shop.ownerPhone && (
                      <div>
                        <p className="text-gray-400">Телефон:</p>
                        <p className="text-white">{shop.ownerPhone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Telegram Admin ID:</p>
                      <p className="text-white font-mono">{shop.adminTelegramId}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Chat ID:</p>
                      <p className="text-white font-mono">{shop.chatId}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Bot Token:</p>
                      <p className="text-white font-mono text-xs">{shop.botTokenMasked}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-4 flex gap-6 text-xs text-gray-500">
                    <div>
                      Создан: {new Date(shop.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                    <div>
                      Обновлён: {new Date(shop.updatedAt).toLocaleDateString('ru-RU')}
                    </div>
                    {shop.expiresAt && (
                      <div className="text-yellow-500">
                        Истекает: {new Date(shop.expiresAt).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://${shop.subdomain}.x-bro.com`, '_blank')}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white whitespace-nowrap"
                  >
                    🔗 Открыть
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(shop)}
                    disabled={updateStatusMutation.isPending}
                    className={
                      shop.status === 'active'
                        ? 'border-red-600 text-red-400 hover:bg-red-900/30'
                        : 'border-green-600 text-green-400 hover:bg-green-900/30'
                    }
                  >
                    {shop.status === 'active' ? '🚫 Блокировать' : '✅ Активировать'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(shop)}
                    disabled={deleteMutation.isPending}
                    className="border-red-600 text-red-400 hover:bg-red-900/50"
                  >
                    🗑️ Удалить
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
