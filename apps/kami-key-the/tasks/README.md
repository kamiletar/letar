# Очередь задач KamiKeyThe

Утилита для Windows: ввод типографских символов через AltGr (ремейк TypeItEasy). Electron, React,
Chakra UI v3; главный процесс на koffi и Win32, GDI-оверлей раскладки. Автообновление через
`@letar/electron-monorepo-updater`, релизы по GitHub Releases. Версия приложения — в `package.json`.

## Старт

`bun scripts/tasks.mjs next kami-key-the` из корня letar. Затем `show KK-NNN`,
`start KK-NNN --owner kami-key-the-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

Продукт стабилен, живых багов в очереди нет. Всё открытое ждёт владельца или идёт идеями:
push `main` (KK-001), заметка в релизе (KK-002), реестр (KK-003), рендер ролика `/brag` (KK-004).
Список ожиданий: `bun scripts/tasks.mjs waiting kami-key-the --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, тег и публикация релиза, `bun install` и `bun.lock`.
3. Приложение лежит в публичном корне: в файлах и задачах никаких доменов, реквизитов и личных данных.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`. Релиз обновления проверять живым циклом (методика в
   `.claude/docs/electron-monorepo-shared-releases.md`).

## Справка

- `PLAN.md` (96 КБ), `PLAN_COMPLETED.md`, `PLAN_TESTING.md` заморожены: карта символов, раскладка
  клавиш, архитектурные решения (koffi вместо keysender), журнал релизов. Целиком не читать:
  `grep -n '^#' PLAN.md` и `Read` с `offset` по полю `source` задачи.
- `CHANGELOG.md` целиком не читать, нужная запись ищется `grep`.
- Карта символов и инвентаризация физических клавиш — в начале `PLAN.md` (справка, не очередь).
