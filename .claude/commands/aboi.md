# НейроАбоИ (aboi) - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` — общие правила Next.js
2. Прочитай `.claude/rules/database.md` — workflow ZenStack + Prisma + миграции
3. Прочитай `.claude/rules/security.md` — валидация, ZenStack policies, secrets
4. Прочитай `apps/aboi/PLAN.md` — полный план разработки и текущая фаза
5. Прочитай `apps/aboi/CHANGELOG.md` — что уже реализовано
6. Прочитай артефакты концепции (если работаешь по UX/копирайту):
   - `.claude/artifacts/aboi-requirements.md`
   - `.claude/artifacts/aboi-landing-concept.md`
   - `.claude/artifacts/aboi-questions-for-vitaliy.md` (с ответами Виталия)
   - `.claude/artifacts/aboi-plan-research.md` (best practices)

## Координация

ОБЯЗАТЕЛЬНО при старте сессии вызови `macro_start_session` (см. `.claude/rules/agent-mail.md`):

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "opus-4.7",
  task_description: "Разработка aboi: <что делаешь>",
  file_reservation_paths: ["apps/aboi/**"],
  file_reservation_reason: "aboi development"
)
```

При изменениях в `libs/**` — резервируй конкретные пути и уведомляй владельцев через `send_message`.

## Действия

После изучения документации:

- Определи текущую фазу разработки (E0…E10 — см. `PLAN.md` §3)
- Выбери следующую невыполненную задачу из плана
- Предложи план действий с acceptance-критериями
- Перед массивными правками — согласуй scope с пользователем

## Юридические запреты

⛔ Запрещены формулировки на сайте, в письмах, в meta-тегах:
**«лечит», «терапия», «реабилитация», «одобрено врачами», «клинически доказано».**

Используй: «декор», «настроение», «осмысленный интерьер», «эстетика».
ФЗ «О рекламе» ст. 24 — иначе ФАС.

## После завершения задачи

1. Обнови `apps/aboi/PLAN.md` — отметь задачу `[x]`, перенеси сделанное из «Дальше» в «Сделано»
2. Обнови `apps/aboi/CHANGELOG.md` — добавь запись с версией (semver)
3. Обнови `apps/aboi/PLAN_TESTING.md` — если добавил тесты
4. Обнови `apps/aboi/package.json` — увеличь версию (patch для багфикса, minor для фичи)
5. Прогнать `nx format aboi` → `nx lint aboi` → `nx typecheck:tsgo aboi` → `nx test aboi`
6. Запусти `preview_start aboi` и визуально проверь изменения, если они UI-наблюдаемы
7. Закоммить осмысленным сообщением (см. `.claude/rules/git.md`)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "C:/web/letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: aboi",
  body_md: "app: aboi
reason: <что сделал>
commit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

## Проект

**Приложение:** aboi
**Бренд:** НейроАбоИ
**Порт:** 3018
**Домен (staging):** aboi.letar.best
**Домен (production):** neyroaboi.ru — после регистрации Виталием и подачи в РКН (см. PLAN.md §5, E10.b)
**Сервер:** s1.letar.best (194.164.245.97)
**Заказчик:** ИП Гаев В.В. (ИНН 246603783032)
**Описание:** B2C интернет-магазин обоев с зашитыми аффирмациями. Печать под заказ, флизелин 1.07 м, 1500 ₽/пог.м.

## Стек

Next.js 16 + React 19 + Chakra UI v3 + PostgreSQL + Prisma + ZenStack v3 + Better Auth (через Ключницу OIDC) + next-intl + Vitest + Playwright.

## Связанные skills

- `/zenstack-helper` — schema.zmodel, миграции, политики
- `/better-auth` — конфиг auth, OIDC, защита роутов
- `/form-pipeline` — формы через @letar/forms
- `/chakra-theming` — токены и dark mode
- `/ecommerce-patterns` — корзина, заказы, платежи (паттерны premium-rosstil)
