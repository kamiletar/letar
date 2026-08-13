---
description: Воркфлоу разработки лендинга десктоп-приложения Animatrona
---

# Animatrona Landing - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/animatrona-landing/PLAN.md` для текущего состояния задач (если есть)

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-landing-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona-landing", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona-landing
**Порт:** 3008
**Сервер:** s1 (194.164.245.97)
**Описание:** Лендинг десктоп-приложения Animatrona (IPFS аниме-стриминг)
