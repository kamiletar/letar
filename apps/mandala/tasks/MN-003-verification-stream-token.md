---
id: MN-003
title: "verification-stream: ключ по email в URL заменить на streamToken"
status: ready
size: S
area: security
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, открытый вопрос 2026-09-14
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

`api/auth/verification-stream/[email]/route.ts` (polling для второй вкладки при регистрации) ключуется по email прямо в URL, а не по непубличному `streamToken` из `TokenManagerAdapter` (`@letar/pin-auth`). Отвечает только `{verified: boolean}`, но подбором email можно узнавать факт верификации чужой почты. Низкий приоритет. Образец — `apps/driving-school/src/app/(auth)/_adapters/stream-tokens.ts`.

## Приёмка

- [ ] Ключ потока — `streamToken`, email не в URL
- [ ] Тест

## План

## Журнал

## Итог
