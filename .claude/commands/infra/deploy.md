# Deploy - Деплой приложений

Выполни деплой приложения на production сервер.

## Когда использовать

- Готов релиз новой версии
- Критичный hotfix
- Обновление зависимостей

## Предварительные проверки

```bash
# 1. Проверка кода
nx format <app>
nx lint <app>              # oxlint → ESLint (автоматически)
nx typecheck:tsgo <app>

# 2. Тесты
nx test <app>
nx e2e <app>-e2e

# 3. Сборка
nx build <app>
```

## Деплой через скрипт

```bash
# Деплой изменённых приложений
./deploy-affected.sh

# Деплой конкретного приложения
./deploy-affected.sh --app=premium-rosstil
```

## Ручной деплой (Docker)

```bash
# 1. На сервере
cd /opt/lena

# 2. Обновить код
git pull

# 3. Пересобрать и запустить
docker compose up -d --build <app>

# 4. Проверить логи
docker logs -f <app>
```

## Чеклист перед деплоем

- [ ] Все тесты проходят
- [ ] Нет ошибок линтера
- [ ] Типы проверены
- [ ] CHANGELOG.md обновлён
- [ ] Версия в package.json увеличена
- [ ] Umami аналитика подключена (`<UmamiScript />` в layout.tsx, env vars в `.env.docker`)
- [ ] Коммит создан и запушен
- [ ] **Бэкапы настроены** (если первый деплой приложения с БД) — см. `deployment-assistant` → «Чеклист: бекапы при деплое»

## Чеклист после деплоя

- [ ] Приложение доступно
- [ ] Основной функционал работает
- [ ] Нет ошибок в логах
- [ ] База данных подключена
- [ ] **Бэкап БД работает** (если приложение с БД): `curl -X POST http://localhost:3100/api/database/backup?db=<app>`

## Откат

```bash
# Откат к предыдущей версии
git checkout HEAD~1
docker compose up -d --build <app>
```

## Документация

Подробнее см. [DEPLOY.md](/DEPLOY.md) и [deployment.md](/.claude/docs/deployment.md)
