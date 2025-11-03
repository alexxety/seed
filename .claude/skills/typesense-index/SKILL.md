---
name: typesense-index
description: 'Typesense: коллекция marketplace_products, API /api/marketplace/search, индексация после апсерта в aggregator.'
tags: ['search', 'typesense', 'api']
---

# Цель

Поиск <100 мс по товарам маркетплейса.

# Что делать

1. server/src/marketplace/search.ts — клиент Typesense.
2. Коллекция marketplace_products: id, title, vendor, tenantSlug, priceMin, priceMax, stock, tags[], category.
3. Методы upsert/delete/bulk.
4. API: GET /api/marketplace/search?query=&filters=...
5. Хук: после upsert в aggregator обновлять индекс.

# DoD

Поиск работает с фильтрами/сортировками; удаление синхронно убирает из индекса.
