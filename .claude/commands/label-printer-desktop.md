---
description: Воркфлоу разработки Electron-приложения label-printer-desktop для печати этикеток «Честный знак»
---

# Label Printer Desktop - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/label-printer-desktop/PLAN.md` для текущего состояния задач
2. Прочитай `libs/label-printer-core/README.md` для API shared библиотеки

## Регистрация в Agent Mail

Фиксированное имя агента: `label-printer-desktop-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** label-printer-desktop
**Тип:** Electron + Next.js (Nextron)
**Описание:** Desktop приложение для печати этикеток "Честный знак"
**Shared библиотека:** @letar/label-printer-core
**База данных:** SQLite + Prisma + ZenStack
