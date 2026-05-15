# Animatrona Tracker - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/animatrona-tracker/PLAN.md` для текущего состояния задач
3. Прочитай `.claude/rules/animatrona.md` для архитектуры десктопа и IPFS
4. Прочитай `.claude/rules/animatrona-db.md` для моделей данных

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

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `CHANGELOG.md` — добавь запись об изменениях
3. Обнови `package.json` — увеличь версию (semver)

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["GrayMill"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-tracker\ntype: <type-change|api-change|schema-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-web`, `animatrona-mobile`, `animatrona-tv` — только уведомляй координатора.

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "C:/web/letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: animatrona-tracker",
  body_md: "app: animatrona-tracker
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

**Приложение:** animatrona-tracker (Next.js 16)
**Порт dev:** 3009
**Порт production:** 3010
**Домен:** animatrona-tracker.letar.best
**Описание:** Веб-платформа для каталога аниме, регистрации IPFS раздач и модерации контента
