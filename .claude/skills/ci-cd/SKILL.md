---
name: ci-cd
description: "GitHub Actions + PM2: миграции, деплой server+worker, reindex post-deploy, Nginx кэш-заголовки и SPA fallback."
tags: ["devops","pm2","github-actions","nginx"]
---

# Что делать
1) Actions (dev/prod environments):
   - lint, type-check, build, prisma migrate (core), rsync,
   - pm2 reload --update-env (server, worker),
   - post-deploy: reindexTenant --all (через API/скрипт).
2) PM2 ecosystem: процессы server и worker, log_date_format, instances:"max".
3) Nginx:
   - HTML/SPA → Cache-Control: no-store,
   - /assets/* → immutable, max-age=31536000,
   - try_files $uri /index.html;.

# DoD
Деплой без даунтайма; данные/индекс прогрет; кэш настроен правильно.
