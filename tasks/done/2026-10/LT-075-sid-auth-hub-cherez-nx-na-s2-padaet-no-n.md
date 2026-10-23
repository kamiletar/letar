---
id: LT-075
title: "Сид auth-hub через Nx на s2 падает: no name provided в scripts/npm-smoke"
status: done
size: M
area: infra
priority: 3
blocked_by: []
owner: repo-dev
stage: ""
source: LT-073
created: 2026-10-23
updated: 2026-10-23
closed: 2026-10-23
---

## Что и зачем

При запуске сида auth-hub через Nx на s2 граф проектов падает: `scripts/npm-smoke/{vite-app,zenstack-app,next-app}: no name provided`. Локально те же package.json в git с полем `name`, и Nx их видит. Значит, на s2 эти файлы отличаются от коммита (остаток прогона smoke или старый checkout). Smoke-фикстуры живут «вне монорепо», в графе Nx им делать нечего.

## Приёмка

- Сид auth-hub через Nx на s2 проходит без ошибки графа.
- `nx show projects` не показывает npm-smoke-*.

## План

1. `scripts/npm-smoke` в `.nxignore` (сделано, b51587867).
2. После следующего деплоя проверить запуск сида через Nx на s2; если ошибка осталась, посмотреть `git status` и package.json в этих каталогах на s2.

## Журнал

## Итог

Причина на s2 не подтверждена: имена во всех package.json в scripts/npm-smoke на месте. Обход: scripts/npm-smoke в .nxignore, после него Nx на s2 строит граф (149 проектов, у auth-hub виден db:seed). Сам запуск сида через Nx не проверен: сделать при следующем деплое auth-hub с --seed (в логе Done: 10 clients seeded).

## Проверка (2026-10-23, позже)

Деплой auth-hub с `--seed` на s2: `nx run auth-hub:db:seed` отработал штатно, `Done: 10 clients seeded`, ошибок графа проектов нет. Живой вход на pages после нового сида работает.
