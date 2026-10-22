# Очередь задач Label Printer Desktop

Electron-приложение для печати этикеток на принтерах TSC: база товаров (GTIN), шаблоны этикеток (Satori), пакетная печать из CSV и PDF с DataMatrix, RAW TSPL через winspool.drv, статистика, автообновление. Цель — версия 1.0.0.

## Старт

`bun scripts/tasks.mjs next label-printer-desktop` из корня letar. Затем `show LP-NNN`,
`start LP-NNN --owner label-printer-desktop-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **LP-001** — форма добавления товара (можно брать).
- Можно брать: LP-002 (CI-релиз с `latest.yml` и `.blockmap`).
- Ждут kami: LP-003 (принтер и сканер под рукой), LP-004 (сертификат подписи).
- Ожидания: `bun scripts/tasks.mjs waiting label-printer-desktop --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Печать и железо в песочнице агента не проверяются: GUI Electron и принтер проверяет владелец (`.claude/rules/electron.md`).
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (13 КБ), `PLAN_COMPLETED.md` (67 КБ) заморожены: целиком не читать, `grep -n '^#' <файл>` и `Read` с `offset` по полю `source`
  выбранной задачи.
- `FAQ.md` — вопросы пользователей, не заморожен.
- `PLAN_TESTING.md` и `CHANGELOG.md` не заморожены; журнал изменений ищется `grep`.
