# Отладка мелькающих окон терминала

## Проблема

При работе Claude Code появляются ~20 окон терминала на секунду. Предположительно — хуки, запускающие node/python/bash процессы.

## Что отключено (текущее состояние)

Все хуки и плагины с хуками **отключены**. Оригиналы сохранены:

- `C:/web/lena/.claude/settings.json.bak`
- `C:/Users/Kami/.claude/settings.json.bak`

### Проектные хуки (`.claude/settings.json`)

Секция `"hooks": {}` — пустая. Было:

- **SessionStart:** `node .claude/hooks/start-agent-mail.js`
- **PreToolUse (Bash):** `node .claude/hooks/validate-bash.js` + `node .claude/hooks/kill-e2e-port.js`
- **PostToolUse (Write|Edit):** `node .claude/hooks/auto-format.js`

### Плагины с хуками (глобальный `settings.json`)

Отключены (`false`):

- **hookify** — Pre/Post/Stop/UserPromptSubmit на ВСЕ инструменты (python3)
- **context-mode** — PreToolUse на Bash/Read/Grep/WebFetch/Task (bash)
- **security-guidance** — PreToolUse на Edit/Write/MultiEdit (python3)

## План тестирования — включать по одному

После перезапуска сессии включать по одному, проверять мелькание окон.

| #   | Что                     | Тип    | Файл настроек                                       | Как включить                                        |
| --- | ----------------------- | ------ | --------------------------------------------------- | --------------------------------------------------- |
| 1   | **hookify**             | плагин | `~/.claude/settings.json`                           | `"hookify@claude-plugins-official": true`           |
| 2   | **context-mode**        | плагин | `~/.claude/settings.json` + `.claude/settings.json` | `"context-mode@claude-context-mode": true` в обоих  |
| 3   | **security-guidance**   | плагин | `~/.claude/settings.json`                           | `"security-guidance@claude-plugins-official": true` |
| 4   | **validate-bash.js**    | проект | `.claude/settings.json`                             | Добавить PreToolUse Bash хук                        |
| 5   | **kill-e2e-port.js**    | проект | `.claude/settings.json`                             | Добавить PreToolUse Bash хук                        |
| 6   | **auto-format.js**      | проект | `.claude/settings.json`                             | Добавить PostToolUse Write\|Edit хук                |
| 7   | **start-agent-mail.js** | проект | `.claude/settings.json`                             | Добавить SessionStart хук                           |

## Частота срабатывания хуков (до отключения)

### На каждый Bash — 4 процесса:

1. `node .claude/hooks/validate-bash.js`
2. `node .claude/hooks/kill-e2e-port.js`
3. `bash pretooluse.sh` (context-mode)
4. `python3 pretooluse.py` (hookify)

### На каждый Write/Edit — 4 процесса:

1. `node .claude/hooks/auto-format.js`
2. `python3 pretooluse.py` (hookify PreToolUse)
3. `python3 posttooluse.py` (hookify PostToolUse)
4. `python3 security_reminder_hook.py` (security-guidance)

### На каждый Read/Grep — 2 процесса:

1. `bash pretooluse.sh` (context-mode)
2. `python3 pretooluse.py` (hookify)

### Hookify — на ВСЁ (без matcher):

- `python3 pretooluse.py` — каждый PreToolUse
- `python3 posttooluse.py` — каждый PostToolUse
- `python3 stop.py` — при остановке
- `python3 userpromptsubmit.py` — при отправке промпта

## Как восстановить всё обратно

```bash
cp C:/web/lena/.claude/settings.json.bak C:/web/lena/.claude/settings.json
cp C:/Users/Kami/.claude/settings.json.bak C:/Users/Kami/.claude/settings.json
```

## Результаты тестирования

| #   | Компонент           | Окна мелькают? | Заметки |
| --- | ------------------- | -------------- | ------- |
| 1   | hookify             |                |         |
| 2   | context-mode        |                |         |
| 3   | security-guidance   |                |         |
| 4   | validate-bash.js    |                |         |
| 5   | kill-e2e-port.js    |                |         |
| 6   | auto-format.js      |                |         |
| 7   | start-agent-mail.js |                |         |
