---
id: KK-007
title: Подписать .exe, чтобы убрать предупреждения антивирусов и SmartScreen
status: idea
size: M
area: release
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN.md «Безопасность»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Антивирусы могут реагировать на `RegisterHotKey` и `SendInput`; сейчас установщик не подписан (в промо-ролике это шутка про SmartScreen). Подпись кода платная и решение за владельцем. Рядом: исключение в Defender для Go-бинарника systray2.

## Приёмка

- [ ] Решение владельца, нужна ли подпись
- [ ] Если да: сертификат и настройка electron-builder

## План

## Журнал

## Итог
