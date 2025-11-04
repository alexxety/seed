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

**Admin Routing (Standard-2025):**
- Admin API endpoints: `/admin/api/*` (NOT `/admin/*`) — all protected routes
- Public endpoints: POST `/admin/login` — authentication
- SPA pages: GET `/admin/*` (except `/admin/api/*`) — serve index.html
- Routing logic: PATH-based only (⛔ no Accept header checks)
- SPA fallback positioned BEFORE auth middleware to allow HTML serving
- This ensures F5 refresh on `/admin/login` returns HTML 200, not JSON 401

---

## 🌍 ENVIRONMENT ISOLATION POLICY (Standard-2025 — authoritative)

**PROD**
- Base domain: `x-bro.com`
- Tenants: `{slug}.x-bro.com`
- Port: 3000
- Database: `seedshop_prod`
- PM2: `telegram-shop-prod`

**DEV**
- Base domain: `dev.x-bro.com`
- Tenants: `{slug}.dev.x-bro.com`
- Port: 3001
- Database: `seedshop_dev`
- PM2: `telegram-shop-dev`

**Rules (must NOT be violated)**
1. 🔥 Нельзя смешивать DEV и PROD в одном доменном пространстве
2. 🔥 Нельзя создавать фейковые slugs типа `dev`, `dev-admin`, `deva`
3. ✅ Tenant slugs в DEV и PROD всегда одинаковые
4. ✅ DEPLOY выполняется только через `scripts/deploy.sh <env>`
5. ✅ VERIFY выполняется так:
   - `npm run verify:prod` → проверяет `*.x-bro.com`
   - `npm run verify:dev` → проверяет `*.dev.x-bro.com`
6. ⛔ В `package.json` запрещено хранить SSH, IP, rsync
7. ⛔ Запрещено automatic APPLY на PROD
8. ⛔ Оба окружения имеют отдельные `.env.*` и `.env.ci.*`
9. ✅ LocalStorage key = `admin-auth-storage:${window.location.host}`
10. ✅ Весь build/deploy запускается из `dist/`, не `src/`
11. ✅ `BASE_DOMAIN` обязателен в `.env.dev` и `.env.prod`

**Required DEV domains:**
- `demo.dev.x-bro.com`
- `myshop.dev.x-bro.com`
- `testadmin.dev.x-bro.com`
- `testshop.dev.x-bro.com`

**After each release:**
- `deploy:dev` → `verify:dev`
- `deploy:prod` → `verify:prod` → CF purge (addressed)

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

🔐 Token Leak Prevention (FAIL on any leak)

### Prohibited in ALL outputs (code, logs, CI, PRs, terminal):
- JWT tokens (full or partial)
- Password hashes (bcrypt, argon2, etc.)
- API keys (OpenAI, Stripe, Telegram, etc.)
- Database credentials (connection strings, passwords)
- Session tokens
- Authorization headers with real values
- Private keys (SSH, SSL, etc.)

### Masking rules (Standard-2025):

```typescript
// ❌ WRONG: Full token exposed
console.log('Token:', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
console.log('Authorization: Bearer', token);

// ✅ CORRECT: Masked token
console.log('Token:', token ? `${token.slice(0, 10)}...[REDACTED]` : 'null');
console.log('Authorization:', '[REDACTED]');
```

```bash
# ❌ WRONG: Token in git commit message
git commit -m "Fix auth with token eyJhbGciOiJIUz..."

# ✅ CORRECT: No sensitive data
git commit -m "Fix authentication flow"
```

### CI verification (MUST pass before deploy):

```bash
# Any token leak = FAIL (not warning)
grep -rE "eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}" dist/ && exit 1

# Password hashes
grep -rE "\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}" dist/ && exit 1

# Connection strings
grep -rE "postgresql://[^:]+:[^@]+@" dist/ && exit 1
```

### Examples of leaks to prevent:
- ❌ Git commits with tokens in messages or diffs
- ❌ Console.log with full JWT tokens
- ❌ Error messages with credentials
- ❌ CI/CD output with secrets
- ❌ Pull request descriptions with keys
- ❌ Test fixtures with real tokens (use mock data)
- ❌ Environment variable values printed to logs

### Enforcement:
- CI gate **blocks merge** if any leak detected
- No exceptions, no "it's just dev token" bypass
- All secrets → .env (never committed)
- All logs → masked values only

⸻

🛠 Prod Invariants & Deploy Guardrails

1) Порты/прокси
   • PROD NGINX проксирует backend на порт 3000, DEV на порт 3001.
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
