---
id: AH-006
title: "TELEGRAM_WEBHOOK_SECRET в проде: вход через Telegram сейчас не работает"
status: blocked
size: S
area: security
priority: 2
blocked_by:
  - "kami: решить, нужен ли вход через Telegram, и дать токен бота"
owner: ""
stage: ""
source: "PLAN.md «Открытый вопрос: TELEGRAM_WEBHOOK_SECRET не настроен в проде»"
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

После фикса fail-open проверка вебхука закрывается по умолчанию, а секрета нет ни в `.env.docker.enc`, ни в `docker-compose.production.yml`, значит вход через Telegram в проде не работает. Нужно: сгенерировать секрет (`openssl rand -base64 32`), записать через `scripts/sops-env-set.sh`, добавить строку в `environment:` compose, переустановить webhook у бота с `secret_token`, выпустить через `deploy-agent-dev`.

## Приёмка

- [ ] Секрет в `.env.docker.enc` и compose
- [ ] Webhook переустановлен с `secret_token`
- [ ] Вход через Telegram проверен

## План

## Журнал

## Итог
