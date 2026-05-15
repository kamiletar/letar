---
alwaysApply: true
---

# Координация деплоя через Deploy Agent

## ⛔ Прямой деплой ЗАПРЕЩЁН

⛔ **НИКОГДА** не запускай `deploy-affected.sh`, `docker compose`, SSH-деплой самостоятельно.
⛔ Даже если пользователь пишет «деплой» — отправь запрос BlackCove, а не деплой сам.
⛔ Единственное исключение — явное разрешение пользователя после 10 минут молчания BlackCove.

Вместо этого отправь запрос Deploy Agent (BlackCove) через Agent Mail.

## Как запросить деплой

```
send_message(
  project_key: "app-c-web-letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: <app-name>",
  body_md: "app: <app-name>\nreason: <что сделал>\ncommit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

## Перед запросом деплоя

1. **Закоммить** все изменения: `git add apps/<app>/ && git commit`
2. **Запушить**: `git push`
3. **Проверь качество**: `nx lint <app> && nx typecheck:tsgo <app>`
4. Только потом отправляй запрос

## Ожидание результата

После отправки запроса:

- Продолжай работу над другими задачами
- DeployAgent ответит через `reply_message` когда деплой завершится
- Проверяй inbox периодически

## Если Deploy Agent не отвечает

Если прошло больше 10 минут и нет ответа:

1. Проверь `fetch_inbox` — может быть ответ уже пришёл
2. Спроси пользователя: "Deploy Agent не отвечает, запустить деплой самостоятельно?"
3. Только с явного разрешения пользователя деплой напрямую

## Исключение

Если ты сам Deploy Agent (имя агента = `BlackCove`) — ты выполняешь деплой напрямую по SSH.
