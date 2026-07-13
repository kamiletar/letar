# Nginx Proxy Manager

## Добавление нового приложения

### Основные настройки

| Поле                  | Значение                               |
| --------------------- | -------------------------------------- |
| Domain Names          | `your-domain.com`                      |
| Scheme                | `http`                                 |
| Forward Hostname      | Имя контейнера (`premium-rosstil-app`) |
| Forward Port          | Порт приложения (3000, 3001, etc.)     |
| Block Common Exploits | ✅                                     |
| Websockets Support    | ✅                                     |

### SSL Certificate

1. Выбери вкладку **SSL**
2. Выбери **Request a new SSL Certificate**
3. ✅ Force SSL
4. ✅ HTTP/2 Support
5. Email для Let's Encrypt

### Важно!

- **Forward Hostname** — имя контейнера из docker-compose (не localhost!)
- Контейнер NPM должен быть в той же сети, что и приложение

## Advanced конфигурации

### SSE / Real-time (dashboard)

```nginx
# В Advanced tab
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;

# Для SSE
proxy_set_header Connection '';
proxy_http_version 1.1;
chunked_transfer_encoding off;
```

### Увеличение лимита загрузки

```nginx
# Для загрузки файлов (10MB)
client_max_body_size 10m;

# Для больших файлов (100MB)
client_max_body_size 100m;
```

### Кэширование статики

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### CORS headers

```nginx
add_header Access-Control-Allow-Origin * always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
```

## Docker Compose для NPM

```yaml
services:
  npm:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '81:81' # Admin UI
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - kami-network
      - imot-network
      - mandala-network

networks:
  kami-network:
    external: true
  imot-network:
    external: true
  mandala-network:
    external: true
```

## Подключение к сетям

NPM должен быть подключён ко всем сетям приложений:

```bash
# Подключить NPM к сетям
docker network connect kami-network nginx-proxy-manager
docker network connect imot-network nginx-proxy-manager
docker network connect mandala-network nginx-proxy-manager

# Проверить подключения
docker inspect nginx-proxy-manager | grep -A 20 Networks
```

## Типичные проблемы

### 502 Bad Gateway

1. Проверь что контейнер приложения запущен:

   ```bash
   docker ps | grep app-name
   ```

2. Проверь что NPM в той же сети:

   ```bash
   docker network inspect kami-network
   ```

3. Проверь Forward Hostname — должен быть **имя контейнера**, не IP

### SSL не работает

1. Проверь что порт 80 открыт (для ACME challenge)
2. Проверь DNS записи
3. Попробуй Force Renew в NPM

### WebSocket не работает

1. Включи **Websockets Support** в настройках прокси
2. Добавь в Advanced:
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

## Порты приложений

| Приложение      | Контейнер           | Порт |
| --------------- | ------------------- | ---- |
| premium-rosstil | premium-rosstil-app | 3000 |
| imot            | imot-app            | 3001 |
| dashboard       | dashboard-app       | 3002 |
| driving-school  | driving-school-app  | 3003 |
| mandala         | mandala-app         | 3004 |
| kami            | kami-app            | 3005 |
| dsperevod       | dsperevod-app       | 3019 |
| aboi            | aboi-app            | 3019 |
