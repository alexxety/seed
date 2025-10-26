# PostgreSQL Migration Guide

Руководство по миграции с SQLite на PostgreSQL + Prisma ORM

## 🎯 Что изменилось

- ✅ **База данных**: SQLite → PostgreSQL
- ✅ **ORM**: better-sqlite3 → Prisma Client
- ✅ **Типизация**: Полная поддержка TypeScript через Prisma
- ✅ **Масштабируемость**: Готово к продакшену 2025 года

## 📋 Шаг 1: Установка PostgreSQL на дроплете

### Подключитесь к серверу:
```bash
ssh root@143.198.141.222
```

### Загрузите и запустите скрипт установки:
```bash
cd /var/www/telegram-shop
wget https://raw.githubusercontent.com/alexxety/seed/main/setup-postgres.sh
chmod +x setup-postgres.sh
sudo bash setup-postgres.sh
```

### Или установите вручную:
```bash
# Установка PostgreSQL
apt-get update
apt-get install -y postgresql postgresql-contrib

# Запуск
systemctl start postgresql
systemctl enable postgresql

# Создание базы данных и пользователя
sudo -u postgres psql << EOF
CREATE USER seedshop WITH PASSWORD 'seedshop_secure_password_2025';
CREATE DATABASE seedshop OWNER seedshop;
GRANT ALL PRIVILEGES ON DATABASE seedshop TO seedshop;
\c seedshop
GRANT ALL ON SCHEMA public TO seedshop;
EOF
```

## 📋 Шаг 2: Настройка .env на сервере

Добавьте в `/var/www/telegram-shop/.env`:
```bash
DATABASE_URL="postgresql://seedshop:seedshop_secure_password_2025@localhost:5432/seedshop"
```

⚠️ **ВАЖНО**: Смените пароль на продакшене!

## 📋 Шаг 3: Деплой новой версии

### На вашем локальном компьютере:

```bash
# 1. Соберите проект
npm run build

# 2. Закоммитьте изменения
git add .
git commit -m "Migrate to PostgreSQL + Prisma ORM"
git push origin main
```

GitHub Actions автоматически:
- Задеплоит код на сервер
- Запустит `npm install` (который выполнит `prisma generate`)
- Перезапустит приложение

## 📋 Шаг 4: Миграция базы данных на сервере

### Подключитесь к серверу:
```bash
ssh root@143.198.141.222
cd /var/www/telegram-shop
```

### Создайте таблицы через Prisma:
```bash
npx prisma migrate deploy
```

### Мигрируйте данные из SQLite:
```bash
# Убедитесь что старая база orders.db существует
ls -lh orders.db

# Запустите миграцию
npm run db:migrate
```

Скрипт перенесет:
- ✅ Все категории
- ✅ Все товары
- ✅ Все заказы
- ✅ Счетчик заказов

### Перезапустите сервер:
```bash
pm2 restart telegram-shop
# или
systemctl restart telegram-shop
```

## 📋 Шаг 5: Проверка

### Проверьте что база работает:
```bash
# Откройте Prisma Studio (опционально)
npx prisma studio

# Или проверьте через psql
sudo -u postgres psql seedshop -c "SELECT COUNT(*) FROM products;"
```

### Проверьте приложение:
Откройте http://143.198.141.222 и проверьте:
- ✅ Товары отображаются
- ✅ Можно добавить в корзину
- ✅ Можно оформить заказ
- ✅ Админ-панель работает

## 🔧 Полезные команды

### Prisma:
```bash
# Сгенерировать Prisma Client
npm run prisma:generate

# Создать миграцию (dev)
npm run prisma:migrate

# Применить миграции (production)
npm run prisma:migrate:prod

# Открыть Prisma Studio (GUI для базы данных)
npm run prisma:studio
```

### PostgreSQL:
```bash
# Подключиться к базе
sudo -u postgres psql seedshop

# Проверить таблицы
\dt

# Посмотреть данные
SELECT * FROM products LIMIT 10;

# Выйти
\q
```

## 🔒 Безопасность

### Смените пароль базы данных:
```bash
sudo -u postgres psql -c "ALTER USER seedshop WITH PASSWORD 'новый_надежный_пароль';"
```

### Обновите .env:
```bash
DATABASE_URL="postgresql://seedshop:новый_надежный_пароль@localhost:5432/seedshop"
```

### Перезапустите приложение:
```bash
pm2 restart telegram-shop
```

## 🚨 Откат (если что-то пошло не так)

### Вернуться на SQLite:
```bash
# 1. Восстановите старый database.js
mv database-sqlite.js.backup database.js

# 2. Удалите из package.json строку с DATABASE_URL из .env

# 3. Перезапустите
pm2 restart telegram-shop
```

### Старая база:
Файл `orders.db` сохранен и не удален - все данные на месте.

## 📊 Преимущества новой архитектуры

- ✅ **Типизация**: Prisma генерирует TypeScript типы автоматически
- ✅ **Масштабируемость**: PostgreSQL поддерживает миллионы записей
- ✅ **Транзакции**: ACID гарантии для критических операций
- ✅ **Производительность**: Индексы, JSONB, prepared statements
- ✅ **Миграции**: Версионирование схемы базы данных
- ✅ **Инструменты**: Prisma Studio для управления данными

## ❓ Проблемы и решения

### Ошибка подключения к PostgreSQL:
```bash
# Проверьте что PostgreSQL запущен
systemctl status postgresql

# Проверьте логи
tail -f /var/log/postgresql/postgresql-*-main.log
```

### Prisma не может подключиться:
```bash
# Проверьте .env
cat .env | grep DATABASE_URL

# Проверьте что пользователь существует
sudo -u postgres psql -c "\du"
```

### Данные не мигрировались:
```bash
# Запустите миграцию снова (скрипт использует upsert - безопасно)
npm run db:migrate
```

## 📞 Поддержка

Если возникли проблемы - проверьте логи:
```bash
pm2 logs telegram-shop
```

Или создайте issue на GitHub: https://github.com/alexxety/seed/issues
