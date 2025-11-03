✅ ./CLAUDE.md — Project Memory (FINAL 2025 Standard)

## 📌 Standard-2025: Non-Negotiables (Seed / Multitenant SaaS)

- Runtime: Node.js (ESM) + TypeScript.  
  ⛔ Запрещено: require(), CommonJS, .js в src/, mixed modules.
- Build: backend → dist/, frontend (Vite) → web-dist/ → копия в dist/public/.
- Server runs **only from dist/**: `node dist/server.js`.
- Frontend = pure SPA.  
  ⛔ Запрещено: SSR, EJS, Handlebars, res.render, view engine.
- Любые данные тенанта → только через `req.db` (tenant-scoped PrismaClient).  
  ⛔ Прямые `prisma.*` вызовы запрещены.
- Глобальный PrismaClient допустим только для `public.*` (shared registry).
- Тенанты: реестр в `public.tenants`, данные в отдельных схемах `t_{uuid}`.  
  search_path = `"t_{uuid}", public`.
- UUID строго `uuid_generate_v4()` (⛔ запрещён `gen_random_uuid()`).
- Никакие секреты/ключи/токены не выводятся в логи, CI, PR, терминал.

---

## 🧩 Middleware Contract (strict order)

Correct order in server.ts:

1. express.json()
2. rateLimiter
3. setTenantContext
4. attachTenantDB
5. storefrontRouter (robots.txt, sitemap.xml)
6. express.static('dist/public')
7. SPA fallback → `res.sendFile(...)`

⚠️ `attachTenantDB`:
```ts
// Creates PrismaClient scoped to tenant
// SET search_path TO "t_xxxxx", public;
// attaches to req.db
// closes automatically on response finish

⛔ Запрещено ставить search_path внутри DAO-функций. Только middleware.

⸻

🗄️ Database Contract

Shared (public.*)
	•	public.tenants — список всех магазинов
	•	public.superadmin_* — служебные таблицы
	•	business data не хранится в public

Per-tenant (t_{uuid}.*)

Table	Purpose
products	catalog
product_variants	SKUs
prices	pricing
inventory	stock qty
customers	users per store
orders	order header
order_items	order lines
store_settings	per-tenant config
outbox	async events

DAO-функции имеют сигнатуру:

export async function createOrder(db: PrismaClient, payload: OrderInput) {}

⛔ Никаких import prisma from ... внутри DAO.

⸻

🔎 SEO Contract (per tenant)

Endpoint	Content-Type	Notes
/robots.txt	text/plain; charset=utf-8	disallow or allow per tenant
/sitemap.xml	application/xml; charset=utf-8	full tenant canonical URLs

	•	Без tenant → 404 + правильный Content-Type (не SPA fallback).

⸻

🛡️ CI Gate (blocking)

Перед деплоем выполняется scripts/verify_standard.sh:

✅ build dist ok
✅ /health returns 200
✅ grep-проверки:

❌ no direct "prisma."
❌ no "new PrismaClient" outside multitenancy
❌ no "res.render" / "view engine"

✅ robots/sitemap headers корректны
✅ никакие ключи/токены не попадают в вывод

⸻

🛠 Prod Invariants & Deploy Guardrails

1) Порты/прокси
   • PROD NGINX проксирует backend на фиксированный порт (сейчас: 3001).  
   • ⛔ Запрещено менять PORT в PM2/ecosystem.* без проверки NGINX upstream и его синхронизации.  
   • Если требуется изменить порт — сначала PR с RFC и миграционный план: (а) правка NGINX, (б) перезагрузка NGINX, (в) смена PORT в PM2, (г) проверка /health.

2) Пути до статики
   • Backend отдаёт SPA только из `dist/public/`. Абсолютный путь на сервере: `/var/www/telegram-shop/dist/public` (dev: `/var/www/telegram-shop-dev/dist/public`).  
   • ⛔ Любые ссылки вида `/var/public/index.html` — ошибка конфигурации.  
   • PM2 должен запускать `dist/server.js`, а не файлы из `src/`.

3) Build/Sync
   • Перед деплоем: `pnpm build` (server) и Vite build (client) → результат копируется в `dist/public`.  
   • Синхронизация на сервер: только содержимое `dist/`.

4) Проверки после деплоя (обязательные)
   • `curl -s -o /dev/null -w "HTTP %{http_code}" https://<host>/health` → HTTP 200  
   • `curl -I https://<host>/robots.txt` → `Content-Type: text/plain`  
   • `curl -I https://<host>/sitemap.xml` → `Content-Type: application/xml`  
   • Наличие файла на сервере: `/var/www/<app>/dist/public/index.html`.

5) Авто-откаты
   • Если после изменений /health ≠ 200 или статика отсутствует — немедленный откат PR (revert) и возврат прежнего порта/конфига.

⸻

✅ Definition of Done (Stage 1)
	•	t_{uuid} схемы созданы (demo, testshop) и изолированы
	•	storefront выдаёт разные товары на demo.x-bro.com и testshop.x-bro.com
	•	middleware req.db активен и используется всей storefront-логикой
	•	robots.txt + sitemap.xml корректны per-tenant
	•	PM2 сервер работает из dist/, не из src/
	•	grep-проверки зелёные, CI gate включён

⸻

🚫 Anti-Patterns (автоматически отклоняются)
	•	res.render, views/, .ejs, .hbs
	•	import prisma from "../database"
	•	new PrismaClient() внутри функций
	•	app.use(express.static(...)) перед SEO-роутами
	•	временные решения “потом перепишем”
	•	кэширование sitemap/robots на глобальном уровне
	•	прямой console.log секретов/env
	• изменение PORT в PM2/ecosystem.* без проверки/синхронизации с NGINX
	• использование путей вида /var/public/* вместо /var/www/<app>/dist/public

⸻

🧠 Claude Rules
	1.	Любая задача → PLAN → DIFF → VERIFY → REPORT.
	2.	Если что-то нарушает Standard-2025 — сначала фикс стандарта, потом задача.
	3.	Если требуется “быстро” vs “правильно” → выбирается “правильно”.
	4.	Любое изменение, трогающее core архитектуру, оформляется как RFC перед правкой.
	5.	Claude запрещено предлагать костыли, SSR, EJS, обходы middleware, “временно”.
	6.	Если Claude сомневается — она должна спросить, не предполагать.
