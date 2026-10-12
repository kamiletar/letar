---
id: AN-010
title: CPU-фоллбэк VideoPool после краша NVENC игнорирует кодек профиля
status: blocked
size: S
area: transcode
priority: 3
blocked_by:
  - "kami: решить: баг это или намеренное поведение"
owner: ""
stage: ""
source: PLAN.md «Открытые задачи»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

`buildSvtAv1Args` (`main/services/pools/video-pool.ts`) всегда кодирует в `libsvtav1`, даже если профиль HEVC или H.264. Легаси-путь корректно маппит на `libx265`/`libx264`. Неясно, баг это или намеренно (не менять формат на лету). Решение за владельцем.

## Приёмка

- [ ] Решение: маппить кодек или оставить AV1
- [ ] Тест на выбранное поведение

## План

## Журнал

## Итог
