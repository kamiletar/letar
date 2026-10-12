---
id: FM-017
title: Push forms 2.38.2 и ответы заявителям (flora FL-034, domwellbes DW-016/parseActionInput)
status: blocked
size: S
area: ""
priority: 2
blocked_by:
  - "kami: одобрить git push (локально 38 коммитов, FM-001/013/014/015/016)"
owner: ""
stage: ""
source: сессия forms-coordinator 2026-10-13
created: 2026-10-13
updated: 2026-10-13
---

## Что и зачем

forms-dev закрыл FM-001, 013, 014, 015, 016 (`@letar/forms` 2.38.2), всё локально, push не делали.
После одобрения push: ответить `flora-dev-refusal` (тред `flora-fl-034-select-modal`: обход hidden
больше не нужен, рецепт в `docs/fields.md`) и `domwellbes-dev` (треды `forms-steps-indicator-mobile`
и `forms-parse-action-input-2026-09-27`: версия вышла, e2e на подписи шагов могут упасть, локальную
копию `parseActionInput` можно заменить импортом). Затем `deploy-request: form-docs` к
`deploy-agent-dev`. `bun.lock` отстаёт на 5 пакетов, чинить только в чистом дереве.

## Приёмка

## План

## Журнал

## Итог
