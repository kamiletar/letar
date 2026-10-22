# Очередь задач Animatrona Mobile

React Native (Android) клиент Animatrona: библиотека с Desktop и Tracker, мульти-сервер, франшизы и
поиск, плеер на ExoPlayer с жестами, ASS-субтитрами, PiP, синхронизацией режима просмотра.
Версия — в `package.json`.

## Старт

`bun scripts/tasks.mjs next animatrona-mobile` из корня letar. Затем `show MB-NNN`,
`start MB-NNN --owner animatrona-mobile-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **MB-007** — PiP и remote-control на RN 0.87 с реальным видео (нужно устройство, ждёт kami).
- Можно брать: MB-001 (сборка armeabi-v7a), MB-002 (haptic), MB-003 (QR), MB-004 (покадровая перемотка).
- Ждут внешнего: MB-005 (eslint-плагины), MB-006 (stable gesture-handler).
- Ожидания: `bun scripts/tasks.mjs waiting animatrona-mobile --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`, deploy-request.
3. Версии общих зависимостей — только в корневом `package.json`, приложение своего пина не держит
   без технической причины (решение владельца 2026-08-20).
4. Нативные изменения на Android проверяются на устройстве. Один пункт — один коммит: версия,
   `CHANGELOG.md`, `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (34 КБ) и `PLAN_COMPLETED.md` (54 КБ) заморожены: черновик идей, фаза 8 (локальный
  плеер папок), история фаз. Целиком не читать: `grep -n '^#' PLAN.md` и `Read` с `offset` по полю
  `source`.
- `PLAN_TESTING.md` — план тестирования, не заморожен. `CHANGELOG.md` ищется `grep`.
