import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  useAdminProducts,
  useDeleteProduct,
  useCreateProduct,
  useUpdateProduct,
} from '@/features/admin/products/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/admin';

export const Route = createFileRoute('/admin/_admin/products')({
  component: AdminProductsPage,
});

interface ProductFormState {
  name: string;
  vendor: string;
  category: string;
  description: string;
  is_active: boolean;
}

function AdminProductsPage() {
  const { data: products, isLoading } = useAdminProducts();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormState>({
    name: '',
    vendor: 'Default Vendor',
    category: 'General',
    description: '',
    is_active: true,
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Удалить товар "${name}"?`)) {
      deleteProduct.mutate(id);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      vendor: 'Default Vendor',
      category: 'General',
      description: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      vendor: product.vendor || 'Default Vendor',
      category: product.category || 'General',
      description: product.description || '',
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      vendor: 'Default Vendor',
      category: 'General',
      description: '',
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      vendor: formData.vendor,
      category: formData.category,
      description: formData.description,
      is_active: formData.is_active,
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
        <div className="space-y-3">
          {products.map(product => (
            <Card key={product.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{product.description}</p>
                  <p className="text-xs text-gray-500">
                    Поставщик: {product.vendor || 'N/A'} | Категория: {product.category || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Вариантов: {product.variants_count || 0} |
                    Статус: {product.is_active ?
                      <span className="text-green-600">Активен</span> :
                      <span className="text-red-600">Неактивен</span>
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
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
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Поставщик</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Категория</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium">Активен</label>
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
