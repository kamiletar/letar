---
id: IP-001
title: "Ручная проверка: запуск в dev и установленного .exe"
status: blocked
size: S
area: acceptance
priority: 3
blocked_by:
  - "kami: запустить dev и установленный .exe"
owner: ""
stage: ""
source: PLAN_TESTING.md «Ручная проверка»; PLAN.md Фаза 1
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

GUI Electron не проверяется в песочнице агента. Нужно вручную: `nx dev animatrona-ipfs-player` (окно открывается, интерфейс реагирует) и установленный `.exe` из `nx build:win` (запускается и работает). Бинарник Kubo в git не лежит: перед сборкой положить в `resources/kubo/win/`.

## Приёмка

- [ ] dev-режим проверен
- [ ] Установленный `.exe` запускается и играет раздачу

## План

## Журнал

## Итог
