---
id: FM-004
title: "Паритет Select/Combobox в forms-vue, forms-vue-shadcn, forms-angular: этап 4 (Combobox)"
status: ready
size: L
area: forms
priority: 2
blocked_by: []
owner: ""
stage: ""
source: libs/forms/PLAN.md Backlog 2026-09-27 «Паритет Select/Combobox», этап 4
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Приоритет поднят владельцем: публикация в npm требует полного паритета. Select (этап 3) закрыт во всех трёх пакетах. Combobox: `forms-vue-shadcn` готов частично (4a–4d: рендер, `loadOptions`, `onCreate`/`onUpdate`/`pending`, `dependsOn`, версия 0.24.0), в `forms-vue` и `forms-angular` нет клавиатурной навигации и позиционирования. План согласован координатором: 12 подэтапов 4a–4l, порядок `forms-vue-shadcn` → `forms-vue` → `forms-angular`, потребителей Combobox на Vue и Angular в монорепо пока нет. Перед стартом сверить с `git log -- libs/forms-vue-shadcn` и `CHANGELOG` пакетов, как далеко ушли. Резать на задачи по пакетам при старте.

## Приёмка

- [ ] `Field.Combobox` в трёх пакетах: `renderOption`, `loadOptions`/`loadSelected`, `onCreate`/`onUpdate`/`pending`, `dependsOn`, клавиатура и позиционирование
- [ ] Тесты по каждому пакету, версии, CHANGELOG
- [ ] Документация `docs/fields.md` и form-docs обновлены, матрица паритета верна

## План

## Журнал

## Итог
