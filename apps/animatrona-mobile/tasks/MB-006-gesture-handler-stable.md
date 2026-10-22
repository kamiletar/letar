---
id: MB-006
title: "react-native-gesture-handler: перейти с nightly на stable"
status: blocked
size: S
area: deps
priority: 3
blocked_by:
  - "upstream: stable gesture-handler с поддержкой RN 0.87"
owner: ""
stage: ""
source: PLAN.md «Открытые задачи», вопрос про gesture-handler
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Стоит `3.3.0-nightly-20260824-5de6d2358` как временный обход: stable 3.2.1 не собирается под RN 0.87 (удалён `getZIndexMappedChildIndex`). Nightly не для прода. Когда выйдет stable с поддержкой RN 0.87: `bun add react-native-gesture-handler@latest` в корневом `package.json`, typecheck и сборка.

## Приёмка

- [ ] Stable-версия стоит, typecheck и сборка проходят

## План

## Журнал

## Итог
