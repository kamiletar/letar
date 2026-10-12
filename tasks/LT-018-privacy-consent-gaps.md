---
id: LT-018
title: "152-ФЗ: `/privacy`, cookie-баннер и `ConsentLog` в приложениях без них"
status: ready
size: L
area: compliance
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN.md Этап 0.8 (строки 458–605)
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Аудит 2026-07-28 нашёл пробелы по чек-листу [personal-data](/.claude/docs/personal-data.md): у двух приложений баннер ведёт на несуществующий `/privacy`; пять приложений собирают email без баннера или `/privacy`; шесть аналитических приложений без cookie-уведомления. Пофайловый список в Этапе 0.8 `PLAN.md`.

## Приёмка

- [ ] Все `CookieBanner` ведут на существующую `/privacy`
- [ ] Приложения с email имеют `/privacy`, баннер и `ConsentLog`
- [ ] Аналитика грузится только после согласия
- [ ] Чекбоксы согласия не предотмечены
- [ ] `deleteAccountAction` в приложениях с аккаунтами

## План

## Журнал

## Итог
