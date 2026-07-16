# Animatrona Pinner (pinner1)

IPFS-пиннер (Kubo) на `mail.letar.best` — пинит контент по запросу трекера, API защищён
bearer-токеном.

## Текущий деплой

- **Сервер:** mail.letar.best (193.37.68.73)
- **Swarm:** 43001 (TCP + UDP, не конфликтует с relay `41001`)
- **API:** `5011` — открыт наружу, доступ только через bearer-токен (`API.Authorizations`)
- **PeerId:** `12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j`

## Характеристики

- **Образ:** `ipfs/kubo:v0.41.0` (`lowpower` profile), `GOMAXPROCS=1` — второе ядро сервера
  отдано relay/другим сервисам
- **Routing:** `dhtclient`
- **Peering:** relay + gateway + pinner3 (без списанного pinner2, см. комментарий в `setup.sh`)
- **CPU/RAM:** 1 CPU, лимит 512M (docker-compose v1 на этом сервере — `cpus`/`mem_limit`, не
  `deploy.resources`)

## Установка / переинициализация

```bash
scp -r infra/animatrona-pinner user@mail.letar.best:/path/
cd /path/animatrona-pinner
bash setup.sh
```

`setup.sh` генерирует новый `AUTH_TOKEN` (`openssl rand -hex 32`) при каждом запуске — **скопировать
из вывода**, он нужен для регистрации сервера в трекере (Админ → Пин-серверы → Добавить сервер) и
не сохраняется скриптом. Также настраивает peering/bootstrap и печатает команды, которыми нужно
добавить этот пиннер в `Peering.Peers` на gateway (взаимный peering — односторонний недостаточен).

⚠️ Если запускается повторно на уже работающем пиннере — токен сменится, старый перестанет
приниматься, обновить в трекере.

## Мониторинг

```bash
docker ps | grep animatrona-pinner
docker logs -f animatrona-pinner
docker exec animatrona-pinner ipfs swarm peers
```

## Связанные узлы

`infra/animatrona-relay/README.md` (relay), `infra/animatrona-gateway/` (gateway),
`infra/animatrona-pinner3/` (второй пиннер + pin-queue). Общий дизайн сети — корневой `PLAN.md`
§15.4.
