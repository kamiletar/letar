---
id: LT-078
title: Устранить audit-находку Zod 3 у Chakra CLI и Jimp
status: ready
size: M
area: security
priority: 2
blocked_by: []
owner: ""
stage: ""
source: GHSA-mrhx-c7xc-m3w5
created: 2026-10-24
updated: 2026-10-24
---

## Что и зачем

После LT-077 audit оставляет одну high-находку GHSA-mrhx-c7xc-m3w5:
Zod 3.25.76 у @chakra-ui/cli и пакетов Jimp. Ветка Zod 4 обновлена до 4.6.7.
Глобальная подмена Zod 3 на 4 несовместима с API потребителей.

## Приёмка

- Устранена находка без несовместимой глобальной подмены API Zod 3 на 4.
- Проверены CLI Chakra и обработка изображений Jimp в label-printer-core.
- bun audit больше не показывает GHSA-mrhx-c7xc-m3w5 либо есть подтверждённое
  upstream исправление advisory с доказательством неприменимости.

## План

1. Проверить релизы Chakra CLI/Jimp и наличие исправления/backport Zod 3.
2. Мигрировать потребителей на поддерживаемые версии или заменить зависимости.
3. Выполнить профильные тесты и повторить аудит.

## Журнал

## Итог
