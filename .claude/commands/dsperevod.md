# DS Perevod - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/dsperevod/PLAN.md` для текущего состояния задач

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: dsperevod",
  body_md: "app: dsperevod
reason: <что сделал>
commit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

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
