---
name: tenancy-setup
description: 'Внедрить schema-per-tenant (Postgres/Prisma): схемы t_{id}, переключение search_path, createTenant(slug), базовый CRUD.'
tags: ['backend', 'prisma', 'postgres', 'multitenancy']
---

# Цель

Перевести проект на schema-per-tenant: core(public) + t\_{tenantId} (данные магазина).

# Что делать

1. Добавить:
   - server/src/multitenancy/tenant-context.ts — определить tenant по поддомену или заголовку X-Tenant; положить {tenantId, tenantSchema} в req.context.
   - server/src/multitenancy/middleware.ts — перед каждым запросом к БД: `SET search_path TO t_{id}, public`.
   - server/src/db/tenants.ts — `createTenant(slug)` создаёт запись в public.tenants, схему t\_{id} и таблицы: products, product_variants, prices, inventory, customers, orders, order_items, outbox.
2. Обновить /api/superadmin/tenants (POST → createTenant, GET → список).
3. CLI: `npm run create:tenant <slug>`.

# Правила

- Все секреты только через server/src/config/env.ts (Zod).
- Любой доступ к БД — после установки search_path.
- Тест: запрос без tenant → 403.

# DoD

Схема t\_{id} создаётся; CRUD изолирован; супер-админ создаёт тенант.
