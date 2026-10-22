---
id: AW-007
title: Опубликовать @letar/ui в npm (опционально)
status: blocked
size: M
area: npm
priority: 4
blocked_by:
  - "kami: слово на публикацию в npm"
owner: ""
stage: ""
source: PLAN.md, раздел про библиотеки (Milestone 14 и 17)
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Для Tauri-оболочки Aira не требуется, но даёт форкабельность: чужой фронтенд собирается без клонирования letar. Публикация делает API `@letar/ui` публичным контрактом (141 потребитель в монорепо, переименование станет breaking change), нужен peer-deps и триггер в `publish-npm.yml`. Публикация в npm только по слову владельца и через `ui-coordinator-dev`; также новый пакет с собранным фронтендом для Tauri после Milestone 17.

## Приёмка

- [ ] Решение владельца и координатора libs/ui

## План

## Журнал

## Итог
