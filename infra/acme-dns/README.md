# acme-dns

Крошечный авторитативный DNS-сервер, который умеет ровно одно: отдавать `TXT`-записи для
ACME-челленджей. Нужен, чтобы выпускать wildcard-сертификат `*.letar.best` через DNS-01, **не
обращаясь к API регистратора** — ни при выпуске, ни при продлении каждые 90 дней, ни при
добавлении нового поддомена.

Трек и обоснование выбора — [PLAN-INFRA.md §48](/PLAN-INFRA.md).

## Как это работает

В зоне `letar.best` (панель Dynadot) однократно создаются три записи:

| Поддомен          | Тип     | Значение                 | Зачем                                                      |
| ----------------- | ------- | ------------------------ | ---------------------------------------------------------- |
| `acme`            | `A`     | IP сервера с acme-dns    | glue для делегирования                                     |
| `acme`            | `NS`    | `acme.letar.best`        | делегирует подзону самому acme-dns                         |
| `_acme-challenge` | `CNAME` | `<uuid>.acme.letar.best` | уводит челлендж в acme-dns; `<uuid>` — из шага регистрации |

Вторая строка выглядит странно — подзона делегируется сама на себя. Так и задумано, это штатная
схема из README acme-dns: `A`-запись в родительской зоне служит glue-записью.

После этого Let's Encrypt при проверке `_acme-challenge.letar.best` идёт по `CNAME` в acme-dns, а
ACME-клиент (lego внутри Traefik) кладёт туда `TXT` через HTTP API. Регистратор в этой цепочке не
участвует вообще.

Один `CNAME` покрывает и `*.letar.best`, и апекс `letar.best` — LE проверяет для обоих одно и то же
имя `_acme-challenge.letar.best`.

## Развёртывание

Деплой — **только через BlackCove** ([deploy-coordination.md](/.claude/rules/deploy-coordination.md)).

```bash
cd /home/deploy/letar/infra/acme-dns
docker compose up -d
```

### Порт 53 может быть занят

На Ubuntu `systemd-resolved` держит 53 на stub-интерфейсе и мешает биндингу `0.0.0.0:53`:

```bash
ss -ulnp | grep ':53'
```

Если занят — в `/etc/systemd/resolved.conf` выставить `DNSStubListener=no`, затем
`systemctl restart systemd-resolved`. Проверить, что резолвинг на сервере не сломался.

### Firewall

```bash
ufw allow 53/tcp
ufw allow 53/udp
```

HTTP API наружу **не открывать** — он опубликован только на `127.0.0.1:8053`.

## Регистрация аккаунта (однократно)

```bash
curl -s -X POST http://127.0.0.1:8053/register | tee /root/acme-dns-account.json
```

Ответ содержит `username`, `password`, `fulldomain`, `subdomain`. Из него нужны:

- `fulldomain` — в `CNAME`-запись `_acme-challenge` (см. таблицу выше);
- весь JSON — в файл аккаунтов lego (`ACME_DNS_STORAGE_PATH`), формат — объект, где ключ это
  домен: `{"letar.best": { ...ответ регистрации... }}`.

⚠️ Учётные данные из этого ответа — секрет: кто ими владеет, тот подменяет ACME-челленджи всей
зоны. Хранить как остальные секреты ([secret-manager.md](/.claude/docs/secret-manager.md)), в
публичный репозиторий не коммитить.

После регистрации выставить `disable_registration = true` в `config/config.cfg` и передеплоить.

## Проверка (DoD милестона M1a)

Цепочка делегирования проверяется **без Traefik**, голым lego:

```bash
ACME_DNS_API_BASE=http://127.0.0.1:8053 \
ACME_DNS_STORAGE_PATH=/root/.lego-acme-dns-accounts.json \
lego --dns acme-dns --email <адрес> -d '*.letar.best' -d letar.best --accept-tos run
```

Промежуточные проверки, если что-то не сходится:

```bash
# делегирование работает? должен ответить сам acme-dns, не Dynadot
dig +short NS acme.letar.best
dig @acme.letar.best TXT test.acme.letar.best

# CNAME на месте?
dig +short CNAME _acme-challenge.letar.best
```

⚠️ Пока идёт отладка, использовать staging-директорию Let's Encrypt
(`--server https://acme-staging-v02.api.letsencrypt.org/directory`) — у боевой жёсткие лимиты на
неудачные попытки, и упереться в них посреди отладки очень легко.

## Бэкапы

От этого сервиса зависит **продление всех сертификатов зоны**. Если он тихо умрёт, выяснится это
через 90 дней в худший момент. Бэкапить:

- `data/acme-dns.db` — база выданных поддоменов;
- файл аккаунтов lego (`ACME_DNS_STORAGE_PATH`) — без него клиент не сможет обновить `TXT`.

## Версия образа

Пин `joohoi/acme-dns:v2.0.2`. Формат `config.cfg` между мажорными версиями менялся — если
контейнер падает на старте, первым делом сверить конфиг с README того тега, который реально
подтянулся.
