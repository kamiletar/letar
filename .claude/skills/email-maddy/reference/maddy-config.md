# Maddy Server Configuration

## Расположение

Сервер: `mail.letar.best` (193.37.68.73)
Конфиг: `/opt/maddy/config/maddy.conf`

## Структура директорий

```
/opt/maddy/
├── config/
│   └── maddy.conf          # Основной конфиг
├── data/
│   ├── dkim_keys/           # DKIM ключи (автогенерация Maddy)
│   │   ├── letar.best_default.key
│   │   ├── letar.best_default.dns
│   │   ├── xn--80aaah6cnh.xn--p1ai_default.key  # направа.рф
│   │   ├── premium.rosstil.ru_default.key
│   │   └── ...              # + ключи для каждого поддомена
│   ├── credentials.db       # База пользователей (SQLite)
│   ├── state/              # Состояние сервера
└── docker-compose.yml
```

## Пример конфигурации

```
$(hostname) = mail.letar.best
$(primary_domain) = letar.best

# Все домены для отправки
$(local_domains) = letar.best kami.letar.best imot.letar.best animatrona.letar.best mandala.letar.best dashboard.letar.best xn--80aaah6cnh.xn--p1ai premium.rosstil.ru
# xn--80aaah6cnh.xn--p1ai = направа.рф (punycode)

state_dir /data/state
runtime_dir /data/run

# TLS с автоматическим Let's Encrypt
tls {
    loader acme {
        directory https://acme-v02.api.letsencrypt.org/directory
        email admin@letar.best
        agreed
    }
}

# Аутентификация
auth.pass_table local_authdb {
    table sql_table {
        driver sqlite3
        dsn /data/auth.db
        table_name passwords
    }
}

# DKIM подписи
# Все *.letar.best используют один ключ
sign dkim {
    domain letar.best
    selector default
    key_path /data/dkim/letar.best.key
}

sign dkim {
    domain kami.letar.best
    selector default
    key_path /data/dkim/letar.best.key
}

# ... аналогично для других поддоменов

# Отдельные домены — свои ключи
sign dkim {
    domain направа.рф
    selector default
    key_path /data/dkim/naprava.rf.key
}

sign dkim {
    domain premium.rosstil.ru
    selector default
    key_path /data/dkim/premium.rosstil.ru.key
}

# SMTP submission (587)
smtp tcp://0.0.0.0:587 {
    auth &local_authdb

    source $(local_domains) {
        modify {
            sign dkim
        }
        deliver_to &remote_queue
    }

    default_source {
        reject
    }
}

# SMTPS (465)
smtp tls://0.0.0.0:465 {
    auth &local_authdb

    source $(local_domains) {
        modify {
            sign dkim
        }
        deliver_to &remote_queue
    }

    default_source {
        reject
    }
}

# Очередь исходящих
target.queue remote_queue {
    target &outbound_delivery
}

target.remote outbound_delivery {
    limits {
        all rate 20 1s
    }
}
```

## Docker Compose

```yaml
version: '3.8'

services:
  maddy:
    image: foxcpp/maddy:latest
    container_name: maddy
    restart: unless-stopped
    ports:
      - '25:25'
      - '465:465'
      - '587:587'
      - '993:993'
    volumes:
      - ./data:/data
      - ./config/maddy.conf:/data/maddy.conf:ro
    environment:
      - MADDY_HOSTNAME=mail.letar.best
      - MADDY_DOMAIN=letar.best
    hostname: mail.letar.best
```

## Управление

### Пользователи

```bash
# Список
docker exec maddy maddy creds list

# Создать
docker exec -it maddy maddy creds create user@domain.com

# Изменить пароль
docker exec -it maddy maddy creds password user@domain.com

# Удалить
docker exec maddy maddy creds remove user@domain.com
```

### DKIM ключи

```bash
# Создать новый ключ
docker exec maddy maddy certs --algorithm rsa2048 /data/dkim/newdomain.key

# Получить публичный ключ для DNS
docker exec maddy cat /data/dkim/newdomain.key.pub
```

### Логи

```bash
# Все логи
docker logs -f maddy

# Только ошибки
docker logs maddy 2>&1 | grep -i error

# Последние N строк
docker logs maddy --tail 100
```

## Добавление нового поддомена \*.letar.best

1. Добавить в `$(local_domains)`:

   ```
   $(local_domains) = ... новый.letar.best
   ```

2. Добавить блок DKIM (использует тот же ключ):

   ```
   sign dkim {
       domain новый.letar.best
       selector default
       key_path /data/dkim/letar.best.key
   }
   ```

3. Перезапустить:

   ```bash
   docker restart maddy
   ```

4. Добавить DNS записи в letar.best

## Добавление отдельного домена

1. Добавить в `$(local_domains)`
2. Создать DKIM ключ:

   ```bash
   docker exec maddy maddy certs --algorithm rsa2048 /data/dkim/newdomain.key
   ```

3. Добавить блок DKIM с новым ключом
4. Перезапустить Maddy
5. Настроить DNS (SPF, DKIM, DMARC)
