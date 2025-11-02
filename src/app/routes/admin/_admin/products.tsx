import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useProducts, useCategories } from '@/features/products/api';
import {
  useDeleteProduct,
  useCreateProduct,
  useUpdateProduct,
} from '@/features/admin/products/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';

export const Route = createFileRoute('/admin/_admin/products')({
  component: AdminProductsPage,
});

// Компонент для изображения с заглушкой
function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Нет изображения</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-48 object-cover rounded-lg mb-3"
      onError={() => setError(true)}
    />
  );
}

interface ProductFormState {
  name: string;
  price: string;
  category: string;
  image: string;
  description: string;
}

function AdminProductsPage() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormState>({
    name: '',
    price: '',
    category: '',
    image: '',
    description: '',
  });

  const getCategoryName = (categoryId: number) => {
    return categories?.find(c => c.id === categoryId)?.name || 'Без категории';
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Удалить товар "${name}"?`)) {
      deleteProduct.mutate(id);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category: categories?.[0]?.id.toString() || '',
      image: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category.toString(),
      image: product.image,
      description: product.description,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category: '',
      image: '',
      description: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      price: parseInt(formData.price),
      category: parseInt(formData.category),
      image: formData.image,
      description: formData.description,
    };

    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            handleCloseModal();
          },
        }
      );
    } else {
      createProduct.mutate(data, {
        onSuccess: () => {
          handleCloseModal();
        },
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Загрузка товаров...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Товары</h1>
        <Button onClick={handleOpenCreate}>Добавить товар</Button>
      </div>

      {!products || products.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Товаров пока нет</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.id} className="p-4">
              <ProductImage src={product.image} alt={product.name} />
              <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{getCategoryName(product.category)}</p>
              <p className="text-lg font-bold mb-3">{product.price} ₽</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenEdit(product)}
                >
                  Редактировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleteProduct.isPending}
                  className="text-red-600 hover:bg-red-50"
                >
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Цена (₽)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Категория</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL изображения</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createProduct.isPending || updateProduct.isPending}
                >
                  {editingProduct ? 'Сохранить' : 'Создать'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={createProduct.isPending || updateProduct.isPending}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
