# DS Perevod - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/dsperevod/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `dsperevod-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## 152-ФЗ

⚠️ **Любая форма, собирающая персональные данные, ОБЯЗАНА:**

- Записывать `ConsentLog` (IP, user-agent, timestamp, тип согласия)
- Содержать чекбокс согласия с ссылкой на `/privacy/`
- Использовать `recordConsent()` из `src/lib/consent.ts`

Нарушение требований 152-ФЗ недопустимо.

## Проект

**Приложение:** dsperevod
**Порт:** 3019
**Домен:** dsperevod.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Better Auth (email/password)
**БД:** PostgreSQL + ZenStack
**Submodule:** kamiletar/letar-private-dsperevod
**Описание:** Бюро переводов DS Perevod — маркетинговый сайт + панель администратора
