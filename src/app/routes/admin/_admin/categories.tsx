import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useCategories, useProducts } from '@/features/products/api';
import {
  useDeleteCategory,
  useCreateCategory,
  useUpdateCategory,
} from '@/features/admin/categories/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types';

export const Route = createFileRoute('/admin/_admin/categories')({
  component: AdminCategoriesPage,
});

interface CategoryFormState {
  name: string;
  emoji: string;
  icon: string;
}

function AdminCategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const { data: products } = useProducts();
  const deleteCategory = useDeleteCategory();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormState>({
    name: '',
    emoji: '',
    icon: '',
  });

  // Подсчитываем количество товаров в каждой категории
  const productCountByCategory = useMemo(() => {
    if (!products) return {};
    return products.reduce(
      (acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
  }, [products]);

  const handleDelete = (id: number, name: string, productCount: number) => {
    if (productCount > 0) {
      alert(
        `❌ Невозможно удалить категорию "${name}"\n\n` +
          `В этой категории ${productCount} товар(ов).\n\n` +
          `Сначала переместите все товары в другую категорию или удалите их.`
      );
      return;
    }

    if (confirm(`Удалить категорию "${name}"?`)) {
      deleteCategory.mutate(id, {
        onError: (error: any) => {
          const errorMessage = error.message || 'Произошла ошибка при удалении категории';
          alert(`❌ Ошибка\n\n${errorMessage}`);
        },
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      emoji: '',
      icon: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    const icon = category.emoji || category.icon;
    setFormData({
      name: category.name,
      emoji: icon,
      icon: icon,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      emoji: '',
      icon: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data: formData },
        {
          onSuccess: () => {
            handleCloseModal();
          },
        }
      );
    } else {
      createCategory.mutate(formData, {
        onSuccess: () => {
          handleCloseModal();
        },
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Загрузка категорий...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Категории</h1>
        <Button onClick={handleOpenCreate}>Добавить категорию</Button>
      </div>

      {!categories || categories.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Категорий пока нет</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => {
            const productCount = productCountByCategory[category.id] || 0;
            return (
              <Card key={category.id} className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{category.emoji || category.icon}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-500">{productCount} товар(ов)</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOpenEdit(category)}
                  >
                    Редактировать
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(category.id, category.name, productCount)}
                    disabled={deleteCategory.isPending}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
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
                <label className="block text-sm font-medium mb-1">Эмодзи</label>
                <div className="grid grid-cols-8 gap-2 mb-2 p-3 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                  {[
                    '🌿',
                    '🌱',
                    '🌾',
                    '🍀',
                    '☘️',
                    '🌳',
                    '🌲',
                    '🌴',
                    '🌵',
                    '🪴',
                    '🍃',
                    '🌸',
                    '🌺',
                    '🌻',
                    '🌼',
                    '🌷',
                    '🥀',
                    '🌹',
                    '💐',
                    '🍄',
                    '🌰',
                    '🛍️',
                    '📦',
                    '💊',
                    '⚗️',
                    '🧪',
                    '🔬',
                    '💚',
                    '♻️',
                    '🌈',
                    '✨',
                    '🔥',
                  ].map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`text-3xl p-2 rounded hover:bg-gray-200 transition ${
                        formData.emoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-2xl"
                  required
                  placeholder="🛍️"
                  maxLength={2}
                />
                <p className="text-xs text-gray-500 mt-1">Выберите эмодзи выше или вставьте свой</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createCategory.isPending || updateCategory.isPending}
                >
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={createCategory.isPending || updateCategory.isPending}
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
