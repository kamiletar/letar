# Health Checks

## API endpoint для health check

```typescript
// app/api/health/route.ts
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: boolean
    redis?: boolean
    storage?: boolean
  }
  uptime: number
}

const startTime = Date.now()

export async function GET(): Promise<Response> {
  const checks = {
    database: false,
    // redis: false,
    // storage: false,
  }

  // Проверка базы данных
  try {
    const db = await getEnhancedPrisma()
    await db.$queryRaw`SELECT 1`
    checks.database = true
  } catch (e) {
    console.error('Database health check failed:', e)
  }

  // Проверка Redis (если используется)
  // try {
  //   await redis.ping()
  //   checks.redis = true
  // } catch (e) {
  //   console.error('Redis health check failed:', e)
  // }

  // Проверка файлового хранилища
  // try {
  //   await fs.access(process.env.UPLOAD_DIR!)
  //   checks.storage = true
  // } catch (e) {
  //   console.error('Storage health check failed:', e)
  // }

  const allHealthy = Object.values(checks).every(Boolean)
  const someHealthy = Object.values(checks).some(Boolean)

  const status: HealthStatus = {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0',
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }

  const statusCode = allHealthy ? 200 : someHealthy ? 200 : 503

  return NextResponse.json(status, { status: statusCode })
}
```

## Docker health check

```dockerfile
# Dockerfile.production
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

```yaml
# docker-compose.production.yml
services:
  app:
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped

  postgres:
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
```

## Liveness vs Readiness

```typescript
// app/api/health/live/route.ts
// Liveness: приложение запущено и работает
export async function GET() {
  return Response.json({ status: 'alive' })
}

// app/api/health/ready/route.ts
// Readiness: приложение готово принимать трафик
export async function GET() {
  try {
    const db = await getEnhancedPrisma()
    await db.$queryRaw`SELECT 1`
    return Response.json({ status: 'ready' })
  } catch {
    return Response.json({ status: 'not ready' }, { status: 503 })
  }
}
```

## Nginx health check

```nginx
# nginx.conf
upstream app {
    server app:3000 max_fails=3 fail_timeout=30s;
}

server {
    location /health {
        proxy_pass http://app/api/health;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }

    location / {
        proxy_pass http://app;

        # Retry на другой upstream при ошибке
        proxy_next_upstream error timeout http_503;
    }
}
```

## Мониторинг health checks

```bash
#!/bin/bash
# scripts/check-health.sh

APPS=("premium-rosstil:3000" "imot:3001" "dashboard:3002")

for app_port in "${APPS[@]}"; do
  IFS=':' read -r app port <<< "$app_port"

  response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$port/api/health")

  if [ "$response" != "200" ]; then
    echo "❌ $app is unhealthy (HTTP $response)"
    # Отправить алерт
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"🚨 $app health check failed (HTTP $response)\"}"
  else
    echo "✅ $app is healthy"
  fi
done
```

## Cron для регулярных проверок

```bash
# /etc/cron.d/health-check
*/5 * * * * root /var/www/lena/scripts/check-health.sh >> /var/log/health-check.log 2>&1
```

## Детальный health check

```typescript
// app/api/health/detailed/route.ts
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()

  // Детальная информация только для админов
  if (session?.user?.role !== 'ADMIN') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const details = {
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: '***hidden***',
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    },
    database: await getDatabaseStats(),
    connections: await getActiveConnections(),
  }

  return Response.json(details)
}

async function getDatabaseStats() {
  const db = await getEnhancedPrisma()
  const [users, products, orders] = await Promise.all([db.user.count(), db.product.count(), db.order.count()])
  return { users, products, orders }
}

async function getActiveConnections() {
  const db = await getEnhancedPrisma()
  const result = await db.$queryRaw<[{ count: bigint }]>`
    SELECT count(*) FROM pg_stat_activity
    WHERE datname = current_database()
  `
  return Number(result[0].count)
}
```

## Graceful shutdown

```typescript
// instrumentation.ts (Next.js)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Graceful shutdown
    const signals = ['SIGTERM', 'SIGINT']
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, shutting down gracefully...`)

        // Закрыть соединения с БД
        await prisma.$disconnect()

        process.exit(0)
      })
    })
  }
}
```

## Health check в deploy-affected.sh

```bash
#!/bin/bash

wait_for_healthy() {
  local app=$1
  local port=$2
  local max_attempts=30
  local attempt=0

  echo "Waiting for $app to become healthy..."

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "http://localhost:$port/api/health" > /dev/null; then
      echo "✅ $app is healthy"
      return 0
    fi

    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts - waiting..."
    sleep 2
  done

  echo "❌ $app failed to become healthy"
  return 1
}

# После запуска контейнера
docker compose -f apps/$APP/docker-compose.production.yml up -d

# Ждать health check
if ! wait_for_healthy "$APP" "$PORT"; then
  echo "Rolling back..."
  docker compose -f apps/$APP/docker-compose.production.yml down
  # Восстановить предыдущую версию
  exit 1
fi
```

## Правила

- **MUST** иметь `/api/health` endpoint в каждом приложении
- **MUST** проверять критичные зависимости (БД, cache)
- **SHOULD** разделять liveness и readiness проверки
- **SHOULD** возвращать 503 при unhealthy статусе
- **NEVER** выставлять детальную информацию без авторизации
