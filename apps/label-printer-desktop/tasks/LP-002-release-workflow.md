---
id: LP-002
title: "CI-workflow релиза: загрузка latest.yml и .blockmap"
status: ready
size: M
area: release
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, «Баг-фиксы», «Автообновление»
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Нужен `release-label-printer-desktop.yml` по образцу `release-animatrona-folder-player.yml`, но с загрузкой `latest.yml` и `.blockmap` (эталон их не грузит, для автообновления этого мало). Сейчас релиз вручную: `nx build:win`, переименовать ассеты под дефисы из `latest.yml`, `gh release create label-printer-desktop-vX.Y.Z <exe> <exe.blockmap> <latest.yml>`; тег `label-printer-desktop-v<semver>`. Подробности — `.claude/docs/electron-monorepo-shared-releases.md`. Запуск workflow и публикация релиза только по слову владельца.

## Приёмка

- [ ] Workflow собирает и грузит все три файла
- [ ] Пробный релиз прошёл автообновление

## План

## Журнал

## Итог
