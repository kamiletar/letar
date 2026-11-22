---
id: FM-030
title: Стабильный выпуск forms 3.1.1 и form-mcp 2.7.0
status: blocked
size: S
area: release
priority: 3
blocked_by:
  - "kami: релизные теги по D5; подготовка и проверки завершены"
owner: forms-coordinator-dev
stage: ""
source: "сессия обновления зависимостей, 2026-10-22"
created: 2026-10-22
updated: 2026-11-22
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
- [ ] Владелец поставил `forms-v3.1.1` и `form-mcp-v2.7.0`, CI публикации зелёный.
- [ ] Обе новые версии доступны в `latest`; документация и витрина обновлены.

## План

1. Приёмка PlainText и тесты библиотек.
2. Чистая сборка npm, проверка tarball и реестра зависимостей.
3. Коммит подготовки, передача владельцу точных тегов и порядка публикации.
4. После публикации проверить каналы npm и запросить обновление документации/витрины.

## Журнал

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

Подготовка завершена. Теги `forms-v3.1.1`, затем `form-mcp-v2.7.0` ставит владелец по D5;
отправлять по одному, дожидаясь успешного workflow каждого. Повторно публиковать неизменившиеся
core/react/query/plugin не требуется. После публикации перевести обе версии в `latest`,
проверить npm dist-tags и обновить form-docs/form-example через deploy-agent-dev.
На этапе подготовки push, теги, npm publish и deploy не выполнялись.
