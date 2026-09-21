# Общий workflow команд `/<app>`

Извлечено из ~33 команд `.claude/commands/<app>.md`, где эти блоки повторялись почти дословно.
Команда приложения ссылается сюда одной строкой и подставляет своё имя агента; здесь — то, что
от приложения не зависит.

## 1. Регистрация в Agent Mail

Обязательно при старте сессии, под фиксированным именем `<app>-dev` (токен — в приватной памяти
`agent_fixed_names_tokens.md`), с резервацией `["apps/<app>/**"]`, следом — `set_contact_policy`
с `policy: "open"`. Полный вызов, ответы сервера и что делать при отказе —
[agent-mail.md](/.claude/rules/agent-mail.md).

Коротко про два частых ответа: «retired» — норма, лечится `unretire_agent` с тем же токеном;
`Invalid registration_token` — **не** повод регистрировать то же имя заново.

## 2. Таймер

Стартуй сразу: `time_start({ app: "<app>", description: "изучение плана и постановка задачи" })`,
затем `time_switch`, как только направление прояснится. Правила переключения, паузы и проверки
`time_status` — [time-tracking.md](/.claude/rules/time-tracking.md).

⚠️ Некоммерческий/личный проект (не клиент студии по почасовой оплате) — сессия небиллируемая:
закрывай `time_discard`, а не `time_stop`. Биллинг считается по флагу записи, не по тексту
описания.

### Этапы заводи сам, не жди владельца

Работа укладывается в отдельную именованную задачу проекта — передавай её название в `stage` у
`time_start`/`time_switch`; studio заведёт `ProjectStage` или найдёт открытый, и карточка «Этапы»
заполнится из реальной работы. ⚠️ Название — **дословно одинаковое** во всех вызовах, поиск идёт
по точному совпадению `title`. Сделано —
`time_stage_close({ app: "<app>", stage: "<то же название>" })`.

## 3. После завершения задачи

1. `apps/<app>/PLAN.md` — отметить задачу выполненной
2. `apps/<app>/PLAN_COMPLETED.md` — детали реализации (если ведётся отдельно)
3. `apps/<app>/CHANGELOG.md` — запись об изменениях
4. `apps/<app>/PLAN_TESTING.md` — если добавил тесты
5. `apps/<app>/package.json` — поднять версию (semver)
   ⚠️ и **сразу** `bun.lock`: сверка `bun scripts/check-lock-workspace-versions.mjs`, при расхождении
   `bun install --lockfile-only` (только в чистом дереве) и отдельный коммит lock. Без этого
   `--frozen-lockfile` на сервере роняет деплой ВСЕХ приложений. Версия выросла внутри приватного
   submodule — lock коммить после push submodule
   ([разбор](/.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md))
6. `time_stage_close`, если работал в рамках именованного этапа
7. `nx run-many -t format --projects=<app>` → `nx lint <app>` → `nx typecheck:tsgo <app>`
8. Закоммитить осмысленным сообщением ([git.md](/.claude/rules/git.md))

## 4. Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос `deploy-agent-dev` через Agent Mail с
`subject: "deploy-request: <app>"`. Шаблон и что делать, если он молчит 10 минут —
[deploy-coordination.md](/.claude/rules/deploy-coordination.md).
