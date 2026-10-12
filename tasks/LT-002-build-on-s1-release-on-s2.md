---
id: LT-002
title: "Сборка на s1, релиз на s2: пилоты и тираж"
status: ready
size: L
area: infra
priority: 1
blocked_by: []
owner: ""
stage: ""
source: PLAN-INFRA-7.md §157
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Разрез конвейера написан 2026-09-21 (`deploy-affected.sh --remote-release`, `scripts/deploy-release.sh` на s2, переход по приложениям через `BUILD_ON_S1_APPS`). Осталось запушить, настроить канал релиза, выкатить `dashboard-agent` на s1, провести пилоты и тиражировать на остальные приложения.

## Приёмка

- [ ] Канал релиза s1→s2 настроен владельцем (`scripts/setup-release-channel.sh`)
- [ ] `dashboard-agent` 0.18.1 выкачен на s1
- [ ] Пилоты 1–3 прошли
- [ ] Тираж по `BUILD_ON_S1_APPS` завершён
- [ ] Закрыты открытые вопросы секции (формат таблицы маршрутов, чтение списка из `origin/main`, проверка `Config.Image`, healthcheck у landing)
- [ ] Ретеншн `.nx/cache`, чистка `.next`, `docker builder prune`, корневой `.dockerignore`

## План

## Журнал

## Итог
