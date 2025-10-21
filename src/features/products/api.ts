import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Product, Category } from '@/types'

interface ProductsResponse {
  success: boolean
  products: Array<{
    id: number
    name: string
    price: number
    category_id: number
    image: string
    description: string
  }>
}

interface CategoriesResponse {
  success: boolean
  categories: Category[]
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const data = await apiClient<ProductsResponse>('/api/products')
      // Трансформируем данные из API в формат приложения
      return data.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category_id,
        image: p.image,
        description: p.description,
      })) as Product[]
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await apiClient<CategoriesResponse>('/api/categories')
      return data.categories
    },
  })
}

export function useProduct(id: number) {
  const { data: products } = useProducts()
  return products?.find(p => p.id === id)
}
