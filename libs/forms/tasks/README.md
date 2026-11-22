# Очередь задач библиотеки форм

Проект `forms`, префикс `FM`. Пакеты `libs/forms` (Chakra), `forms-core`, `forms-react`,
`forms-shadcn`, `forms-vue`, `forms-vue-shadcn`, `forms-angular`, `forms-query`, плагин
`zenstack-form-plugin` и `form-mcp`. Координатор — `forms-coordinator-dev`, исполнитель — `forms-dev`.

## Как пользоваться

Задача — один файл `tasks/FM-NNN-slug.md` со статусом в шапке; закрытые лежат в
`tasks/done/ГГГГ-ММ/`. Список собирает команда из корня монорепо:

```bash
bun scripts/tasks.mjs next forms
```

Дальше: `show FM-NNN`, `start FM-NNN --owner forms-dev`, `note`, `done --summary`. Формат и все
команды: [tasks-per-file](/.claude/docs/tasks-per-file.md).

## Текущий фокус

- **Стабильный React/Chakra выпуск:** FM-030 — `forms 3.1.1` и `form-mcp 2.7.0`, приёмка
  PlainText (FM-032), npm preflight и smoke готовых tarball. DirtyGuard (FM-026) закрыт.
- **Другие адаптеры:** FM-004 (Combobox, этап 4; `forms-vue-shadcn` уже частично готов),
  FM-005 и FM-008. Решение D2 из FM-003 исключает Vue/Angular/shadcn из первой публичной волны;
  их паритет не блокирует выпуск шести пакетов из npm-реестра.
- FM-003 завершена: первая волна уже опубликована. Новые теги по D5 ставит владелец.

## Справка (замороженные планы)

Перенесено только живое: открытые записи «Backlog (запросы от агентов)», `- [ ]` из фаз 7–8 и
отложенное по `EditIntent`. Остальное остаётся справкой и расти не может:

- `PLAN.md` (1 МБ) и `PLAN_COMPLETED.md` — журнал и архив. Целиком не читать: `grep -n '^## '` и
  `Read` с `offset`.
- `REFACTORING_PLAN.md`, `TESTING_PLAN.md`, `NEW_COMPONENTS.md`, `MASK_ENGINE.md` — спецификации и
  справочники, не заморожены. Задачу из них берёшь по `source`.
- `CHANGELOG.md` целиком не читать: нужная запись ищется `grep`.
- Веха стартовала, а задач по ней нет — режь её на задачи через `tasks new … --source`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую задачу.
2. Не делать без слова владельца: `git push`, `npm publish`, `nx release` и теги `forms-v*`,
   `form-mcp-v*`, `forms-query-v*`, `zenstack-form-plugin-v*`, `bun install` и `bun.lock`.
3. Запрос от приложения-потребителя приходит через Agent Mail (`form-feature-request`). Сразу
   заводи задачу; свой `createForm`-код вместо запроса приложение не пишет.
4. Фича не готова без полного цикла: 6 групп документации (`docs/`, демо, form-docs, form-mcp,
   версии, CHANGELOG), перед коммитом `format`, `lint`, `typecheck:tsgo`.
5. Файл публичный: в задачах нет названий приватных приложений, доменов и реквизитов.
