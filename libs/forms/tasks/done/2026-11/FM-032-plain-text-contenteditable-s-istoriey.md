---
id: FM-032
title: Plain-text contenteditable с историей
status: done
size: M
area: ""
priority: 2
blocked_by: []
owner: forms-dev-plaintext
stage: ""
source: ""
created: 2026-11-21
updated: 2026-11-22
closed: 2026-11-22
---

## Что и зачем

Переиспользуемый редактор обычного текста для заметок и длинных авторских материалов.
Plain text сохраняет переносы; форматирование и HTML не входят в данные.

## Приёмка

- Optional entry `@letar/forms/plain-text`, подключаемый через `extraFields`, без TipTap в ядре.
- Выделение и курсор в UTF-16, plain clipboard, Enter/строфы, IME и атомарная вставка.
- Ограниченная история undo/redo, baseline и непрозрачный перенос сессии только в памяти.
- Поле участвует в dirty/validation/persistence формы; демо и реестр MCP синхронизированы.

## План

1. Контроллер ProseMirror с одной plain-text нодой и историей изменений.
2. Адаптер createField, optional exports, демо и документация.
3. Controller/adapter/MCP тесты, Chromium и WebKit, lint/типы/format.

## Журнал

- 2026-11-21: План: optional plain-text subpath с одной текстовой ProseMirror нодой, PM history/selection, plain clipboard, composition; адаптер createField и handle; тесты, docs/демо/реестр. Без установки зависимостей и без публикации. Red: controller import absent; Green: 10 сценариев прошли. Общая история нескольких полей остаётся в приложении через transaction hooks.
- 2026-11-21: Проверки: новый controller и adapter (история/selection/clipboard/IME/Enter/save/session-transfer/100k), реестр form-mcp 18/18. Типы и lint пяти проектов PASS. Полный forms прогон: 1238 passed / 3 failed в старых combobox-load и city-dictionary; точечный повтор этих двух файлов 24/24 PASS, возможна нагрузочная нестабильность, полный suite не объявляем зелёным. Chromium/WebKit375: develop+docs 4/4 smoke PASS. Physical Android/iPhone IME остаётся приёмкой приложения-потребителя. Коммит пока не выполнен по запросу родителя.
- 2026-11-21: Финально: 13/13 новых тестов PASS, 18/18 реестра PASS; UI smoke develop/docs Chromium/WebKit375 — 4/4. Новый сценарий безопасной вставки проверяет сохранение editorProps при aria update. captureSession/restoreSession переносит PM state только in-memory. Для релиза согласовать root lock (forms3.1.0/form-mcp2.7.0), публикации нет. Agent Mail координатору не доставлен: forms-coordinator-dev retired; подзадача координируется родителем через collaboration.

## Итог

- 2026-11-22: Повтор полного suite прошёл: 166 файлов, 1244 теста. Новые тесты приложения-потребителя
  проверяют общую историю названия/текста, атомарную замену редакцией и перенос через remount.

- 2026-11-22: Приёмка к релизу: код, optional entry, интеграция формы, docs/MCP и три демо проверены.
  Исправлен вызов внешней истории из readOnly/disabled через native beforeinput (Red/Green).
  PlainText 14/14 PASS; format четырёх проектов, lint и typecheck библиотеки PASS.
  Browser evidence: `.claude/artifacts/forms-plaintext/smoke.cjs` и четыре скриншота Chromium/WebKit
  при ширине 375 px для develop/docs; физический mobile IME остаётся проверкой потребителя.
  Счётчик полей README приведён к реестру: 64 поля.
- 2026-11-22: Финальный полный прогон после readOnly-исправления и DirtyGuard: 167 файлов,
  1251 тест PASS; полный form-mcp — 79/79 PASS. Npm preflight forms 3.1.1/form-mcp 2.7.0
  с проверкой зависимостей в реестре PASS.
