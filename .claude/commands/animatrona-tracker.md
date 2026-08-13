---
description: Воркфлоу разработки Animatrona Tracker — каталог, модерация и пиннинг IPFS-раздач аниме
---

# Animatrona Tracker - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/animatrona-tracker/PLAN.md` для текущего состояния задач
3. Прочитай `.claude/rules/animatrona.md` для архитектуры десктопа и IPFS
4. Прочитай `.claude/rules/animatrona-db.md` для моделей данных

## Регистрация в Agent Mail

Фиксированное имя агента: `animatrona-tracker-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Учёт времени

Сразу стартуй таймер — `time_start({ app: "animatrona-tracker", description: "изучение плана и постановка задачи" })`.
Когда направление работы прояснится — обнови через `time_switch`. Правила переключения и
остановки — `.claude/rules/time-tracking.md`, шаблон — `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## Особенности проекта

- **Трекер раздач:** регистрация и учёт IPFS раздач с модерацией
- **API Key auth:** Animatrona Desktop публикует аниме через API ключи
- **Модерация:** модераторы проверяют и одобряют раздачи
- **Пиннинг:** одобренные раздачи пинятся на relay-серверах (mail.letar.best и др.)
- **БД:** PostgreSQL + ZenStack 3.2 + Better Auth (Google, Yandex, VK)
- **Деплой:** `deploy-affected.sh --app animatrona-tracker`

## Ключевые файлы

| Файл                          | Описание                      |
| ----------------------------- | ----------------------------- |
| `src/app/api/anime/route.ts`  | API публикации и списка аниме |
| `src/app/anime/[id]/page.tsx` | Детальная страница аниме      |
| `src/app/admin/page.tsx`      | Панель модерации              |
| `src/app/profile/page.tsx`    | Профиль и API ключи           |
| `schema.zmodel`               | Модели данных (ZenStack)      |

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["GrayMill"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-tracker\ntype: <type-change|api-change|schema-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-web`, `animatrona-mobile`, `animatrona-tv` — только уведомляй координатора.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Проект

**Приложение:** animatrona-tracker (Next.js 16)
**Порт dev:** 3009
**Порт production:** 3010
**Домен:** animatrona-tracker.letar.best
**Описание:** Веб-платформа для каталога аниме, регистрации IPFS раздач и модерации контента
