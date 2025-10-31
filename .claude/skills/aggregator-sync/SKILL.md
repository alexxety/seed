---
name: aggregator-sync
description: "Outbox в т-схемах → BullMQ воркер → aggregator.* (кэш маркетплейса) с идемпотентностью."
tags: ["backend","queues","bullmq","postgres"]
---

# Цель
Маркетплейс без live-join: события из т-схем складываются в aggregator.

# Что делать
1) В t_{id}: таблица outbox(id uuid, eventType text, payload jsonb, createdAt, processedAt).
2) CRUD товаров пишет события product.created/updated/deleted в outbox.
3) Схема aggregator: shops, products, offers, categories.
4) server/src/marketplace/worker.ts (BullMQ + Redis):
   - батч-вычитка outbox,
   - нормализация и upsert в aggregator.*,
   - processedAt,
   - идемпотентность по outbox.id.
5) Команда: `npm run worker`.

# DoD
Созданный/обновлённый товар появляется/обновляется в aggregator.products; повторные события безопасны; есть reindexTenant(tenantId).
