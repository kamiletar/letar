# Changelog

## 0.1.1 — 2026-10-27

### Исправлено

- `createSecretHttpClient` больше не переиспользует соединения (`keepalive: false`). После рестарта
  docker и перезагрузки s2 долгоживущие MCP-процессы брали из пула fetch у Bun мёртвый keep-alive
  сокет. `studio_project_list`/`studio_recurring_list` получали «HTTP 404: 404 page not found»,
  затем `ECONNRESET`, хотя studio работал. Добавлен `secret-http-client.spec.ts`.
