# Очередь задач auth-hub

Ключница: единый вход для приложений монорепо. Better Auth как OIDC-провайдер (режим
`hub-provider`), вход по почте (ссылка, код, пароль), ВКонтакте, Яндекс, Telegram, passkey, magic
link, привязка и слияние аккаунтов, глобальный выход. Версия — в `package.json`.

## Старт

`bun scripts/tasks.mjs next auth-hub` из корня letar. Затем `show AH-NNN`,
`start AH-NNN --owner auth-hub-dev`, `note`, `done --summary`.
Формат: [tasks-per-file](/.claude/docs/tasks-per-file.md). Статусы живут только в шапках задач.

## Текущий фокус

- **AH-001** — staging E2E и выпуск единого входа с новым порядком способов (можно брать).
- **AH-005** — проверить re-seed клиента animatrona-tracker (можно брать).
- **AH-006** — вход через Telegram в проде не работает без `TELEGRAM_WEBHOOK_SECRET` (ждёт kami).
- Ручные проверки с реальной почтой и аккаунтами: AH-003, AH-007 (ждут kami).
- Ожидания: `bun scripts/tasks.mjs waiting auth-hub --on kami`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую.
2. Без слова владельца: `git push`, `bun install` и `bun.lock`. Деплой — только заявкой
   `deploy-agent-dev`.
3. Изменения общего кода (`libs/auth`, `libs/email`, `libs/pin-auth`) задевают все приложения:
   проверять вход через Ключницу минимум в двух клиентах.
4. Секреты (`TELEGRAM_WEBHOOK_SECRET`, ключи OAuth) не придумывать: генератор и
   `scripts/sops-env-set.sh`. Один пункт — один коммит: версия, `CHANGELOG.md`, `format`, `lint`,
   `typecheck:tsgo`.

## Справка

- `PLAN.md` (49 КБ), `PLAN_COMPLETED.md` (126 КБ) и `PLAN_EMAIL_CODE.md` (49 КБ) заморожены:
  история версий 0.4–0.7, разборы OIDC-багов, код из письма (фазы 0 и A). Целиком не читать:
  `grep -n '^#' PLAN.md` и `Read` с `offset` по полю `source`.
- `PLAN_TESTING.md` — план тестирования, не заморожен. `CHANGELOG.md` ищется `grep`.
- UX единого входа: [auth-hub-unified-entry-ux](/.claude/docs/auth-hub-unified-entry-ux.md).
