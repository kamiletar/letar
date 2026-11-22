---
id: FM-030
title: Стабильный выпуск forms 3.1.1 и form-mcp 2.7.0
status: done
size: S
area: release
priority: 3
blocked_by: []
owner: forms-coordinator-dev
stage: ""
source: сессия обновления зависимостей, 2026-10-22
created: 2026-10-22
updated: 2026-11-22
closed: 2026-11-22
---

## Что и зачем

Подготовить стабильный выпуск `@letar/forms 3.1.1` и `@letar/form-mcp 2.7.0`: исправления
Field.Auto, доступности Steps/DirtyGuard и новое optional поле PlainText. Пользователь
2026-11-22 поручил продолжить подготовку после закрытия DirtyGuard. Первая волна FM-003 уже
опубликована; Vue/Angular/shadcn не входят в её состав (D2). По D5 теги ставит владелец.

## Приёмка

- [x] FM-032 принята, найденные дефекты и каскад документации исправлены.
- [x] Полные тесты forms/form-mcp, scoped format/lint/typecheck проходят.
- [x] Свежие npm dist: integrity, publint/attw и smoke Next/Vite/ZenStack/MCP проходят.
- [x] Результаты подготовлены к коммиту; версии и lock синхронны.
- [x] По разрешению владельца поставлены `forms-v3.1.1` и `form-mcp-v2.7.0`, CI публикации зелёный.
- [x] Обе новые версии доступны в `latest`; обновление сайтов ведётся отдельно в FM-029.

## План

1. Приёмка PlainText и тесты библиотек.
2. Чистая сборка npm, проверка tarball и реестра зависимостей.
3. Коммит подготовки, передача владельцу точных тегов и порядка публикации.
4. После публикации проверить каналы npm и запросить обновление документации/витрины.

## Журнал

- 2026-11-22: Владелец явно разрешил агенту push и релизные теги. Коммит 3561e625a
  отправлен в main, тег forms-v3.1.1 запустил CI45051738359. Npm web login завершён;
  перевод новых версий в latest выполняется после успешной публикации.

- 2026-11-22: npm view подтвердил `latest = next`: forms 3.0.0, form-mcp 2.6.0.
  Чистая сборка шести пакетов и integrity/publint/attw PASS. Старый импорт testing-library
  был артефактом dist и не воспроизводится после build:npm. Приёмка FM-032 обнаружила
  вызов общей undo-истории в readOnly; исправление и regression проходят отдельную проверку.
- 2026-11-22: FM-032 принята и закрыта, native undo в readOnly/disabled/IME блокируется.
  Полный forms: 167 файлов / 1251 тест PASS. Form-mcp: 9 файлов / 79 тестов PASS после
  исправления счётчика README и его проверки (64 поля). Scoped format/lint/typecheck PASS.
  Preflight forms 3.1.1 и form-mcp 2.7.0 с проверкой npm-зависимостей PASS.
  Первый полный tarball smoke: Next/Vite/ZenStack/MCP PASS; финальные forms/MCP пересобраны
  после фикса, повтор Next/Vite/MCP PASS. В постоянную Next-фикстуру добавлены импорт и
  регистрация PlainText через extraFields, плюс negative typecheck без регистрации;
  её отдельный финальный прогон PASS (45 с). Integrity всех шести пакетов PASS.

## Итог

2026-11-22: Выпуски опубликованы последовательно по тегам на 3561e625a, оба CI зелёные:
forms — https://github.com/kamiletar/letar/actions/runs/45051738359,
form-mcp — https://github.com/kamiletar/letar/actions/runs/45052188249.
Npm registry подтвердил provenance обеих версий; после отдельной 2FA владельца обе переведены
в latest (совпадает с next). Повторной публикации core/react/query/plugin не требовалось.
Сайты form-docs/form-example подготовлены к деплою; их выпуск отслеживается в FM-029.
Forms3.1.1 и form-mcp2.7.0 опубликованы по разрешению владельца, оба CI PASS и provenance подтверждён; latest=next после 2FA. Сайты отдельно FM-029.
