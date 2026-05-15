# Инструкции по деплою

## Переменные окружения

Перед деплоем убедись, что все переменные из `.env.example` настроены в production окружении.

### Обязательные

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=...
BETTER_AUTH_URL=https://your-domain.com
```

### Для cron-задач

```env
# Секрет для защиты cron-эндпоинтов
# Генерация: openssl rand -base64 32
CRON_SECRET=your_generated_secret

# Период хранения API логов в днях (по умолчанию 30)
API_LOG_RETENTION_DAYS=30
```

---

## Cron-задачи

### Ротация API логов

Эндпоинт `/api/cron/cleanup-api-logs` удаляет логи старше 30 дней (настраивается через `API_LOG_RETENTION_DAYS`).

**Настройка через crontab:**

```bash
# Ежедневно в 3:00 ночи
0 3 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/cleanup-api-logs >> /var/log/cron-api-logs.log 2>&1
```

**Проверка работы:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/cleanup-api-logs
```

Ожидаемый ответ:

```json
{
  "success": true,
  "deletedCount": 123,
  "retentionDays": 30,
  "cutoffDate": "2025-11-13T00:00:00.000Z"
}
```

---

## Nginx Proxy Manager

### Базовые настройки

| Параметр              | Значение                              |
| --------------------- | ------------------------------------- |
| Scheme                | `http`                                |
| Forward Hostname      | `driving-school-app` (имя контейнера) |
| Forward Port          | `3003`                                |
| Websockets Support    | ✅ **Включить**                       |
| Block Common Exploits | ✅ Включить                           |

### WebSocket для чатов

Socket.IO работает на **отдельном порту 3004**. Для проксирования через тот же домен используй **Custom Locations** в NPM:

| Поле             | Значение             |
| ---------------- | -------------------- |
| Location         | `/socket.io/`        |
| Scheme           | `http`               |
| Forward Hostname | `driving-school-app` |
| Forward Port     | **`3004`**           |

В текстовое поле (Custom Nginx Configuration):

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;
proxy_buffering off;
proxy_cache off;
```

**Переменная окружения** (`.env.docker`):

```env
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
```

> ⚠️ **Важно:** Порт 3004, не 3003! Socket.IO сервер запускается отдельно от Next.js

### Проверка WebSocket

После настройки проверь работу чатов:

1. Открой чат в браузере
2. В DevTools → Network → WS должно быть соединение `socket.io`
3. Статус должен быть `101 Switching Protocols`

---

## Чеклист деплоя

- [ ] Настроены все env-переменные
- [ ] База данных доступна и миграции применены
- [ ] `CRON_SECRET` сгенерирован и добавлен
- [ ] Cron-задача для ротации логов настроена
- [ ] Nginx Proxy Manager настроен с WebSocket support
- [ ] SSL-сертификат настроен
- [ ] WebSocket/чаты работают (проверить в DevTools)
- [ ] Проверена работа OAuth (Google, Yandex, VK, Telegram)
- [ ] Push-уведомления настроены (VAPID keys)
- [ ] Email-сервер настроен (SMTP)
