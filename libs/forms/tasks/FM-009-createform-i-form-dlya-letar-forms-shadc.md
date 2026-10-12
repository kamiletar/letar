---
id: FM-009
title: createForm() и Form для @letar/forms-shadcn
status: idea
size: L
area: forms
priority: 4
blocked_by: []
owner: ""
stage: ""
source: "libs/forms/PLAN.md Фаза 7.3, «Backlog: createForm()/Form для forms-shadcn»"
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Пакет отдаёт только `Field*`, сборки формы (`initialValue`, `onSubmit`, `Form.Button.Submit`) у потребителя нет, демо обходится локальным `useForm()` с `DeclarativeFormContext`. Нужно перед тем, как скин станет публичным npm-пакетом для внешних пользователей. Не блокирует остальное.

## Приёмка

- [ ] `createForm()` и корневой `Form` в shadcn-скине
- [ ] Демо переведено на него, тесты, документация

## План

## Журнал

## Итог
