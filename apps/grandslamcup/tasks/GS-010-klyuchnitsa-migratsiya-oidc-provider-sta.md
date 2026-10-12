---
id: GS-010
title: "Ключница: миграция oidc-provider, state mismatch и возврат в исходное приложение"
status: idea
size: M
area: auth
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md Фаза 6, группа E, пункты 23, 24, 25
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Три связанных пункта группы E по входу через auth-hub. (1) Миграция плагина `oidc-provider` на `@better-auth/oauth-provider` (deprecation в логах, плагин уберут в следующем мажоре Better Auth). (2) Ошибка `state_security_mismatch` при OAuth callback в проде: cookie domain, `sameSite`, обрыв сессии. (3) После входа через Google пользователь попадает в Ключницу, а не в исходное приложение. Сначала сверить актуальность с `apps/auth-hub` и его очередью, работа может уже идти там.

## Приёмка

- [ ] Сверено с очередью auth-hub, дубли закрыты
- [ ] Если актуально: каждая из трёх проблем исправлена или заведена в auth-hub

## План

## Журнал

## Итог
