import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useStoreSettings, useUpdateStoreSettings } from '@/features/admin/settings/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/admin/_admin/settings')({
  component: AdminSettingsPage,
});

interface SettingFormState {
  title: string;
  brand_color: string;
  logo_path: string;
  currency: string;
}

function AdminSettingsPage() {
  const { data: settings, isLoading } = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();

  const [formData, setFormData] = useState<SettingFormState>({
    title: '',
    brand_color: '',
    logo_path: '',
    currency: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        title: settings.title || '',
        brand_color: settings.brand_color || '',
        logo_path: settings.logo_path || '',
        currency: settings.currency || '',
      });
    }
  }, [settings]);

  const handleInputChange = (field: keyof SettingFormState, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    updateSettings.mutate(formData, {
      onSuccess: () => {
        setHasChanges(false);
        alert('✅ Настройки успешно сохранены');
      },
    });
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        title: settings.title || '',
        brand_color: settings.brand_color || '',
        logo_path: settings.logo_path || '',
        currency: settings.currency || '',
      });
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Загрузка настроек...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки магазина</h1>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название магазина</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Мой магазин"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Цвет бренда (HEX)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.brand_color}
                onChange={e => handleInputChange('brand_color', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
                placeholder="#3B82F6"
              />
              <input
                type="color"
                value={formData.brand_color || '#3B82F6'}
                onChange={e => handleInputChange('brand_color', e.target.value)}
                className="w-12 h-10 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL логотипа</label>
            <input
              type="url"
              value={formData.logo_path}
              onChange={e => handleInputChange('logo_path', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Валюта</label>
            <input
              type="text"
              value={formData.currency}
              onChange={e => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="RUB"
              maxLength={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Код валюты ISO 4217 (например: RUB, USD, EUR)
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
            className="flex-1"
          >
            {updateSettings.isPending ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={!hasChanges || updateSettings.isPending}
          >
            Отменить
          </Button>
        </div>
      </Card>
    </div>
  );
}
