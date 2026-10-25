# Agent Mail — установка сервера координации агентов

## Локальная политика контактов

С 2026-10-26 по поручению Kami default `Agent.contact_policy` — `open`: новые агенты принимают
сообщения без отдельного вызова `set_contact_policy` при каждом старте. Явные `block_all` и
`contacts_only` не переписываются. `attachments_policy` этот патч не меняет.

Апстрим задаёт `auto` в Python-модели и не предоставляет настройку этого default через
окружение. `open_contact_default.py` меняет только это поле, проверяя структуру исходника;
при несовместимом изменении апстрима останавливается. Повторное применение безопасно.

Сборка образа с закреплённой текущей версией апстрима:

```powershell
docker build -t letar/agent-mail:open-default infra/agent-mail
python -X utf8 -m unittest discover -s infra/agent-mail -p test_open_contact_default.py
```

При пересоздании контейнера указывай **`letar/agent-mail:open-default`** вместо чистого
`ghcr.io/dicklesworthstone/mcp_agent_mail:latest`; сохрани существующие env, сеть, алиас,
публикацию порта и volume `/data`. Версию апстрима обновляй отдельно через `BASE_IMAGE`
после проверки патча. Образ не содержит рабочую БД и токены.

На работающий контейнер патч можно установить без пересоздания (затем требуется restart):

```powershell
Get-Content -Raw infra/agent-mail/open_contact_default.py |
  docker exec -i mcp_agent_mail-agent-mail-1 /app/.venv/bin/python -
docker restart mcp_agent_mail-agent-mail-1
```

Это применено к текущему контейнеру. Изменение переживает restart; при пересоздании нужен
указанный выше образ. Исходник модели до патча сохранён рядом как `models.py.before-open`.

Разовая миграция существующих агентов требует отдельного решения владельца. В текущей
сессии он разрешил перевести **только `auto` проекта `c-web-letar`**; выполнено для 168 записей.
Для повторения после отдельного согласования добавь к команде патча
`--migrate-auto --project c-web-letar`. Скрипт делает SQLite backup в `/data/backups/` и
обновляет только `auto` выбранного проекта. При отсутствии подходящих записей ничего не меняет.
Backup содержит секреты БД: не выводить его содержимое и не коммитить.

## Первичная установка исходников

`setup.sh` — разовый скрипт установки [mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail)
(сервер координации нескольких Claude Code агентов, используется через MCP — см.
`.claude/rules/agent-mail.md`).

## Что делает

```bash
./setup.sh
```

Клонирует `mcp_agent_mail` в подкаталог (если ещё не склонирован), создаёт venv (`uv venv -p
3.14`), ставит зависимости (`uv sync`). Требует установленный `uv`.

## Запуск после установки

```bash
scripts/start-agent-mail.sh
```

(скрипт запуска — внутри клонированного `mcp_agent_mail`, не в этом каталоге).

## Идемпотентность

Скрипт безопасно перезапускать — клонирование пропускается, если каталог `mcp_agent_mail` уже
существует (`git clone` не переписывает существующий чекаут).
