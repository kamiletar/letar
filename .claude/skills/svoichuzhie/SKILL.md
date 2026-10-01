---
name: svoichuzhie
description: Воркфлоу разработки svoichuzhie — регистрация в Agent Mail, 152-ФЗ, учёт времени по клиенту
disable-model-invocation: true
---

# svoichuzhie - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/svoichuzhie/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

Фиксированное имя агента: `svoichuzhie-dev`. Общий шаблон вызова `macro_start_session` —
см. `.claude/rules/app-workflow.md`.

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

Общий чек-лист — `.claude/rules/app-workflow.md`.

## Работа с submodule

Приложение — **приватный git submodule**. Перед редактированием:

```bash
cd apps/svoichuzhie && git checkout main && git pull origin main
# ... правки ...
git add <файлы> && git commit -m "feat(svoichuzhie): описание" -- <файлы>
git push origin main   # только с одобрения пользователя; сначала submodule, потом letar
cd ../.. && git commit -m "chore: bump svoichuzhie submodule" -- apps/svoichuzhie
```

⚠️ Без `git checkout main` правки уйдут в detached HEAD и потеряются. Подробности:
`.claude/rules/git.md` § «Работа с приватными submodule».

## 152-ФЗ

⚠️ Приложение собирает персональные данные (подробности — `apps/svoichuzhie/AGENTS.md`). **Любая форма, собирающая персональные данные, ОБЯЗАНА:**

- Записывать `ConsentLog` через `recordConsent()` из `@letar/consent`
- Содержать **не предотмеченный** чекбокс согласия со ссылкой на `/privacy`
- Cookie-баннер с opt-in

Перед публичным запуском — чеклист `.claude/docs/personal-data.md`.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md`.

## Учёт времени

Проект ведётся для клиента студии по **почасовой оплате**. Инструменты `time_*` (сервер `letar`) — таймер
стартуется **сразу при начале работы**:

```
time_start({ app: "svoichuzhie", description: "<что делаешь, языком клиента>" })
```

⚠️ В `description` — только предмет работы по этому проекту. Никаких других клиентов, чужих
проектов и внутренней кухни: описание видит заказчик. При смене вида деятельности —
`time_switch`, в конце сессии — `time_stop`.

Если работа — отдельная именованная задача (не разовая мелочь), передавай её в параметр `stage`
у `time_start`/`time_switch` — Studio сама заведёт/переиспользует `ProjectStage` и привяжет к
нему запись, карточка «Этапы» на `/owner/projects/<id>` заполнится без ручного добавления. Как
называть этап, когда закрывать (`time_stage_close`) — `.claude/rules/app-workflow.md` §«Этапы
(ProjectStage)».

## Проект

**Приложение:** svoichuzhie
**Порт:** 3021
**Домен prod:** <домен svoichuzhie>
**Домен dev:** svoichuzhie.letar.best
**Сервер:** s2 (185.28.85.195)
**Submodule:** kamiletar/letar-private-svoichuzhie
**БД:** PostgreSQL + ZenStack
**Auth:** Better Auth (email/password + email verification)
**Описание:** см. `apps/svoichuzhie/AGENTS.md`
