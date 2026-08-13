---
description: Воркфлоу разработки НейроАбоИ (aboi) — интернет-магазин обоев с аффирмациями
---

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

## Регистрация в Agent Mail

Фиксированное имя агента: `aboi-dev`. Общий шаблон вызова `macro_start_session` — см.
`.claude/rules/app-workflow.md`. Модель — `claude-opus-5` (не дефолтная `claude-sonnet-5`).

При изменениях в `libs/**` — резервируй конкретные пути и уведомляй владельцев через `send_message`.

## Учёт времени

Сразу стартуй таймер — `time_start({ app: "aboi", description: "изучение плана и постановка задачи" })`.
Когда направление работы прояснится — обнови через `time_switch`. Правила переключения и
остановки — `.claude/rules/time-tracking.md`, шаблон — `.claude/rules/app-workflow.md`.

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

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

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
