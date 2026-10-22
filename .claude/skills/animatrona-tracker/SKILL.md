---
name: animatrona-tracker
description: Воркфлоу разработки Animatrona Tracker — каталог, модерация и пиннинг IPFS-раздач аниме
disable-model-invocation: true
---

# Animatrona Tracker - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. ⚠️ **Очередь задач — `apps/animatrona-tracker/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/animatrona-tracker/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next animatrona-tracker`. Вызов с id (`/animatrona-tracker TR-003`) — сразу
   `bun scripts/tasks.mjs show TR-003`. `PLAN.md`, `PLAN_COMPLETED.md`, `PLAN_COMPLETED_2026_09_08.md`, `PLAN_COMPLETED_2026_09_08_FEATURES.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)
3. Прочитай `.claude/rules/animatrona.md` для архитектуры десктопа и IPFS
4. Прочитай `.claude/rules/animatrona-db.md` для моделей данных

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-tracker-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер `time_start({ app: "animatrona-tracker", ... })` — общий шаблон и правила
переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start TR-NNN --owner animatrona-tracker-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new animatrona-tracker …`, не абзацем в плане

## Особенности проекта

- **Трекер раздач:** регистрация и учёт IPFS раздач с модерацией
- **API Key auth:** Animatrona Desktop публикует аниме через API ключи
- **Модерация:** модераторы проверяют и одобряют раздачи
- **Пиннинг:** одобренные раздачи пинятся на relay-серверах (mail.letar.best и др.)
- **БД:** PostgreSQL + ZenStack 3.x + Better Auth (Google, Yandex, VK)
- **Деплой:** только запросом к `deploy-agent-dev` (см. раздел «Деплой»)

## Ключевые файлы

| Файл                          | Описание                      |
| ----------------------------- | ----------------------------- |
| `src/app/api/anime/route.ts`  | API публикации и списка аниме |
| `src/app/anime/[id]/page.tsx` | Детальная страница аниме      |
| `src/app/admin/page.tsx`      | Панель модерации              |
| `src/app/profile/page.tsx`    | Профиль и API ключи           |
| `schema.zmodel`               | Модели данных (ZenStack)      |

## После завершения задачи

`bun scripts/tasks.mjs done TR-NNN --summary "…"`, дальше общий чек-лист — `.claude/rules/app-workflow.md`.

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["animatrona-coordinator-dev"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-tracker\ntype: <type-change|api-change|schema-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-mobile`, `animatrona-tv` — только уведомляй координатора.
(`animatrona-web` выведен из эксплуатации, папки не существует — см. навык `animatrona-coordinator`.)

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona-tracker (Next.js 16)
**Порт:** 3009 (dev, `apps/animatrona-tracker/.env`; в production-контейнере — 3010, `docker-compose.production.yml`)
**Домен:** animatrona-tracker.letar.best
**Описание:** Веб-платформа для каталога аниме, регистрации IPFS раздач и модерации контента
