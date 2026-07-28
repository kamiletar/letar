# DomWellbes - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/domwellbes/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `domwellbes-dev`.
Токена в таблице `agent_fixed_names_tokens.md` пока нет — приложение создано позже общей
регистрации. Если `macro_start_session` требует `registration_token`, работай без координации
(конфликтов нет — приватный submodule правит только его же агент).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-opus-5",
  agent_name: "domwellbes-dev",
  task_description: "Разработка domwellbes: <что делаешь>",
  file_reservation_paths: ["apps/domwellbes/**"],
  file_reservation_reason: "domwellbes development"
)
```

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
  subject: "deploy-request: domwellbes",
  body_md: "app: domwellbes
reason: <что сделал>
commit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

## Работа с submodule

Приложение — **приватный git submodule**. Перед редактированием:

```bash
cd apps/domwellbes && git checkout main && git pull origin main
# ... правки ...
git add . && git commit -m "feat(domwellbes): описание" && git push origin main
cd ../.. && git add apps/domwellbes && git commit -m "chore: bump domwellbes submodule"
```

⚠️ Без `git checkout main` правки уйдут в detached HEAD и потеряются. Подробности:
`.claude/rules/git.md` § «Работа с приватными submodule».

## 152-ФЗ

⚠️ Приложение предполагает формы обратной связи (заявки на строительство). **Любая форма,
собирающая персональные данные, ОБЯЗАНА:**

- Записывать `ConsentLog` через `recordConsent()` из `@letar/consent`
- Содержать **не предотмеченный** чекбокс согласия со ссылкой на `/privacy`
- Cookie-баннер с opt-in

Перед публичным запуском — чеклист `.claude/docs/personal-data.md`. Оператор ПДн для этого
домена на момент создания приложения **не определён** — уточнить у владельца, кто подаёт
уведомление в РКН (студия или заказчик).

## Учёт времени

Проект ведётся для клиента студии по **почасовой оплате**. Когда заработает MCP-сервер учёта
времени (`libs/studio-time-mcp`, Фаза 11 в `apps/studio/PLAN.md`) — стартовать таймер при начале
работы:

```
time_start({ app: "domwellbes", description: "<что делаешь, языком клиента>" })
```

⚠️ В `description` — только предмет работы по этому проекту. Никаких других клиентов, чужих
проектов и внутренней кухни: описание видит заказчик. При смене вида деятельности —
`time_switch`, в конце сессии — `time_stop`.

## Проект

**Приложение:** domwellbes
**Порт:** 3025
**Домен prod:** domwellbes.ru
**Домен dev:** domwellbes.letar.best
**Сервер:** s2 (185.28.85.195)
**Submodule:** kamiletar/letar-private-domwellbes
**Описание:** Web-приложение полного цикла для компании, специализирующейся на строительстве
загородных домов под ключ. ТЗ в проработке.
