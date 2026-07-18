# Studio Letar - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/studio/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `studio-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "studio-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка studio: <что делаешь>",
  file_reservation_paths: ["apps/studio/**"],
  file_reservation_reason: "studio development"
)
```

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: studio",
  body_md: "app: studio
reason: <что сделал>
commit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

## 152-ФЗ

⚠️ **Любая форма, собирающая персональные данные, ОБЯЗАНА:**

- Записывать `ConsentLog` (IP, user-agent, timestamp, тип согласия)
- Содержать чекбокс согласия с ссылкой на `/privacy/`
- Использовать `recordConsent()` из `src/lib/consent.ts`

Нарушение требований 152-ФЗ недопустимо.

## Особенности проекта

### Роли

- `OWNER` — владелец студии (единственный, ты сам). Полный доступ: CRM, проекты, счета, финансы
- `CLIENT` — клиент студии. Только свои проекты и счета

### Личный кабинет владельца `/owner/`

- CRM клиентов, проекты, выставление счетов, финансы
- Только для роли `OWNER`

### Кабинет клиента `/cabinet/`

- Просмотр своих проектов и счетов
- Только для роли `CLIENT`

### Точка Банк интеграция

- OAuth 2.0 подключается один раз в `/owner/settings/`
- Webhook `POST /api/webhooks/tochka` — автозакрытие счетов при поступлении оплаты
- Логика в `src/lib/tochka/`
- Секрет подписи webhook: `TOCHKA_WEBHOOK_SECRET` в `.env.local`

### Счета

- Номера формата `INV-YYYY-NNN`
- Суммы хранятся в **копейках** (Int)
- Статусы: `DRAFT → SENT → PAID / OVERDUE / CANCELLED`
- При создании счёта — email клиенту со ссылкой на `/cabinet/invoices/[id]/`

## Проект

**Приложение:** studio
**Порт:** 3020
**Домен:** studio.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Better Auth (email/password)
**БД:** PostgreSQL + ZenStack
**Описание:** Сайт веб-студии Letar + личный кабинет владельца и клиентов с биллингом через Точка Банк
