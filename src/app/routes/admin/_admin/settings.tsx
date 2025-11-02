import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useSettings, useUpdateSettings, type Setting } from '@/features/admin/settings/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/admin/_admin/settings')({
  component: AdminSettingsPage,
});

interface SettingFormState {
  [key: string]: string;
}

function AdminSettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState<SettingFormState>({});
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Group settings by category
  const settingsByCategory = useMemo(() => {
    if (!settings) return {};
    return settings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      },
      {} as Record<string, Setting[]>
    );
  }, [settings]);

  // Initialize form data when settings load
  useMemo(() => {
    if (settings && Object.keys(formData).length === 0) {
      const initialData: SettingFormState = {};
      settings.forEach(setting => {
        initialData[setting.key] = setting.value || '';
      });
      setFormData(initialData);
    }
  }, [settings, formData]);

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!settings) return;

    const updates = Object.entries(formData)
      .filter(([key, value]) => {
        const original = settings.find(s => s.key === key);
        return original && original.value !== value;
      })
      .map(([key, value]) => ({ key, value }));

    if (updates.length === 0) {
      alert('ℹ️ Нет изменений для сохранения');
      return;
    }

    updateSettings.mutate(updates, {
      onSuccess: () => {
        setHasChanges(false);
        alert('✅ Настройки успешно сохранены!');
      },
    });
  };

  const handleReset = () => {
    if (!settings) return;
    const initialData: SettingFormState = {};
    settings.forEach(setting => {
      initialData[setting.key] = setting.value || '';
    });
    setFormData(initialData);
    setHasChanges(false);
  };

  const categoryNames: Record<string, string> = {
    telegram: '📱 Telegram',
    bot: '🤖 Бот',
    system: '⚙️ Система',
    general: '📋 Общее',
  };

  const categoryDescriptions: Record<string, string> = {
    telegram: 'Настройки интеграции с Telegram',
    bot: 'Настройки бота и магазина',
    system: 'Системные настройки',
    general: 'Общие настройки приложения',
  };

  if (isLoading) {
    return <div className="p-6">Загрузка...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Управление настройками бота и интеграций
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              className="bg-gray-100 dark:bg-gray-700"
            >
              Отменить
            </Button>
            <Button onClick={handleSave} className="bg-[var(--tg-theme-button-color)] text-white">
              Сохранить изменения
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
          <Card key={category} className="p-6 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-2">{categoryNames[category] || category}</h2>
            {categoryDescriptions[category] && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {categoryDescriptions[category]}
              </p>
            )}

            <div className="space-y-4">
              {categorySettings.map(setting => (
                <div key={setting.key} className="space-y-2">
                  <label className="block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {setting.label}
                        {setting.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      {setting.type === 'secret' && (
                        <button
                          type="button"
                          onClick={() => toggleShowSecret(setting.key)}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          {showSecrets[setting.key] ? '👁️ Скрыть' : '👁️ Показать'}
                        </button>
                      )}
                    </div>
                    {setting.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {setting.description}
                      </p>
                    )}
                    {setting.type === 'textarea' ? (
                      <textarea
                        value={formData[setting.key] || ''}
                        onChange={e => handleInputChange(setting.key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={setting.isRequired}
                      />
                    ) : (
                      <input
                        type={
                          setting.type === 'secret' && !showSecrets[setting.key]
                            ? 'password'
                            : setting.type === 'number'
                              ? 'number'
                              : 'text'
                        }
                        value={formData[setting.key] || ''}
                        onChange={e => handleInputChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={setting.isRequired}
                        placeholder={setting.type === 'secret' ? '••••••••' : ''}
                      />
                    )}
                  </label>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg shadow-lg">
          <p className="text-sm font-medium">⚠️ У вас есть несохраненные изменения</p>
        </div>
      )}
    </div>
  );
}
