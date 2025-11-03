# Инструкция по деплою

Автоматический деплой приложения на дроплет через GitHub Actions.

## Шаг 1: Настройка дроплета

1. Подключитесь к дроплету по SSH:

```bash
ssh root@143.198.141.222
```

2. Скопируйте файл `deploy-setup.sh` на сервер и запустите:

```bash
chmod +x deploy-setup.sh
./deploy-setup.sh
```

Этот скрипт установит и настроит:

- Nginx веб-сервер
- Директорию для приложения `/var/www/telegram-shop`
- Firewall правила

## Шаг 2: Настройка GitHub Secrets

В вашем GitHub репозитории перейдите в **Settings → Secrets and variables → Actions** и добавьте следующие секреты:

### DROPLET_HOST

```
143.198.141.222
```

### DROPLET_USER

```
root
```

(или имя пользователя, если используете не root)

### DROPLET_SSH_KEY

Это приватный SSH ключ для доступа к серверу. Если у вас еще нет ключа:

**На вашем локальном компьютере:**

```bash
ssh-keygen -t ed25519 -C "github-actions"
```

Сохраните ключ (например, в `~/.ssh/github_actions`)

**Скопируйте публичный ключ на сервер:**

```bash
ssh-copy-id -i ~/.ssh/github_actions.pub root@143.198.141.222
```

**Скопируйте приватный ключ:**

```bash
cat ~/.ssh/github_actions
```

Скопируйте весь вывод (включая `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`) и вставьте в GitHub Secret `DROPLET_SSH_KEY`.

## Шаг 3: Создание GitHub репозитория

1. Инициализируйте git репозиторий (если еще не сделали):

```bash
git init
git add .
git commit -m "Initial commit: Telegram Mini App"
```

2. Создайте репозиторий на GitHub и свяжите с локальным:

```bash
git remote add origin https://github.com/ваш-username/telegram-shop.git
git branch -M main
git push -u origin main
```

## Шаг 4: Автоматический деплой

После настройки, каждый push в ветку `main` автоматически:

1. Соберет проект (`npm run build`)
2. Загрузит собранные файлы на дроплет в `/var/www/telegram-shop`
3. Перезагрузит nginx

## Проверка деплоя

После push в main:

1. Перейдите в **Actions** в вашем GitHub репозитории
2. Проверьте статус деплоя
3. Откройте http://143.198.141.222 в браузере

## Настройка домена (опционально)

Если хотите использовать домен вместо IP:

1. Настройте A-запись вашего домена на 143.198.141.222

2. На сервере обновите конфигурацию nginx:

```bash
nano /etc/nginx/sites-available/telegram-shop
```

Замените `server_name 143.198.141.222;` на `server_name ваш-домен.com;`

3. Установите SSL сертификат:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d ваш-домен.com
```

## Подключение к Telegram

1. Создайте бота через @BotFather
2. Создайте Mini App: `/newapp`
3. Укажите URL: `http://143.198.141.222` (или ваш домен с HTTPS)

## Устранение проблем

### Проверка логов nginx:

```bash
tail -f /var/log/nginx/error.log
```

### Проверка статуса nginx:

```bash
systemctl status nginx
```

### Проверка прав доступа:

```bash
ls -la /var/www/telegram-shop
```

### Тестирование SSH подключения:

```bash
ssh -i ~/.ssh/github_actions root@143.198.141.222
```
