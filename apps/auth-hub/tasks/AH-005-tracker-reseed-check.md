---
id: AH-005
title: Подтвердить re-seed боевой Ключницы для порта animatrona-tracker
status: ready
size: S
area: oidc
priority: 2
blocked_by: []
owner: ""
stage: ""
source: "PLAN.md «Открытый вопрос: re-seed боевого auth-hub для порта animatrona-tracker»"
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Seed (v0.7.23) исправлен, `deploy-request` с `seed: true` отправлен 2026-09-22. Проверить через letar-db, что у клиента `animatrona-tracker-prod` в `redirectUrls` есть `http://localhost:3009/sign-in`. Побочно: в seed нет localhost-варианта `/api/auth/callback/letar-auth` для этого клиента (у других есть) — решить, нужен ли для локального входа в трекер.

## Приёмка

- [ ] `redirectUrls` проверены
- [ ] Решение про callback для localhost

## План

## Журнал

## Итог
