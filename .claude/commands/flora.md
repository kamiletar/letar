---
description: Воркфлоу разработки flora — приватный submodule, учёт времени, требования 152-ФЗ
---

# Flora - Воркфлоу разработки

## Инициализация

1. **Сразу стартуй таймер** — `time_start({ app: "flora", description: "изучение плана и постановка задачи" })`,
   затем `time_switch`, когда направление работы прояснится (см. «Учёт времени» ниже)
2. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
3. Прочитай `apps/flora/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Имя агента: `flora-dev`. Общий шаблон вызова `macro_start_session` и что делать при отказе —
`.claude/rules/app-workflow.md` § 1. Фиксированной identity с токеном для этого приложения ещё
нет: при первой регистрации заведи штатно (`register_agent`, kebab-case `flora-dev`) и сохрани
токен в `agent_fixed_names_tokens.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md` § 3.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md` § 4. Запрос —
`deploy-agent-dev` через Agent Mail с `subject: "deploy-request: flora"`.

⚠️ Приложение ещё не готово к деплою: нет `Dockerfile.production`, `docker-compose.production.yml`,
`.env.docker(.enc)` и регистрации в Dashboard — см. `.claude/commands/create/new-app.md`.

## Работа с submodule

Приложение — **приватный git submodule** (`kamiletar/letar-private-flora`). Перед редактированием:

```bash
cd apps/flora && git checkout main && git pull origin main
# ... правки ...
git add <файлы> && git commit -m "feat(flora): описание" && git push origin main
cd ../.. && git add apps/flora && git commit -m "chore: bump flora submodule" -- apps/flora
```

⛔ Порядок push нерушим: сначала submodule, потом letar — `.claude/rules/git.md`.

## Учёт времени

Проект ведётся для клиента студии по **почасовой оплате** (заведён в studio, `repoSlug = flora`).
Стартовать таймер при начале работы:

```
time_start({ app: "flora", description: "<что делаешь, языком клиента>" })
```

⚠️ В `description` — только предмет работы по этому проекту. Никаких других клиентов, чужих
проектов и внутренней кухни: описание видит заказчик. При смене вида деятельности —
`time_switch`. Правила остановки — `.claude/rules/time-tracking.md`.

## Проект

**Приложение:** flora
**Порт:** 3126
**Сервер:** s2
**Submodule:** kamiletar/letar-private-flora
**Описание:** см. `apps/flora/PLAN.md`
