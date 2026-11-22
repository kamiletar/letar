---
id: FM-029
title: Деплой form-docs с документацией стабильной версии forms
status: doing
size: S
area: docs
priority: 3
blocked_by: []
owner: forms-coordinator-dev
stage: ""
source: FM-003, выпуск волны 1 (2026-10-22)
created: 2026-10-22
updated: 2026-11-22
---

## Что и зачем

Страницы form-docs переписаны под forms 3.0 (подпути, `extraFields`, `SortableGroupList`, установка без тега, полная таблица peer — коммиты 440f4e780, 9f80b3e9a, 0af328038), но на сайте старая версия до деплоя. Деплой только запросом `deploy-agent-dev` (тред `deploy-form-docs`).

## Приёмка

- [x] Обновление документации включено в согласованный стабильный выпуск 2026-11-22
- [ ] На сайте страница Installation: шесть обязательных peer, подпути по таблице

## План

## Журнал

- 2026-11-22: После подготовки forms 3.1.1/form-mcp 2.7.0 проверяются сборки form-docs
  и form-example; обновлены PlainText и доступность DirtyGuard. Деплой будет запрошен
  через deploy-agent-dev после публикации npm. Прямой деплой не выполняется.
- 2026-11-22: Npm-публикация завершена, latest=next для обеих новых версий. Подготовлены
  form-docs 0.6.20/form-example 0.1.28, scoped format/lint/typecheck PASS. Production build:
  docs 167/167, example 60/60 PASS; docs повторно после добавления chakra-provider в
  transpilePackages. Из-за сторонних next-intl ошибок Nx graph использован эквивалентный
  next build --webpack из каталогов приложений. БД и db/template/reset не затрагивались.
  Health-check s1: SSH-туннель недоступен; s2 здоров. Стандартный staging gate пока недоступен.

## Итог
