---
id: FM-002
title: "zenstack-form-plugin: @@validate со сравнением с членом enum всегда true"
status: ready
size: M
area: zenstack
priority: 3
blocked_by: []
owner: ""
stage: ""
source: libs/forms/PLAN.md Backlog 2026-09-27 «@@validate со сравнением с членом enum»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

`serializeExpression` в `libs/zenstack-form-plugin/src/model-generator.ts` (`case 'ReferenceExpr'`) эмитит `{ kind: 'field' }` для любой ссылки, в том числе на член enum. Сравнение `поле != ENUM_MEMBER` в рантайме превращается в сравнение с `null`, проверка молча отключена. Фикс: смотреть на `expr.target.$ref`, для члена enum эмитить `{ kind: 'literal', value: <имя> }`.

## Приёмка

- [ ] Падающий тест на генерации: сравнение с членом enum даёт литерал
- [ ] Генератор исправлен, поведение ссылок на поля не изменилось
- [ ] Версия плагина, CHANGELOG
- [ ] Обходной `.refine()` в приложении-репортёре убирает его владелец

## План

## Журнал

## Итог
