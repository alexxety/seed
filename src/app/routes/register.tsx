import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { checkSubdomainAvailability, registerShop, type RegisterShopData } from '@/features/shops/api'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const [formData, setFormData] = useState<RegisterShopData>({
    subdomain: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    botToken: '',
    chatId: '',
    adminTelegramId: '',
  })

  const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
  }>({
    checking: false,
    available: null,
    error: null,
  })

  const [success, setSuccess] = useState<{
    show: boolean
    shopUrl: string
    message: string
  } | null>(null)

  const registerMutation = useMutation({
    mutationFn: registerShop,
    onSuccess: (data) => {
      if (data.success && data.shop) {
        setSuccess({
          show: true,
          shopUrl: data.shop.url,
          message: data.message || 'Магазин успешно создан!',
        })
        // Clear form
        setFormData({
          subdomain: '',
          ownerName: '',
          ownerEmail: '',
          ownerPhone: '',
          botToken: '',
          chatId: '',
          adminTelegramId: '',
        })
      }
    },
  })

  // Check subdomain availability with debounce
  useEffect(() => {
    if (!formData.subdomain || formData.subdomain.length < 3) {
      setSubdomainStatus({ checking: false, available: null, error: null })
      return
    }

    const timeoutId = setTimeout(async () => {
      setSubdomainStatus({ checking: true, available: null, error: null })
      try {
        const result = await checkSubdomainAvailability(formData.subdomain)
        setSubdomainStatus({
          checking: false,
          available: result.available,
          error: result.error || null,
        })
      } catch (error) {
        setSubdomainStatus({
          checking: false,
          available: false,
          error: 'Ошибка проверки доступности',
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.subdomain])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!subdomainStatus.available) {
      return
    }

    registerMutation.mutate(formData)
  }

  const handleInputChange = (field: keyof RegisterShopData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const isFormValid =
    subdomainStatus.available &&
    formData.ownerName &&
    formData.ownerEmail &&
    formData.botToken &&
    formData.chatId &&
    formData.adminTelegramId

  if (success?.show) {
    return (
      <div className="min-h-screen">
        <Header title="Регистрация магазина" />
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">
                Магазин успешно создан!
              </h2>
              <p className="text-green-700 dark:text-green-400 mb-4">{success.message}</p>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-300 dark:border-green-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Адрес вашего магазина:</p>
                <a
                  href={success.shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 font-mono text-lg hover:underline"
                >
                  {success.shopUrl}
                </a>
              </div>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <Button
                onClick={() => setSuccess(null)}
                variant="outline"
              >
                Зарегистрировать ещё один магазин
              </Button>
              <Button
                onClick={() => window.open(success.shopUrl, '_blank')}
              >
                Перейти в магазин
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <Header title="Регистрация магазина" />
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Создайте свой Telegram-магазин</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Заполните форму ниже, чтобы зарегистрировать новый магазин
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subdomain */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Поддомен <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                value={formData.subdomain}
                onChange={(e) => handleInputChange('subdomain', e.target.value.toLowerCase())}
                placeholder="ivan"
                className="pr-28"
                pattern="[a-z0-9-]+"
                minLength={3}
                maxLength={20}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                .x-bro.com
              </span>
            </div>
            {subdomainStatus.checking && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">⏳ Проверка...</p>
            )}
            {subdomainStatus.available === true && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">✅ Доступен</p>
            )}
            {subdomainStatus.available === false && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                ❌ {subdomainStatus.error || 'Занят'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              3-20 символов, только буквы, цифры и дефис
            </p>
          </div>

          {/* Owner Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Ваше имя <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.ownerName}
              onChange={(e) => handleInputChange('ownerName', e.target.value)}
              placeholder="Иван Иванов"
              required
            />
          </div>

          {/* Owner Email */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
              placeholder="ivan@example.com"
              required
            />
          </div>

          {/* Owner Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">Телефон (необязательно)</label>
            <Input
              type="tel"
              value={formData.ownerPhone}
              onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          {/* Bot Token */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Telegram Bot Token <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.botToken}
              onChange={(e) => handleInputChange('botToken', e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Получите токен у{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                @BotFather
              </a>
            </p>
          </div>

          {/* Chat ID */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ID чата для уведомлений <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.chatId}
              onChange={(e) => handleInputChange('chatId', e.target.value)}
              placeholder="-1001234567890"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ID чата или канала, куда будут приходить заказы
            </p>
          </div>

          {/* Admin Telegram ID */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Ваш Telegram ID <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.adminTelegramId}
              onChange={(e) => handleInputChange('adminTelegramId', e.target.value)}
              placeholder="123456789"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Узнайте свой ID у{' '}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                @userinfobot
              </a>
            </p>
          </div>

          {/* Error message */}
          {registerMutation.isError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300 text-sm">
                ❌ Ошибка:{' '}
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : 'Неизвестная ошибка'}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid || registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Создаём магазин...' : 'Создать магазин'}
          </Button>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            ℹ️ Что вы получите:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Собственный магазин на поддомене .x-bro.com</li>
            <li>Интеграция с вашим Telegram ботом</li>
            <li>Уведомления о заказах в ваш чат</li>
            <li>Админ-панель для управления</li>
            <li>SSL сертификат (HTTPS)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
