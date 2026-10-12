---
id: GS-002
title: "Секрет TELEGRAM_WEBHOOK_SECRET не прописан: привязка Telegram и реакции не работают"
status: blocked
size: S
area: telegram
priority: 2
blocked_by:
  - "kami: нужна ли привязка Telegram, затем слово на деплой"
owner: ""
stage: ""
source: PLAN.md «12. Открытые вопросы», вопрос 10
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

После фикса fail-open (2026-09-08) вебхук стал fail-closed, а секрет не прописан ни в `.env.docker.enc`, ни в `docker-compose.production.yml`. Привязка Telegram-аккаунта и обработка реакций в проде не работают. Нужно сгенерировать секрет (`openssl rand -base64 32`), прописать в `.env.docker.enc` и в `environment:` compose, переустановить webhook у бота с `secret_token`, задеплоить. Сначала решить, нужна ли ещё эта функция, раз платформа переезжает в преемника.

## Приёмка

- [ ] Решение, нужна ли функция
- [ ] Секрет в `.enc` и compose, webhook переустановлен
- [ ] Привязка и реакции проверены после деплоя

## План

## Журнал

## Итог
