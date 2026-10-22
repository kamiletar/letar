---
id: FM-030
title: Опубликовать @letar/forms 3.0.1 (типизация Field.Auto)
status: blocked
size: S
area: release
priority: 3
blocked_by:
  - "kami: решение о публикации в npm"
owner: ""
stage: ""
source: "сессия обновления зависимостей, 2026-10-22"
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

В репо `libs/forms/package.json` = 3.0.1, в CHANGELOG есть секция 3.0.1 (Fixed): типизация
`AppForm.Field.Auto` совпадает с рантайм-компонентом `FieldAuto` (коммит `6eb5229a1`). В npm
опубликована 3.0.0. Публикация forms — только по слову владельца
([[project_forms_npm_publish_after_domwellbes_trial]]); перед выпуском сверить номер с
итогами FM-003.

## Приёмка

- Тег `forms-v3.0.1`, CI `publish-npm.yml` зелёный, `npm view @letar/forms version` = 3.0.1.

## План

## Журнал

## Итог
