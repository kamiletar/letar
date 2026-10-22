---
id: AH-009
title: ContextError в Toolbar приложения time
status: ready
size: S
area: time
priority: 4
blocked_by: []
owner: ""
stage: ""
source: "PLAN.md «Открытый вопрос: ContextError в apps/time Toolbar»"
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Не связано с OIDC-миграцией: `useContext returned undefined… forgot to wrap in ChakraProvider` в `apps/time/src/app/_components/toolbar.tsx`, хотя `providers.tsx` и `[locale]/layout.tsx` оборачивают Toolbar в `ChakraProviders`. Причину беглый просмотр не нашёл. Относится к проекту time, а не к Ключнице.

## Приёмка

- [ ] Причина найдена, ошибка устранена

## План

## Журнал

## Итог
