# Email Canary

Периодический мониторинг реальной доставки email (Этап 0.7 корневого `PLAN.md`) — первопричина
всей ветки авторизации была в недоставке писем (Maddy), этот скрипт следит, чтобы регрессия не
повторилась незаметно.

## Что делает

`canary.ts` отправляет тестовое письмо через боевой SMTP (Maddy) на внешний ящик (Яндекс),
опрашивает IMAP этого ящика до появления письма с уникальным маркером в теме
(`[letar-canary] canary-<timestamp>-<random>`) или до таймаута. При провале (не пришло за
`CANARY_TIMEOUT_MS`) — алертит в Telegram через прокси (`api.telegram.org` заблокирован на
s1/s2, поэтому `TELEGRAM_API_ROOT` указывает на `tg-proxy.letar.best`).

## Запуск

Через cron на хосте, `docker compose run` (не постоянный сервис — `restart: 'no'`):

```bash
*/15 * * * * cd /home/deploy/letar/infra/canary && docker compose -f docker-compose.production.yml run --rm canary
```

Секреты (`SMTP_PASSWORD`, `CANARY_IMAP_PASSWORD`, `TELEGRAM_ALERT_BOT_TOKEN`,
`TELEGRAM_ALERT_CHAT_ID`) — в `.env` рядом с `docker-compose.production.yml` (не коммитятся).
Остальные переменные см. докстринг `canary.ts` — большинство со значениями по умолчанию.

## Ручной прогон / отладка

```bash
cd infra/canary
DATABASE_URL= SMTP_HOST=mail.letar.best SMTP_USER=noreply@letar.best SMTP_PASSWORD=... \
  CANARY_IMAP_PASSWORD=... TELEGRAM_ALERT_BOT_TOKEN=... TELEGRAM_ALERT_CHAT_ID=... \
  bun run canary.ts
```

Контейнер монтирует весь репозиторий read-only (`/home/deploy/letar:/app:ro`) и запускает
`bun run /app/infra/canary/canary.ts` — не пересобирается отдельным Dockerfile, использует
`oven/bun:1-alpine` напрямую.
