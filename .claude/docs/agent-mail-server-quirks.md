# Agent Mail: особенности и баги сервера

Вынесено из `.claude/rules/agent-mail.md` 2026-08-10 — правило грузится в контекст каждой
сессии, а эти разборы нужны только когда что-то уже сломалось. Действующая инструкция —
[.claude/rules/agent-mail.md](/.claude/rules/agent-mail.md).

Баги относятся к самому MCP-серверу agent-mail, а не к этому репозиторию: при обновлении сервера
проверь, воспроизводятся ли они ещё.

---

## Почему нельзя оставлять серверу генерировать имя

Если вызвать `macro_start_session` без `agent_name`, agent-mail сгенерирует случайное
adjective+noun имя (`SunnyTower`, `WhiteMountain` и т.п.) и зарегистрирует **новую** identity —
без истории, без принятых контактов, незнакомую другим агентам/координаторам. Найдено
2026-08-09: сессия `svoichuzhie` стартовала как `SunnyTower` вместо фиксированного
`svoichuzhie-dev`, из-за чего первые `send_message` к `forms-coordinator`/`BlackCove` упирались
в `Contact approval required` и путаницу с диагностикой (см. ниже).

**Перед вызовом `macro_start_session` проверь, есть ли у этого приложения фиксированная
identity** — таблица `<app>-dev` + `registration_token` хранится в приватной cross-session
памяти (не в репозитории — токены не публикуются, см. `public-repo-hygiene.md`). Если запись
для приложения есть — передай её явно:

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  task_description: "<кратко что делаешь>",
  agent_name: "<app>-dev",
  registration_token: "<токен из памяти>",
  file_reservation_paths: ["apps/<твоё-приложение>/**"],
  file_reservation_reason: "<приложение> development"
)
```

Если фиксированной identity для приложения ещё нет — заведи её штатно (`register_agent` с
kebab-case именем `<app>-dev`) и сохрани `registration_token` в памяти для будущих сессий, а не
оставляй сервер генерировать случайное имя молча.

### ⚠️ `send_message` первый раз к незнакомому агенту → `Contact approval required`

Это отдельная история от бага ниже («`to` отклоняет kebab-case имя») — здесь причина не в
формате имени, а в том, что agent-mail требует явного подтверждения контакта между двумя
агентами, ранее не переписывавшимися. Первый `send_message` автоматически создаёт pending-заявку
и **блокирует** сам себя — сообщение не уходит.

**Что делать:**

1. Если получил ошибку `Contact approval required for recipients: <имя>` — заявка уже создана
   автоматически, ждать не нужно повторять `send_message` до апрува. Либо явно:
   ```
   request_contact(
     project_key: "c-web-letar",
     from_agent: "<твоё-имя>",
     to_agent: "<получатель>",
     reason: "<коротко зачем>"
   )
   ```
2. Получатель подтверждает:
   ```
   respond_contact(
     project_key: "c-web-letar",
     to_agent: "<получатель>",
     from_agent: "<твоё-имя>",
     accept: true
   )
   ```
3. После апрува `send_message` между этими двумя агентами проходит без повторной заявки (TTL
   контакта — 30 дней по умолчанию).

Это не связано с тем, зарегистрирован ли получатель под фиксированным kebab-case именем
(`agent_fixed_names_tokens` в памяти) — контакт-апрув требуется даже между двумя легитимными
фиксированными identity, если они ещё не переписывались.

### ⛔ `send_message(to: [...])` отдельно отклоняет kebab-case/описательные имена получателя — баг сервера

Отдельный от contact-approval баг (найдено и трижды воспроизведено 2026-08-09, сессия
`svoichuzhie-dev` → `forms-coordinator`, **после** одобренного контакта — воспроизводится
независимо от статуса контакта). Точный текст ошибки:

```
Error calling tool 'send_message': Invalid recipient 'forms-coordinator': 'forms-coordinator'
looks like a descriptive role name. Agent names must be randomly generated adjective+noun
combinations like 'WhiteMountain' or 'BrownCreek', NOT descriptive of the agent's task. Omit
the 'name' parameter to auto-generate a valid name.
```

Ключевой факт: `request_contact(to_agent: "forms-coordinator")` и
`reply_message(to: ["forms-coordinator"])` с **тем же самым** именем получателя проходят без
проблем — валидация формата имени применяется только к полю `to` в `send_message` (первичном,
не reply), не к `request_contact`/`reply_message`. Это касается любого фиксированного
kebab-case/составного имени, похожего на «описательную роль» (`forms-coordinator`,
предположительно `deploy-agent`-подобные тоже под риском) — не только `forms-coordinator`.

**Обход:**

- Если это первое сообщение в переписке — использовать `request_contact` (он же отправляет
  intro-сообщение) вместо голого `send_message`.
- Если уже есть предыдущее сообщение в треде (от получателя или third-party broadcast) —
  `reply_message` вместо `send_message`.
- `send_message` **с** `to`, где получатель — рандомное adjective+noun имя (`AzureGate` и
  т.п.), проблемы не имеет — баг специфичен для kebab-case/описательных имён в позиции `to`.

Баг не в этом репозитории — это регрессия/особенность самого MCP-сервера agent-mail. Если он
пропадёт при апдейте сервера — переоценить актуальность этого раздела.

⚠️ **2026-08-10: `forms-coordinator` переименован в `QuietRidge`** — настоящее adjective+noun
имя вместо kebab-case, которое и вызывало баг выше. `BlackCove` с самого начала строился по этой
же схеме — не совпадение, а единственный рабочий обход. Упоминания `forms-coordinator` в
примерах бага выше — исторический контекст диагностики, оставлены как есть.
