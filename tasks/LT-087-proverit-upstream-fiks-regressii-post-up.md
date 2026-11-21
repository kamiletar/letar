---
id: LT-087
title: Проверить upstream-фикс регрессии post-update ZenStack
status: ready
size: M
area: security
priority: 1
blocked_by: []
owner: ""
stage: ""
source: LT-086
created: 2026-11-21
updated: 2026-11-21
---

## Что и зачем

ZenStack 3.10.3 разрешил смену User.platformRole null → OPERATOR несмотря на
@@deny('post-update', ... before().platformRole != platformRole). На той же БД
и схеме 3.9.8 отклоняет запрос, роль остаётся null. В LT-086 семейство закреплено
на 3.9.8 вместе с overrides/resolutions.

## Приёмка

- Upstream-версия отклоняет неразрешённую смену nullable роли и сохраняет строку.
- Разрешённое обновление работает; интеграционные тесты политик Flora проходят.
- Пины семейства и overrides сняты согласованно, реестр intentional-pins обновлён.

## План

1. Проверить changelog/исправление upstream и воспроизведение на новой версии.
2. Прогнать policies.int.spec.ts, typecheck и основные потребители ZenStack.
3. Снять пины одним коммитом только после успешной проверки.

## Журнал

- 2026-11-21: сравнительное репро 3.9.8/3.10.3, временные записи удалены в finally.
  Разбор: .claude/docs/zenstack-post-update-null-comparison-regression.md.

## Итог
