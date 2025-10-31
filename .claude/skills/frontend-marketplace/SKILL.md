---
name: frontend-marketplace
description: "UI под новый бэкенд: маршруты /superadmin/*, /admin/*, /marketplace; apiClient с Bearer; онбординг продавца."
tags: ["frontend","react","vite"]
---

# Что делать
1) Роутинг:
   - /superadmin/login, /superadmin/tenants, /superadmin/plans
   - /admin/login, /admin/onboarding
   - /marketplace (search), /marketplace/shops/:slug
2) apiClient: Bearer из хранилища, перехват 401.
3) Убрать Telegram SDK; чистый браузерный UI.
4) Onboarding: логотип → подключение крипто-провайдера → 1-й товар → заявка в маркетплейс.

# DoD
Страницы подключены, поиск работает, супер-админ управляет листингом.
