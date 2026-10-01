---
name: aboi
description: Воркфлоу разработки aboi — регистрация в Agent Mail, 152-ФЗ, тестирование, деплой
disable-model-invocation: true
---

# aboi - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` — общие правила Next.js
2. Прочитай `.claude/rules/database.md` — workflow ZenStack + Prisma + миграции
3. Прочитай `.claude/rules/security.md` — валидация, ZenStack policies, secrets
4. Прочитай `apps/aboi/PLAN.md` — полный план разработки и текущая фаза
5. Прочитай `apps/aboi/CHANGELOG.md` — что уже реализовано
6. Прочитай артефакты концепции (если работаешь по UX/копирайту; `.claude/artifacts/` вне git — читай, только если файлы есть локально):
   - `.claude/artifacts/aboi-requirements.md`
   - `.claude/artifacts/aboi-landing-concept.md`
   - `.claude/artifacts/aboi-plan-research.md` (best practices)

## Регистрация в Agent Mail

Фиксированное имя агента: `aboi-dev`. Общий шаблон вызова `macro_start_session` — см.
`.claude/rules/app-workflow.md`. Модель — `claude-opus-5` (не дефолтная `claude-sonnet-5`).

При изменениях в `libs/**` — резервируй конкретные пути и уведомляй владельцев через `send_message`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "aboi", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

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

Общий чек-лист — `.claude/rules/app-workflow.md`. Дополнительно для aboi:

- Прогнать `nx test aboi` (помимо format/lint/typecheck)
- Запусти `preview_start aboi` и визуально проверь изменения, если они UI-наблюдаемы

## 152-ФЗ

⚠️ Интернет-магазин с реальными заказами — собирает имя, телефон, адрес доставки. **Любая форма,
собирающая персональные данные (оформление заказа, обратная связь), ОБЯЗАНА:**

- Записывать `ConsentLog` через `recordConsent()` из `@letar/consent`
- Содержать **не предотмеченный** чекбокс согласия со ссылкой на `/privacy`
- Cookie-баннер с opt-in

Перед публичным запуском — чеклист `.claude/docs/personal-data.md`. Оператор ПДн и реквизиты — в
`.claude/private/COMPLIANCE.md` (см. «Проект» ниже).

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** aboi
**Порт:** 3018
**Домен (production):** <домен aboi> (условия включения — `apps/aboi/AGENTS.md`)
**Сервер:** s2 (185.28.85.195) — production; s1 сейчас staging/сборочный контур (с 2026-09-19, [deployment.md](/.claude/docs/deployment.md)), старый s1 выведен 2026-06-20
**Заказчик:** владелец приложения (реквизиты — в приватных доках)
**Описание:** см. `apps/aboi/AGENTS.md`

## Стек

Next.js 16 + React 19 + Chakra UI v3 + PostgreSQL + Prisma + ZenStack v3 + Better Auth (через Ключницу OIDC) + next-intl + Vitest + Playwright.

## Связанные skills

- `/zenstack-helper` — schema.zmodel, миграции, политики
- `/better-auth` — конфиг auth, OIDC, защита роутов
- `/form-pipeline` — формы через @letar/forms
- `/chakra-theming` — токены и dark mode
- `/ecommerce-patterns` — корзина, заказы, платежи (общие паттерны магазинов, `.claude/docs/ecommerce-cart-orders.md`)
