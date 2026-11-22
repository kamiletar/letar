---
id: NB-008
title: Исправить CI unit tests без приватных tsconfig references
status: ready
size: S
area: ""
priority: 2
blocked_by: []
owner: ""
stage: ""
source: "CI45051728159: notebook:test vite:oxc TSCONFIG_ERROR — приватный e2e tsconfig отсутствует в публичном checkout"
created: 2026-11-22
updated: 2026-11-22
---

## Что и зачем

В публичном checkout GitHub Actions три suite Notebook не стартуют: branches, outbox,
versions. Vite/OXC при загрузке vitest.setup.tsx обходит ссылку на отсутствующий приватный
e2e tsconfig. Найдено при выпуске forms 3.1.1; ошибка не относится к npm-пакетам форм.
Лог: https://github.com/kamiletar/letar/actions/runs/45051728159

## Приёмка

- Три suite проходят в публичном checkout без инициализации приватных submodule.
- Локальный typecheck Notebook сохраняет корректные project references.
- Общий CI проходит этап Notebook unit tests.

## План

## Журнал

## Итог
