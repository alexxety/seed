---
name: crypto-billing
description: "Крипто-платежи для платформы и продавцов: интерфейс PaymentProvider, каркасы Coinbase/BTCPay, вебхуки (HMAC + идемпотентность), подписки, комиссии платформы."
tags: ["payments","crypto","security","webhooks","saas-billing"]
---

# 🎯 Цель
Добавить крипто-биллинг в двух плоскостях:
1) **Платформа → подписки/планы**: оплата в крипте, активация feature flags у tenant.
2) **Продавцы → оплаты заказов** (non-custodial): каждый магазин подключает своего провайдера; при платеже учитывается **комиссия платформы**.

---

# 🧩 Архитектура (коротко)
- **Интерфейс** `PaymentProvider` (единый контракт).
- **Провайдеры**: `coinbase` и `btcpay` (каркасы + TODO реализаций).
- **Таблицы (core/public)**: `invoices`, `commission_logs`, `webhook_events` (идемпотентность).
- **Вебхуки**: `rawBody` + проверка подписи (HMAC/схема провайдера) + защита от повторов по `eventId`.
- **Фичефлаги**: активация/деактивация по событию успешной оплаты подписки.
- **Шифрование** ключей продавцов (AES-GCM, ключ из ENV).

---

# 🔧 Что сделать (пошагово)

## 1) ENV + конфиг
Добавить в `.env.example` (и валидировать в `server/src/config/env.ts`):

```bash
PLATFORM_COMMISSION=5                     # % комиссия платформы
PAYMENT_PROVIDER=coinbase|btcpay          # дефолт для платформы
COINBASE_API_KEY=                         # (если используем Coinbase Commerce)
COINBASE_WEBHOOK_SECRET=                  # HMAC секрет
BTCPAY_HOST=                              # https://btcpay.example.com
BTCPAY_API_KEY=                           # API key
BTCPAY_WEBHOOK_SECRET=                    # HMAC секрет
ENCRYPTION_KEY=                           # base64 32 байта для AES-GCM (ключ шифрования ключей продавца)
```

## 2) Интерфейс провайдера
`server/src/payments/provider.ts`
```ts
export interface PaymentProvider {
  createInvoice(input: {
    amount: string;           // строкой, чтобы не терять точность
    currency: string;         // "USDT","BTC","ETH" и т.д.
    meta?: Record<string, any>;
  }): Promise<{ id: string; url: string }>;

  verifyWebhook(sigHeaders: any, rawBody: string): {
    ok: boolean;
    eventId?: string;
    type?: string;            // e.g. "payment.succeeded" | "invoice.expired"
    data?: any;               // нормализованный payload
    error?: string;
  };

  getStatus(id: string): Promise<"pending"|"paid"|"expired"|"failed">;
}
```

## 3) Каркасы провайдеров

`server/src/payments/coinbase.ts`
`server/src/payments/btcpay.ts`

Оба экспортируют фабрику `createCoinbaseProvider(config)` / `createBTCPayProvider(config)`, возвращающую `PaymentProvider`.
    •    В `verifyWebhook` обязательно нормализовать `eventId`, `type`, `data` и проверять подпись.
    •    В `createInvoice` вернуть `{id,url}` платёжной сессии у провайдера.

## 4) Шифрование ключей продавцов

`server/src/payments/crypto.ts`

```ts
export async function encryptSecret(plain: string): Promise<string> { /* AES-GCM + base64 */ }
export async function decryptSecret(enc: string): Promise<string> { /* AES-GCM */ }
```

Хранить в БД только зашифрованные ключи продавца (например, `tenants_payment_integrations`).

## 5) Таблицы (core/public)

Миграция добавляет:

**invoices**
    •    `id` (uuid, pk)
    •    `tenantId` (uuid, nullable для платформенных инвойсов, если глобально?)
    •    `type` (PLATFORM_SUBSCRIPTION | ORDER_PAYMENT)
    •    `provider` (coinbase | btcpay | другое)
    •    `provider_invoice_id` (string, unique)
    •    `amount` (numeric/decimal)
    •    `currency` (text)
    •    `status` (pending | paid | expired | failed)
    •    `meta` (jsonb)
    •    `createdAt`, `updatedAt`, `paidAt` (nullable)

**commission_logs**
    •    `id` (uuid, pk)
    •    `tenantId` (uuid)                      # магазин, с заказа которого комиссия
    •    `orderId` (uuid)
    •    `commission_percent` (numeric)
    •    `commission_amount` (numeric)
    •    `currency` (text)
    •    `createdAt` (ts)

**webhook_events**
    •    `eventId` (string, pk)
    •    `provider` (text)
    •    `receivedAt` (ts)
    •    уникальный `eventId+provider` для идемпотентности

(по желанию: таблица `tenants_payment_integrations` с зашифрованными ключами продавца)

## 6) API платформы

Маршруты (без tenant):
    •    **POST /api/billing/subscribe**
    •    Body: `{ planId, currency }`
    •    Действия: создать invoice в провайдере `PAYMENT_PROVIDER`, сохранить в `invoices`, вернуть `{url}`
    •    **POST /api/billing/webhook**
    •    Принимает `rawBody` (не JSON), проверяет подпись
    •    Если `type == "payment.succeeded"`:
    •    найти invoice по `provider_invoice_id`
    •    `status="paid"`, `paidAt=now()`
    •    активировать подписку/фичи (`plan_features` → выставить флаги для tenant)
    •    Всегда проверять `webhook_events` (если `eventId` уже есть → 200 OK и ничего не делать)

## 7) API продавцов (tenant-scoped)

Маршруты (под tenant):
    •    **POST /api/tenant/payments/provider** — сохранить/обновить настройки провайдера продавца (ключи шифруем)
    •    **POST /api/tenant/orders/:orderId/pay** — создать invoice у провайдера продавца
    •    сохранить invoice (`type="ORDER_PAYMENT"`, `tenantId=<текущий>`)
    •    вернуть `{url}` для редиректа покупателя
    •    **POST /api/tenant/payments/webhook** — вебхук от провайдера продавца
    •    проверка подписи/идемпотентности
    •    при `payment.succeeded`:
    •    `order.paid=true`, `paidAt=now()`
    •    рассчитать и записать комиссию в `commission_logs`
    •    обновить `invoices.status="paid"`

💡 Комиссию считать как % от суммы (ENV `PLATFORM_COMMISSION`). Валюта — та же, что у оплаты.

## 8) Обработчик raw webhook тела

До `express.json()` добавить middleware:

```ts
app.use('/api/billing/webhook', express.raw({ type: '*/*' }));
app.use('/api/tenant/payments/webhook', express.raw({ type: '*/*' }));
```

Внутри обработчиков парсить `rawBody` вручную, затем уже конвертировать в JSON после верификации подписи.

## 9) RBAC и безопасность
    •    Все маршруты, кроме вебхуков, под JWT guard.
    •    Суперадмин может менять тариф/фичи; владелец магазина — интеграции и заказы своего tenant.
    •    Rate-limit на публичные маршруты (особенно вебхуки и создание инвойсов).
    •    Запрет на логирование секретов и сырых payload'ов (логируем только `eventId`, `type`, `status`).

## 10) Интеграция с фичефлагами

После успешной платформенной оплаты:
    •    Обновить `subscriptions` / `plan_features` для `tenantId`
    •    Активировать флаги (например, `listed_in_marketplace`, `webhooks_enabled`, лимиты и т.п.)

---

## 🧪 Примеры (curl)

**Создать подписку (платформа):**

```bash
curl -X POST https://<host>/api/billing/subscribe \
  -H "Authorization: Bearer <SUPERADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"planId":"pro-monthly","currency":"USDT"}'
```

**Вебхук платформы (пример, без реальной подписи):**

```bash
curl -X POST https://<host>/api/billing/webhook \
  -H "Content-Type: application/json" \
  --data-raw '{"event_id":"evt_123","type":"payment.succeeded","data":{"provider_invoice_id":"inv_abc"}}'
```

**Создать оплату заказа у продавца (tenant):**

```bash
curl -X POST https://<host>/api/tenant/orders/<orderId>/pay \
  -H "Authorization: Bearer <TENANT_OWNER_JWT>" \
  -H "X-Tenant: demo" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USDT","amount":"49.90"}'
```

---

## ✅ Definition of Done
    •    Реализован интерфейс `PaymentProvider` + каркасы `coinbase` и `btcpay`.
    •    Таблицы `invoices`, `commission_logs`, `webhook_events` в core.
    •    Вебхуки принимают `rawBody`, проверяют подпись, идемпотентны по `eventId`.
    •    Подписка платформы включает фичефлаги у tenant.
    •    Оплата заказа продавца помечает заказ paid и фиксирует комиссию.
    •    Ключи продавцов в БД зашифрованы.
    •    Добавлены примеры curl и заметки по безопасности.

---

## 📌 Подсказки для реализации (Claude применяет при генерации)
    •    Все секреты — только через `env.ts` (Zod).
    •    Типы сумм хранить `decimal/numeric`; в коде — строки, без float.
    •    Для шифрования использовать `crypto` (Node.js) с AES-GCM и уникальными nonce.
    •    Идемпотентность: `webhook_events(eventId, provider)` + Redis set (дополнительно).
    •    Ошибки вебхуков логировать, но отвечать 2xx, если событие уже обработано.
