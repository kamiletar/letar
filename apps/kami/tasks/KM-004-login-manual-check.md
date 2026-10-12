---
id: KM-004
title: Ручная проверка входа «Войти» после деплоя
status: blocked
size: S
area: acceptance
priority: 3
blocked_by:
  - "kami: войти через форму и подтвердить"
owner: ""
stage: ""
source: PLAN.md конец файла, открытый вопрос про вход
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Вход после деплоя `922a2d97b` не подтверждён вручную: секрет в контейнере совпадает с хабом, ошибок в логе нет. При повторе `?error=invalid_code` см. `.claude/docs/oidc-client-secret-drift-invalid-code.md`. Вход через Google не настроен: `AUTH_GOOGLE_ID` и `AUTH_GOOGLE_SECRET` пусты в каждой сборке; решить, нужен ли.

## Приёмка

- [ ] Вход пройден вручную
- [ ] Решение про вход через Google

## План

## Журнал

## Итог
