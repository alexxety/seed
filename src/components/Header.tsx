import { Link } from '@tanstack/react-router'
import { useCartStore } from '@/features/cart/store'

interface HeaderProps {
  title?: string
  showCart?: boolean
  onBack?: () => void
}

export function Header({ title, showCart = false, onBack }: HeaderProps) {
  const itemsCount = useCartStore((state) => state.itemsCount)

  return (
    <header className="sticky top-0 z-10 bg-tg-bg border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-tg-button text-xl">
              ←
            </button>
          )}
          {title && <h1 className="text-xl font-semibold">{title}</h1>}
        </div>
        {showCart && (
          <Link
            to="/cart"
            className="relative text-tg-button text-2xl"
          >
            🛒
            {itemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {itemsCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  )
}
