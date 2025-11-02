---
name: security-audit
description: 'Провести полный аудит безопасности: ENV-валидация, JWT (kid+jti), rate-limit, CORS whitelist, CSP, audit-logs, health checks, защита супер-админки.'
tags: ['security', 'best-practices', 'auth', 'api', 'saas']
---

# 🎯 Цель

Привести проект к уровню **минимально безопасного SaaS-продукта**, чтобы:

1. ❌ Не было утечек ENV/секретов
2. ❌ Не было возможности попасть в чужой tenant
3. ✅ Все токены ограничены по сроку и могут быть отозваны
4. ✅ Атаки типа brute-force, replay, CSRF, JSON pollution, Open Redirect блокируются
5. ✅ Все критичные действия логируются (кто, что, когда)
6. ✅ Супер-админ панель защищена отдельно

---

# ✅ Что требуется реализовать

## 1. ENV ВАЛИДАЦИЯ

`server/src/config/env.ts` (через Zod)

✔ Любая отсутствующая переменная → сервер **не стартует**
✔ Все boolean/числовые переменные приводятся к типу
✔ Разделить: `CORE`, `TENANCY`, `SECURITY`, `BILLING`, `SEARCH`, `EMAIL`

---

## 2. JWT БЕЗОПАСНОСТЬ

| требование                                       | статус             |
| ------------------------------------------------ | ------------------ |
| TTL ≤ 1 час                                      | ✅                 |
| В payload → `sub`, `role`, `tenantId?`, `jti`    | ✅                 |
| Поддержка `kid` (future key rotation)            | ✅                 |
| Хранить **чёрный список jti** в Redis (optional) | 🔜                 |
| Супер-админ имеет свою `SIGNING_KEY_SUPERADMIN`  | ✅ (другой секрет) |

---

## 3. AUTH MIDDLEWARE

Файлы:

```
server/src/middleware/authenticateToken.ts
server/src/middleware/requireRole.ts
server/src/middleware/requireTenant.ts
```

✔ `authenticateToken` — проверяет JWT, срок, подпись, jti blacklist
✔ `requireRole("superadmin")` — доступ только супер-админу
✔ `requireTenant` — запрет на доступ без tenantId (см. multitenancy)

---

## 4. RATE LIMITING

Использовать `rate-limiter-flexible` + Redis.

| endpoint                     | лимит                          |
| ---------------------------- | ------------------------------ |
| `/api/superadmin/login`      | 5 попыток / 10 минут           |
| `/api/admin/login`           | 10 попыток / 10 минут          |
| `/api/tenant/orders/:id/pay` | защита от спама                |
| `/api/billing/webhook`       | не лимитировать, но логировать |

---

## 5. CORS / CSP / HEADERS

### CORS

В ENV:

```bash
CORS_ALLOWED_ORIGINS="https://admin.site.com,https://shop.site.com"
```

### CSP (Helmet)

```
default-src 'self';
script-src 'self' https:;
style-src 'self' 'unsafe-inline';
connect-src 'self' https:;
img-src 'self' data: https:;
frame-ancestors 'none';
```

### Другие заголовки

| Header                      | Значение    |
| --------------------------- | ----------- |
| `X-Content-Type-Options`    | nosniff     |
| `X-Frame-Options`           | DENY        |
| `Referrer-Policy`           | no-referrer |
| `Strict-Transport-Security` | 1 year      |

---

## 6. AUDIT LOGGING

Создать таблицу `audit_logs`:

| поле                 | значение                                                      |
| -------------------- | ------------------------------------------------------------- |
| id                   | uuid                                                          |
| userId / superadmin? | nullable                                                      |
| tenantId             | nullable                                                      |
| action               | string (`TENANT_CREATED`, `LOGIN_FAILED`, `ORDER_PAID`, etc.) |
| meta                 | jsonb                                                         |
| ip                   | string                                                        |
| userAgent            | string                                                        |
| createdAt            | timestamp                                                     |

Логировать:

- Успешные и неуспешные логины
- Создание/удаление tenant
- Изменение тарифов
- Изменение крипто-настроек продавца
- Выполнение супер-админ действий
- Marketplace publish/unpublish

---

## 7. HEALTH / READY CHECKS

```
GET /healthz   → просто 200 OK
GET /readyz    → проверяет: DB, Redis, Search, Queue
```

---

## 8. ЗАПРЕТ НА СЕКРЕТЫ В README / GIT

✔ `.env` → в `.gitignore`
✔ GitHub Actions → секреты только через `secrets.*`
✔ Любые токены → маскированы в логах

---

## 9. ЗАЩИТА SUPERADMIN ПАНЕЛИ

| Мера                                            | Обязательно    |
| ----------------------------------------------- | -------------- |
| Отдельный JWT secret                            | ✅             |
| Отдельный CORS whitelist                        | ✅             |
| Ограничить IP по ENV (`SUPERADMIN_ALLOWED_IPS`) | ⚠️ желательно  |
| Обязательное 2FA (email/TOTP)                   | 🔜 можно позже |
| Логирование всех действий                       | ✅             |

---

# 🧨 Анти-атаки чеклист

| Угроза            | Защита                               |
| ----------------- | ------------------------------------ |
| Brute-force login | rate limit + audit                   |
| JWT चोरी / reuse  | jti blacklist                        |
| SSRF              | запрет внешних fetch кроме allowlist |
| Webhook replay    | eventId + table `webhook_events`     |
| Tenant Escape     | `requireTenant` + `search_path`      |
| JSON pollution    | `express.json({ strict:true })`      |
| Open Redirect     | белый список returnUrl               |
| DOS через webhook | raw-body + early exit                |

---

# ✅ Definition of Done (DoD)

- ✅ ENV-валидация с Zod, сервер не стартует без переменных
- ✅ Все JWT имеют TTL, jti, role, поддержку rotation
- ✅ Супер-админ API изолирован: другой ключ, CORS, rate-limit
- ✅ `requireTenant` не даёт читать чужие данные
- ✅ CORS и CSP настроены, Helmet включён
- ✅ Webhooks идемпотентны
- ✅ Audit-лог пишет события
- ✅ `/healthz` и `/readyz` реализованы
- ✅ README не содержит секретов

---

# 📌 Claude Hints (как воспринимать этот скилл)

Когда разработчик пишет:

> «проверь безопасность API»
> «добавь rate-limit на логин»
> «сделай audit log при создании tenant»
> «добавь healthz + readyz»

→ Claude **должен использовать этот skill** и вносить правки по чеклисту.
