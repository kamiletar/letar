---
description: Чеклист подготовки приложения и отправки запроса на деплой координатору BlackCove
---

# Deploy - Запрос деплоя приложения

Подготовь приложение к деплою и отправь запрос Deploy Agent (BlackCove).

⛔ **Деплой самостоятельно ЗАПРЕЩЁН** — ни `deploy-affected.sh`, ни `docker compose`, ни SSH.
Полная модель координации, шаблон запроса и что делать, если BlackCove молчит 10 минут —
`.claude/rules/deploy-coordination.md`. Этот файл — только контекст для команды `/infra:deploy`.

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
      см. `deployment-assistant` skill § «Чеклист: бекапы при деплое нового приложения»

## Запрос деплоя

Шаблон `send_message` к BlackCove — `.claude/rules/deploy-coordination.md`.

## После деплоя

- [ ] Приложение доступно, основной функционал работает
- [ ] Нет ошибок в логах (BlackCove пришлёт их в ответе, если деплой упал)
- [ ] БД подключена, если применимо
- [ ] Бекап БД работает (первый деплой с БД):
      `curl -X POST http://localhost:3100/api/database/backup?db=<app>`

## Документация

Операционные детали (Docker, nginx, миграции, откат) — skill `deployment-assistant`
и [deployment.md](/.claude/docs/deployment.md).
