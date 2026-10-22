---
id: TR-001
title: "OIDC-переменные трекера: внести в .env.docker.enc"
status: ready
size: S
area: secrets
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, «Активные задачи», пункт `/sync-env OIDC vars`
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Переменные `BETTER_AUTH_OIDC_ISSUER` и OIDC client ID/secret добавлены на s2 вручную, но в локальный `.env.docker.enc` не попали: следующий деплой с расшифровкой перезапишет серверный файл и вход сломается. Команда `/sync-env` устарела (см. `.claude/rules/env-files.md`): значения взять из серверного окружения, записать через `scripts/sops-env-set.sh animatrona-tracker docker <KEY> <VALUE>`. Секреты OIDC-клиентов общие с Ключницей, новые не генерировать.

## Приёмка

- [ ] Три значения в `.env.docker.enc`
- [ ] Сверка с сервером: расхождений нет

## План

## Журнал

## Итог
