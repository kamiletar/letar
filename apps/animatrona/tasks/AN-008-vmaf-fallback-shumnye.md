---
id: AN-008
title: VMAF-фоллбэк на шумных источниках
status: idea
size: M
area: transcode
priority: 3
blocked_by: []
owner: ""
stage: ""
source: "PLAN.md «NVENC: временной фильтр» и «VMAF-фоллбэк»"
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Фиксированный VMAF 95 на зашумлённом мастере может дать AV1 больше источника. Решение по пользователю: повтор на пониженном VMAF без предсказаний. Сначала пересчитать `estimatedSavings` на старых мастерах с `-tf_level 4`.

## Приёмка

- [ ] Оценка `estimatedSavings` с `-tf_level 4`
- [ ] Решение: нужен ли повтор на VMAF 92

## План

## Журнал

## Итог
