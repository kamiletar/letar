---
id: FP-005
title: "libmedia, Э1–Э7: переход на движок и снятие ffmpeg"
status: idea
size: L
area: libmedia
priority: 2
blocked_by:
  - FP-004
owner: ""
stage: ""
source: PLAN.md §23.2–§23.10
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Остальные этапы §23 по таблице §23.9. Э1 wasm в `renderer/public/libmedia/` (плеер стартует офлайн, ноль запросов к CDN). Э2 `parseFontFamilyNames` и `registerAssFonts` (надписи совпадают с эталоном). Э3 обёртка над `AVPlayer` (тест: `seek` приводит к BigInt). Э4 `LibmediaVideoPlayer` за флагом. Э5 внешняя озвучка на новых часах. Э6 встроенные субтитры без SubtitlesOctopus. Э7 снять ffmpeg, не раньше. Резать на задачи по этапам после Э0. Не встраивать mpv в окно (§20.3). ffmpeg до Э7 не удалять.

## Приёмка

- [ ] Каждый этап нарезан на задачу после результата Э0
- [ ] Серия играет целиком на новом движке, дорожки, субтитры и главы переключаются
- [ ] ffmpeg снят, `build:win` собирается

## План

## Журнал

## Итог
