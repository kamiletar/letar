---
id: AN-003
title: Сохранять `.torrent`, magnet и infoHash в раздаче и расширить `sourceDoc`
status: ready
size: M
area: ipfs
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN_ANIMATRONA_ECOSYSTEM.md §21.5
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Сейчас торрент-источник теряется. Для каждого аниме сохранять `.torrent`, `magnetURI`, `infoHash`; расширить `sourceDoc` в `anime-directory-builder.ts`; для тайтлов не с торрента записывать оригинальные имена и размеры файлов.

## Приёмка

- [ ] Три поля источника лежат в раздаче
- [ ] `sourceDoc` расширен, тест на сборку директории
- [ ] Тайтлы без торрента получают имена и размеры исходных файлов

## План

## Журнал

## Итог
