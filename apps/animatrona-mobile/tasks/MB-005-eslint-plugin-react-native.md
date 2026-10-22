---
id: MB-005
title: Правила eslint-plugin-react-native недоступны на ESLint 10
status: blocked
size: S
area: lint
priority: 4
blocked_by:
  - "upstream: версии плагинов с поддержкой ESLint 10"
owner: ""
stage: ""
source: "PLAN.md «Долг: правила eslint-plugin-react-native»"
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

`eslint-plugin-react-native@5.0.0` и `eslint-plugin-eslint-comments@3.2.0` (через пресет `@react-native/eslint-config/flat`) роняют весь прогон на ESLint 10: `context.getSourceCode is not a function`. Сейчас правила отключены. Вернуть, когда выйдут совместимые версии, либо заменить аналогами.

## Приёмка

- [ ] Правила React Native снова работают в lint

## План

## Журнал

## Итог
