import type { Category } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  categories?: Category[]
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
}

export function CategoryFilter({
  categories = [],
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'px-4 py-2 rounded-full whitespace-nowrap transition-colors',
          selectedCategory === null
            ? 'bg-tg-button text-tg-button-text'
            : 'bg-gray-200 text-gray-700'
        )}
      >
        Все
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'px-4 py-2 rounded-full whitespace-nowrap transition-colors',
            selectedCategory === category.id
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-gray-200 text-gray-700'
          )}
        >
          {category.icon} {category.name}
        </button>
      ))}
    </div>
  )
}
