# Очередь задач Animatrona IPFS Player

Electron-плеер: добавить трекер, открыть раздачу по CID, смотреть эпизоды (Shaka Player), прогресс
просмотра. Встроенная нода Kubo из `libs/ipfs-kubo-core`, база SQLite через ZenStack. Только чтение:
запись в IPFS остаётся в Animatrona.

## Старт

`bun scripts/tasks.mjs next animatrona-ipfs-player` из корня letar. Затем `show IP-NNN`,
`start IP-NNN --owner animatrona-ipfs-player-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

Фазы 0 и 1 (схема, каркас, нода, плеер, прогресс, сборка) готовы. Осталось то, что проверяет человек:

- **IP-001** — запуск в dev и установленного `.exe`.
- **IP-002** — чтение манифеста по реальному CID.
- Ожидания: `bun scripts/tasks.mjs waiting animatrona-ipfs-player --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`, deploy-request.
3. Схема общая с Animatrona: правки фрагмента схемы согласуй с `animatrona-coordinator-dev`.
4. Один пункт — один коммит: версия в `package.json`, запись в `CHANGELOG.md`, перед коммитом
   `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (67 КБ) и `PLAN_COMPLETED.md` заморожены: позиционирование, разбор сервисов Kubo,
  разделение схемы с Animatrona, задание на схему, подключение `libs/ipfs-kubo-core`. Целиком не
  читать: `grep -n '^#' PLAN.md` и `Read` с `offset` по полю `source`.
- `PLAN_TESTING.md` — ручные проверки, не заморожен. `CHANGELOG.md` ищется `grep`.
