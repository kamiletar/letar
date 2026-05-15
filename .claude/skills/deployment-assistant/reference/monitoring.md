# Monitoring

## Структура мониторинга

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Приложения    │───▶│   Metrics    │───▶│  Dashboard  │
│  (Next.js)      │    │  (Prometheus)│    │  (Grafana)  │
└─────────────────┘    └──────────────┘    └─────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐    ┌──────────────┐
│     Logs        │    │    Alerts    │
│   (Loki/files)  │    │  (Telegram)  │
└─────────────────┘    └──────────────┘
```

## Docker logging

```yaml
# docker-compose.production.yml
services:
  app:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '5'
        labels: 'app,environment'
    labels:
      app: 'premium-rosstil'
      environment: 'production'
```

## Просмотр логов

```bash
# Логи конкретного сервиса
docker compose -f apps/premium-rosstil/docker-compose.production.yml logs -f app

# Последние 100 строк
docker compose logs --tail=100 app

# Логи за последний час
docker compose logs --since 1h app

# Фильтрация по паттерну
docker compose logs app 2>&1 | grep -i error

# Логи всех сервисов
docker compose logs -f
```

## Prometheus метрики

```typescript
// lib/metrics.ts
import client from 'prom-client'

// Счётчик HTTP запросов
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
})

// Гистограмма времени ответа
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
})

// Gauge для активных соединений
export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
})

// Собрать дефолтные метрики Node.js
client.collectDefaultMetrics()
```

```typescript
// app/api/metrics/route.ts
import client from 'prom-client'

export async function GET() {
  const metrics = await client.register.metrics()

  return new Response(metrics, {
    headers: { 'Content-Type': client.register.contentType },
  })
}
```

## Prometheus конфигурация

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nextjs-apps'
    static_configs:
      - targets:
          - 'premium-rosstil:3000'
          - 'imot:3001'
          - 'dashboard:3002'
    metrics_path: '/api/metrics'

  - job_name: 'docker'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

## Alerting (Alertmanager)

```yaml
# alertmanager.yml
global:
  telegram_api_url: 'https://api.telegram.org'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: ${TELEGRAM_CHAT_ID}
        parse_mode: 'HTML'
        message: |
          🚨 <b>{{ .Status | toUpper }}</b>
          {{ range .Alerts }}
          <b>{{ .Labels.alertname }}</b>
          {{ .Annotations.summary }}
          {{ end }}

route:
  receiver: 'telegram'
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
```

## Alert rules

```yaml
# prometheus/rules/alerts.yml
groups:
  - name: app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate on {{ $labels.app }}'
          description: 'Error rate is {{ $value }} requests/sec'

      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Slow responses on {{ $labels.app }}'
          description: '95th percentile is {{ $value }}s'

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 500
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage on {{ $labels.app }}'
          description: 'Memory usage is {{ $value }}MB'

      - alert: AppDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: '{{ $labels.job }} is down'
```

## Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Next.js Applications",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (app)",
            "legendFormat": "{{ app }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~'5..'}[5m])) by (app) / sum(rate(http_requests_total[5m])) by (app)",
            "legendFormat": "{{ app }}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, app))",
            "legendFormat": "{{ app }}"
          }
        ]
      }
    ]
  }
}
```

## Простой мониторинг без Prometheus

```bash
#!/bin/bash
# scripts/simple-monitor.sh

LOG_FILE="/var/log/monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=80

while true; do
  timestamp=$(date +"%Y-%m-%d %H:%M:%S")

  # CPU usage
  cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

  # Memory usage
  mem=$(free | grep Mem | awk '{print $3/$2 * 100.0}')

  # Disk usage
  disk=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')

  # Docker containers status
  containers=$(docker ps --format "{{.Names}}: {{.Status}}" | tr '\n' ', ')

  echo "$timestamp | CPU: ${cpu}% | MEM: ${mem%.*}% | DISK: ${disk}% | $containers" >> $LOG_FILE

  # Alerts
  if (( $(echo "$cpu > $ALERT_THRESHOLD_CPU" | bc -l) )); then
    send_alert "High CPU: ${cpu}%"
  fi

  if (( $(echo "$mem > $ALERT_THRESHOLD_MEM" | bc -l) )); then
    send_alert "High Memory: ${mem%.*}%"
  fi

  sleep 60
done

send_alert() {
  local message=$1
  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d "chat_id=$CHAT_ID" \
    -d "text=🚨 $message"
}
```

## Log rotation

```bash
# /etc/logrotate.d/docker-apps
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

## Structured logging

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  base: {
    app: process.env.APP_NAME,
    env: process.env.NODE_ENV,
  },
})

// Использование
logger.info({ userId: user.id, action: 'login' }, 'User logged in')
logger.error({ err, orderId }, 'Payment failed')
```

## docker-compose с мониторингом

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    ports:
      - '9090:9090'
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - '3030:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - '9093:9093'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - '8080:8080'

volumes:
  prometheus_data:
  grafana_data:
```

## Правила

- **MUST** логировать все критичные операции
- **MUST** настроить alerts для критичных метрик
- **SHOULD** использовать structured logging
- **SHOULD** хранить логи минимум 7 дней
- **NEVER** логировать чувствительные данные (пароли, токены)
