# Rollback Procedures

## Быстрый откат (Docker)

```bash
#!/bin/bash
# scripts/rollback.sh

APP=$1
if [ -z "$APP" ]; then
  echo "Usage: ./rollback.sh <app-name>"
  exit 1
fi

cd /var/www/lena

# Получить предыдущий коммит
CURRENT_COMMIT=$(cat .last-deploy/$APP 2>/dev/null)
PREV_COMMIT=$(git log --format="%H" -2 | tail -1)

echo "Current deployed: $CURRENT_COMMIT"
echo "Rolling back to: $PREV_COMMIT"

# Откат кода
git checkout $PREV_COMMIT -- apps/$APP/

# Пересборка и деплой
./deploy-affected.sh --app $APP --skip-git

# Обновить файл последнего деплоя
echo $PREV_COMMIT > .last-deploy/$APP

echo "✅ Rollback completed"
```

## Откат с сохранением образа

```bash
#!/bin/bash
# scripts/rollback-image.sh

APP=$1

# Список доступных образов
echo "Available images:"
docker images --filter "reference=${APP}*" --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"

# Выбор версии
read -p "Enter tag to rollback to: " TAG

# Откат
docker compose -f apps/$APP/docker-compose.production.yml down
docker tag $APP:$TAG $APP:latest
docker compose -f apps/$APP/docker-compose.production.yml up -d

# Health check
./scripts/check-health.sh $APP
```

## Версионирование Docker образов

```yaml
# docker-compose.production.yml
services:
  app:
    image: premium-rosstil:${VERSION:-latest}
    build:
      context: .
      dockerfile: Dockerfile.production
      args:
        - VERSION=${VERSION:-latest}
```

```bash
# Сборка с версией
VERSION=$(git rev-parse --short HEAD) docker compose build

# Тегирование
docker tag premium-rosstil:latest premium-rosstil:$(git rev-parse --short HEAD)
docker tag premium-rosstil:latest premium-rosstil:$(date +%Y%m%d)

# Откат на конкретную версию
VERSION=abc1234 docker compose up -d
```

## Blue-Green Deployment

```yaml
# docker-compose.production.yml
services:
  app-blue:
    image: premium-rosstil:${BLUE_VERSION:-latest}
    expose:
      - '3000'
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.app-blue.rule=Host(`example.com`)'
      - 'traefik.http.routers.app-blue.priority=${BLUE_PRIORITY:-1}'

  app-green:
    image: premium-rosstil:${GREEN_VERSION:-latest}
    expose:
      - '3000'
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.app-green.rule=Host(`example.com`)'
      - 'traefik.http.routers.app-green.priority=${GREEN_PRIORITY:-0}'
```

```bash
#!/bin/bash
# scripts/blue-green-deploy.sh

CURRENT_COLOR=$(cat .current-color 2>/dev/null || echo "blue")
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_COLOR, Deploying to: $NEW_COLOR"

# Собрать новую версию
docker compose build app-$NEW_COLOR

# Запустить новую версию
docker compose up -d app-$NEW_COLOR

# Проверить health
if ! wait_for_healthy "app-$NEW_COLOR" 3000; then
  echo "New version unhealthy, keeping old version"
  docker compose stop app-$NEW_COLOR
  exit 1
fi

# Переключить трафик
if [ "$NEW_COLOR" = "green" ]; then
  export GREEN_PRIORITY=10
  export BLUE_PRIORITY=1
else
  export BLUE_PRIORITY=10
  export GREEN_PRIORITY=1
fi

# Обновить Traefik конфигурацию
docker compose up -d

# Сохранить текущий цвет
echo $NEW_COLOR > .current-color

# Остановить старую версию через 30 секунд
sleep 30
docker compose stop app-$CURRENT_COLOR

echo "✅ Switched to $NEW_COLOR"
```

## Откат базы данных

```bash
#!/bin/bash
# scripts/db-rollback.sh

APP=$1
BACKUP_FILE=$2

if [ -z "$BACKUP_FILE" ]; then
  # Показать доступные backups
  echo "Available backups:"
  ls -la /backups/${APP}_*.dump
  exit 0
fi

echo "⚠️  This will restore database from $BACKUP_FILE"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled"
  exit 1
fi

# Остановить приложение
docker compose -f apps/$APP/docker-compose.production.yml stop app

# Восстановить базу
docker compose -f apps/$APP/docker-compose.production.yml exec -T postgres \
  pg_restore -U postgres -d ${APP//-/_} -c < $BACKUP_FILE

# Запустить приложение
docker compose -f apps/$APP/docker-compose.production.yml start app

echo "✅ Database restored from $BACKUP_FILE"
```

## Автоматический rollback при ошибке

```bash
#!/bin/bash
# deploy-affected.sh (фрагмент)

deploy_with_rollback() {
  local app=$1
  local prev_commit=$(cat .last-deploy/$app 2>/dev/null)

  # Backup базы
  backup_database $app

  # Сборка и деплой
  if ! docker compose -f apps/$app/docker-compose.production.yml up -d --build; then
    echo "Build failed, rolling back..."
    rollback_to_commit $app $prev_commit
    return 1
  fi

  # Health check
  if ! wait_for_healthy $app; then
    echo "Health check failed, rolling back..."
    rollback_to_commit $app $prev_commit
    restore_database $app
    return 1
  fi

  # Сохранить коммит
  git rev-parse HEAD > .last-deploy/$app

  echo "✅ Deploy successful"
}

rollback_to_commit() {
  local app=$1
  local commit=$2

  git checkout $commit -- apps/$app/
  docker compose -f apps/$app/docker-compose.production.yml up -d --build
}

restore_database() {
  local app=$1
  local latest_backup=$(ls -t /backups/${app}_*.dump | head -1)

  docker compose -f apps/$app/docker-compose.production.yml exec -T postgres \
    pg_restore -U postgres -d ${app//-/_} -c < $latest_backup
}
```

## Canary Deployment

```yaml
# docker-compose.production.yml с весами
services:
  app-stable:
    image: premium-rosstil:stable
    deploy:
      replicas: 9

  app-canary:
    image: premium-rosstil:canary
    deploy:
      replicas: 1
```

```bash
#!/bin/bash
# scripts/canary-deploy.sh

# Деплой canary (10% трафика)
docker compose up -d app-canary

# Мониторинг ошибок
for i in {1..60}; do
  error_rate=$(curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[1m])" | jq '.data.result[0].value[1]')

  if (( $(echo "$error_rate > 0.01" | bc -l) )); then
    echo "Error rate too high ($error_rate), rolling back canary"
    docker compose stop app-canary
    exit 1
  fi

  sleep 10
done

# Canary успешен — полный rollout
echo "Canary successful, promoting to stable"
docker tag premium-rosstil:canary premium-rosstil:stable
docker compose up -d --scale app-stable=10 --scale app-canary=0
```

## Feature flags для rollback

```typescript
// lib/features.ts
export const features = {
  newCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',
  v2Api: process.env.FEATURE_V2_API === 'true',
}

// Использование
if (features.newCheckout) {
  return <NewCheckout />
} else {
  return <OldCheckout />
}
```

```bash
# Быстрый откат фичи без редеплоя
docker compose exec app \
  sh -c "export FEATURE_NEW_CHECKOUT=false && pm2 restart all"
```

## Чеклист перед rollback

- [ ] Определить причину проблемы
- [ ] Проверить что откат решит проблему
- [ ] Создать backup текущего состояния
- [ ] Уведомить команду о rollback
- [ ] Выполнить rollback
- [ ] Проверить health checks
- [ ] Проверить критичные функции
- [ ] Задокументировать причину и решение

## Правила

- **MUST** иметь backup перед любым rollback
- **MUST** тестировать rollback процедуры регулярно
- **SHOULD** использовать версионирование образов
- **SHOULD** автоматизировать rollback при сбое health check
- **NEVER** делать rollback без понимания причины проблемы
