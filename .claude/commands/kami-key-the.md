---
description: Воркфлоу разработки утилиты kami-key-the — регистрация агента и выбор задачи из плана
---

# KamiKeyThe - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/kami-key-the/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `kami-key-the-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "kami-key-the", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** kami-key-the
**Описание:** Системная утилита для ввода типографских символов через AltGr (ремейк TypeItEasy)
**Особенности:** Desktop-утилита (Node.js, без Electron), keysender + systray2
