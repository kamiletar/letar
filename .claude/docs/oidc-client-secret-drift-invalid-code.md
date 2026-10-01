# `?error=invalid_code` при входе через Ключницу: секрет клиента разошёлся с хабом

## Симптом

После клика «Войти» приложение-потребитель (hub-client) открывается с `/?error=invalid_code`.
Better Auth отдаёт этот код на **любое** исключение при обмене кода на токен, поэтому по самому
коду причину не определить.

## Диагностика

1. Лог контейнера приложения (`docker logs <app>-app-N` на s2): строка `[Better Auth]` с
   `error: 'invalid_client'`, `error_description: 'invalid client_secret'` — секрет не принят.
2. ⚠️ **Не проверяй секрет запросом на `/oauth2/token` с фиктивным кодом.** Ключница сначала
   проверяет код и отвечает `invalid_grant: invalid code` при любом секрете — ложная зелёная
   проверка. Верный способ — `/oauth2/introspect` с `client_id` + `client_secret` и любым
   `token`: неверный секрет даёт `400 invalid_client`, верный — `200 {"active":false}`.
3. Источник истины — `OIDC_<APP>_SECRET` в `apps/auth-hub/.env.docker.enc` (из него seed
   записывает клиента в БД Ключницы). Сравнивай хеши расшифрованных значений, не сами секреты.

## Починка

```bash
scripts/sops-env-set.sh <app> docker OIDC_CLIENT_SECRET <значение из OIDC_<APP>_SECRET хаба>
```

Дальше обычный deploy-request: контейнер пересоздаётся с расшифрованным `.env.docker`. Секрет
хаба при этом не меняется, seed не нужен.

См. также [env-files](/.claude/rules/env-files.md): секреты OIDC-клиентов общие для Ключницы и
приложения, новый ключ взамен существующего ломает вход.
