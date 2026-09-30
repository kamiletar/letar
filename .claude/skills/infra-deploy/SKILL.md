---
name: infra-deploy
description: Чеклист подготовки приложения и отправки запроса на деплой координатору deploy-agent-dev
disable-model-invocation: true
---

# Deploy - Запрос деплоя приложения

Подготовь приложение к деплою и отправь запрос Deploy Agent (deploy-agent-dev).

⛔ **Деплой самостоятельно ЗАПРЕЩЁН** — ни `deploy-affected.sh`, ни `docker compose`, ни SSH.
Полная модель координации, шаблон запроса и что делать, если deploy-agent-dev молчит 10 минут —
`.claude/rules/deploy-coordination.md`. Этот файл — только инструкции навыка `/infra-deploy`.

## Когда использовать

- Готов релиз новой версии
- Критичный hotfix
- Обновление зависимостей

## Перед запросом деплоя

Чек-лист — `.claude/rules/deploy-coordination.md` § «Перед запросом деплоя»: коммит, пуш,
`nx lint <app> && nx typecheck:tsgo <app>`, и `nx build <app>` дополнительно — если менял импорт
из `libs/*`.

Также сверься:

- [ ] `CHANGELOG.md` обновлён
- [ ] Версия в `package.json` увеличена
- [ ] Если первый деплой приложения с БД/uploads — бекапы настроены,
      см. [deployment.md § Бэкапы](/.claude/docs/deployment.md#бэкапы)

## Запрос деплоя

Шаблон `send_message` к deploy-agent-dev — `.claude/rules/deploy-coordination.md`.

## После деплоя

- [ ] Приложение доступно, основной функционал работает
- [ ] Нет ошибок в логах (deploy-agent-dev пришлёт их в ответе, если деплой упал)
- [ ] БД подключена, если применимо
- [ ] Бекап БД работает (первый деплой с БД):
      `curl -X POST http://localhost:3100/api/database/backup?db=<app>`

## Документация

Операционные детали (Docker, Traefik, миграции, откат) — [deployment.md](/.claude/docs/deployment.md).
