---
id: NB-001
title: Вход на staging не возвращает в блокнот
status: ready
size: M
area: auth
priority: 1
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, Этап 1, открытый вопрос
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

2026-10-06: Kami входит в Ключницу, а редиректа обратно в блокнот нет. Клиент `notebook-prod` настроен так же, как у kami, studio и time; redirect URI для `notebook-stage` добавлен. Искать расхождение: issuer и `OIDC_DISCOVERY_URL` (путь `/api/auth/.well-known/openid-configuration`), cookie `__Secure-`, redirect URI, state. Помогает `.claude/docs/oidc-client-secret-drift-invalid-code.md`. Решить сперва, иначе все ручные проверки редактора и офлайна невозможны.

## Приёмка

- [ ] Причина найдена и устранена
- [ ] Вход со staging возвращает в блокнот

## План

## Журнал

## Итог
