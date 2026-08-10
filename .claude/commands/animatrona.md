# Animatrona - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/animatrona/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["GrayMill"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona\ntype: <type-change|api-change|ipfs-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona-web`, `animatrona-tracker`, `animatrona-mobile`, `animatrona-tv` — только уведомляй координатора.

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona (Electron + Next.js)
**Порт:** 3007 (renderer dev server)
**Описание:** Десктоп-приложение для работы с видео-контентом
