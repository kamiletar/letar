---
id: AN-004
title: "Полнота `directoryCid`: прогон по всем `*Cid`, субтитрам, шрифтам и данным пользователя"
status: ready
size: M
area: ipfs
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN_ANIMATRONA_ECOSYSTEM.md §21, §23.1; PLAN.md «Аудит directoryCid»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Систематический обход: каждая модель с `*Cid`-полем, всё читаемое из исходника (дорожки, шрифты, главы, теги, вложения), изображения, `isForced` и `SubtitleType`. Пользовательские данные (`WatchProgress`, `watchStatus`, `userRating`) не должны попадать в раздачу. Раздача должна открываться на голом гейтвее без Animatrona.

## Приёмка

- [ ] Таблица «сущность → попадает ли в `directoryCid`» заполнена
- [ ] Пользовательские данные не протекают (тест)
- [ ] `<gateway>/ipfs/<cid>/play/` открывается для одного тайтла без приложения

## План

## Журнал

## Итог
