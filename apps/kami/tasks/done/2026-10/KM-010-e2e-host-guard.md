---
id: KM-010
title: Устранить блокировку E2E графом MugCup перед деплоем
status: done
size: S
area: infra
priority: 1
blocked_by: []
owner: kami-dev
stage: ""
source: ""
created: 2026-10-19
updated: 2026-10-19
closed: 2026-10-19
---

## Что и зачем

Полный staging gate Kami падает до тестов: Nx импортирует конфиг MugCup,
который проверяет чужой BASE_URL на верхнем уровне модуля.

## Приёмка

- Импорт конфига безопасен при любом BASE_URL.
- Реальный запуск MugCup разрешён только на прежнем списке staging/локальных адресов.
- Проверяются итоговые адреса всех Playwright-проектов.

## План

1. Зафиксировать регрессию импорта и блокировку production тестами Node.
2. Перенести проверку в globalSetup без расширения разрешённых адресов.
3. Проверить граф Nx, тесты и типы, опубликовать submodule и root SHA.
4. Повторно запросить деплой Kami через deploy-agent-dev.

## Журнал

## Итог

Host guard перенесён в globalSetup, сохранена блокировка production и проверяются адреса всех проектов. 12 регрессий, Nx graph с чужим BASE_URL, lint и typecheck пройдены. Submodule 41d4eb1 опубликован; повторный деплой Kami запрашивается после root push.
