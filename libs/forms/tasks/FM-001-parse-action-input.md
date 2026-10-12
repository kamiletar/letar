---
id: FM-001
title: parseActionInput в forms-core/server-errors
status: ready
size: S
area: forms
priority: 2
blocked_by: []
owner: ""
stage: ""
source: libs/forms/PLAN.md Backlog 2026-09-27 «parseActionInput»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Хелпер `parseActionInput(schema, input, fallbackMessage)` (safeParse + `actionFailure` по первой ошибке) живёт локально в одном приложении. `ActionFailure` объявлен единственным контрактом server actions, остальным приложениям хелпер недоступен и его копируют руками. Перенести в `libs/forms-core/src/lib/server-errors/action-failure.ts` рядом с `actionFailure` и `catchActionFailure`, экспортировать через `@letar/forms/server-errors`. Сигнатура и поведение 1:1 с локальной версией.

## Приёмка

- [ ] Функция в `forms-core`, экспорт через `server-errors` и `@letar/forms/server-errors`
- [ ] Тест: валидный ввод, ошибка с путём поля, ошибка без пути (берётся `fallbackMessage`)
- [ ] Версии forms-core и forms, запись в CHANGELOG, `docs/` обновлены
- [ ] Локальную копию в приложении заменяет его владелец отдельной задачей

## План

## Журнал

## Итог
