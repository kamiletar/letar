# Очередь задач synth

Музыкальная студия в браузере и «музыкальный ментор»: Web Audio, MIDI, патчи в открытом формате
(SUB, FM, DRUM), VJ-режим, голосовой тракт, MCP-сервер для Claude Desktop. Железо — M-VAVE SMK-37
PRO. Роль, профиль владельца и «не делать» — в `claude.md`; перед работой прочитать.

## Старт

`bun scripts/tasks.mjs next synth` из корня letar. Затем `show SY-NNN`,
`start SY-NNN --owner synth-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

Фазы 0–5 закрыты, фаза 6 (FL Studio) отодвинута владельцем.

- Можно брать: SY-001 (theme:check), SY-002 (кнопки студии), SY-005 (сверка тестов).
- Ждут kami: SY-003 (Claude Desktop вживую), SY-004 (второй экран).
- Ожидания: `bun scripts/tasks.mjs waiting synth --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`, deploy-request.
3. После каждой вехи — запись в `JOURNAL.md` (один новый термин, через ощущения; не цвет = нота).
4. Звук проверять в браузере владельца, не во встроенном просмотре. Один пункт — один коммит:
   версия, `CHANGELOG.md`, `format`, `lint`, `typecheck:tsgo`.

## Справка

- `PLAN.md` (68 КБ) и `PLAN_COMPLETED.md` (178 КБ) заморожены: видение, эстетика, принятые решения,
  приватность, архитектура, открытый формат патча, фазы. Целиком не читать: `grep -n '^#' PLAN.md`
  и `Read` с `offset` по полю `source`.
- `claude.md`, `PLAN_TESTING.md` и `JOURNAL.md` (дневник, 55 КБ) не заморожены; журнал целиком не
  читать. `CHANGELOG.md` ищется `grep`.
