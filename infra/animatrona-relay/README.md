# Animatrona Relay Server

Приватный libp2p relay для Animatrona на базе Kubo (IPFS). Не публикуется в DHT, доступен только по прямому адресу.

## Текущий деплой

- **Сервер:** 31.56.180.161 (mail.letar.best)
- **Порт:** 41001 (TCP + UDP)
- **PeerId:** `12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA`
- **Multiaddr:** `/ip4/31.56.180.161/tcp/41001/p2p/12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA`

## Характеристики

- **Образ:** `ipfs/kubo:v0.33.0` (lowpower profile)
- **DHT анонс:** отключён (`Advertise: false`)
- **RAM:** ~64-256MB

## Установка на новый сервер

```bash
# 1. Скопировать файлы
scp -r infra/animatrona-relay user@server:/path/

# 2. Запустить setup
cd /path/animatrona-relay
chmod +x setup.sh
./setup.sh

# 3. Скопировать PeerId и обновить libp2p-config.ts
```

## Мониторинг

```bash
# Статус
docker ps | grep animatrona-relay

# Логи
docker logs -f animatrona-relay

# Подключённые пиры
docker exec animatrona-relay ipfs swarm peers

# Использование памяти
docker stats animatrona-relay

# Конфигурация relay
docker exec animatrona-relay ipfs config show | grep -A10 RelayService
```

## Лимиты (оптимизированы для видео 200-2000MB)

| Параметр                | Значение | Описание                        |
| ----------------------- | -------- | ------------------------------- |
| MaxReservations         | 64       | Макс. резерваций relay слотов   |
| MaxCircuits             | 64       | Макс. активных relay соединений |
| ConnectionDataLimit     | 0        | Без лимита данных               |
| ConnectionDurationLimit | 2h       | Макс. длительность соединения   |
| ReservationTTL          | 2h       | TTL резервации                  |
| memory limit (Docker)   | 256MB    | Лимит памяти контейнера         |
