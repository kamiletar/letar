# Maddy Server Configuration

## Расположение

Сервер: `mail.letar.best` (31.56.180.161)

⚠️ **Реально используемый конфиг:** `/opt/maddy/data/maddy.conf`. `docker-compose.yml` монтирует
только `./data:/data` — папки `config/` в контейнер не попадает. На сервере рядом лежит
`/opt/maddy/config/maddy.conf` — устаревший файл (описывает send-only архитектуру без приёма
почты), помечен `## УСТАРЕЛО` в первой строке, ничем не используется. Не путать пути.

## Архитектура: "forwarding with reroute"

Сервер не просто отправляет почту — он полноценно **принимает** входящую почту (SMTP на 25),
хранит её (`storage.imapsql`, IMAP на 993) и умеет пересылать через алиасы. Это не send-only
relay.

## Структура директорий

```
/opt/maddy/
├── config/
│   └── maddy.conf          # УСТАРЕЛО, не используется контейнером
├── data/                    # ← смонтировано в контейнер как /data
│   ├── maddy.conf           # Основной конфиг (реально применяется)
│   ├── certs/
│   │   ├── fullchain.pem
│   │   └── privkey.pem
│   ├── credentials.db       # База пользователей SMTP/IMAP (SQLite)
│   ├── imapsql.db           # Хранилище почтовых ящиков (SQLite)
│   ├── aliases               # Пересылка входящих адресов (replace_rcpt)
│   ├── sender_map.txt         # Разрешённые адреса отправителя (authorize_sender)
│   └── state/                # Состояние сервера, очередь
└── docker-compose.yml
```

## Актуальный конфиг (`data/maddy.conf`)

Проверяй `$(local_domains)` на сервере — список расширяется по мере добавления приложений/доменов
(например `svoichuzhie.ru` добавлен позже остальных).

```
$(hostname) = mail.letar.best
$(primary_domain) = letar.best
$(local_domains) = $(primary_domain) svoichuzhie.ru kami.letar.best imot.letar.best animatrona.letar.best mandala.letar.best dashboard.letar.best xn--80aaah6cnh.xn--p1ai premium.rosstil.ru
# xn--80aaah6cnh.xn--p1ai = направа.рф (punycode)

# TLS — статичный сертификат (не acme loader)
tls file /data/certs/fullchain.pem /data/certs/privkey.pem

# Аутентификация SMTP/IMAP
auth.pass_table local_authdb {
    table sql_table {
        driver sqlite3
        dsn credentials.db
        table_name passwords
    }
}

# Хранилище почтовых ящиков (для входящих + IMAP)
storage.imapsql local_mailboxes {
    driver sqlite3
    dsn imapsql.db
}

hostname $(hostname)

# ── Submission (587, STARTTLS) — отправка авторизованными пользователями ──
submission tcp://0.0.0.0:587 {
    limits {
        all rate 50 1s
    }
    auth &local_authdb

    # Защита от спуфинга отправителя: авторизованный юзер может слать
    # только From-адреса, перечисленные за ним в sender_map.txt
    check {
        authorize_sender {
            user_to_email file /data/sender_map.txt
        }
    }

    source $(local_domains) {
        destination $(local_domains) {
            # Локальный получатель — сначала применить алиасы (форвард)
            modify {
                replace_rcpt file /data/aliases
            }
            reroute {
                # После replace_rcpt адрес мог остаться локальным (доставка
                # в mailbox) или стать внешним (форвард на gmail и т.п.)
                destination $(local_domains) {
                    deliver_to &local_mailboxes
                }
                default_destination {
                    modify {
                        dkim $(primary_domain) $(local_domains) default
                    }
                    deliver_to &remote_queue
                }
            }
        }
        default_destination {
            modify {
                dkim $(primary_domain) $(local_domains) default
            }
            deliver_to &remote_queue
        }
    }
    default_source {
        reject 501 5.1.8 "Non-local sender"
    }
}

# ── SMTPS (465, implicit TLS) — та же логика, что и 587 ──
submission tls://0.0.0.0:465 {
    # ... идентично блоку 587 выше
}

# ── Incoming SMTP (25) — приём почты извне ──
smtp tcp://0.0.0.0:25 {
    limits {
        all rate 20 1s
    }
    dmarc yes
    check {
        require_mx_record
        dkim
        spf
    }
    source $(local_domains) {
        # Наши же домены не должны слать через 25 — только через 587
        reject 501 5.1.8 "Use port 587 for sending"
    }
    default_source {
        destination $(local_domains) {
            modify {
                replace_rcpt file /data/aliases
            }
            reroute {
                destination $(local_domains) {
                    deliver_to &local_mailboxes
                }
                default_destination {
                    modify {
                        dkim $(primary_domain) $(local_domains) default
                    }
                    deliver_to &remote_queue
                }
            }
        }
        default_destination {
            reject 550 5.1.1 "User not found"
        }
    }
}

# ── IMAP (993) — чтение почты из local_mailboxes ──
imap tls://0.0.0.0:993 {
    auth &local_authdb
    storage &local_mailboxes
}

# ── Очередь исходящих ──
target.remote outbound_delivery {
    limits {
        destination rate 20 1s
        destination concurrency 10
    }
}

target.queue remote_queue {
    target &outbound_delivery
    autogenerated_msg_domain $(primary_domain)
    bounce {
        default_destination {
            reject 550 5.0.0 "No DSN"
        }
    }
}
```

### Ключевые отличия от «классического» send-only конфига

- **DKIM** подписывается единой директивой `modify { dkim $(primary_domain) $(local_domains) default }`
  внутри `reroute`/`default_destination`, а не отдельными блоками `sign dkim { domain ... }` на
  каждый домен — ключ один (`default` selector), домены перечислены аргументом.
- **TLS** — статичные файлы `/data/certs/fullchain.pem` + `privkey.pem`, не `loader acme` (сертификат
  обновляется отдельным скриптом `renew-cert.sh`, не самим Maddy).
- Входящая почта (25) и IMAP (993) реально работают — сервер не только отправляет.

## `/data/sender_map.txt` — защита от спуфинга отправителя

Проверяется на 587/465 директивой `check { authorize_sender { ... } }`: авторизованный SMTP-логин
может указать в `From` только адреса из своей строки. Любой логин, не упомянутый в файле —
запрет по умолчанию (`default_source { reject ... }` относится к неавторизованным источникам, а
сам `authorize_sender` отклоняет попытку подставить чужой `From`).

Формат — `логин: email1, email2, ...` (можно несколько email на один логин):

```
admin@letar.best: admin@letar.best
noreply@svoichuzhie.ru: noreply@svoichuzhie.ru
author@svoichuzhie.ru: author@svoichuzhie.ru, booking@svoichuzhie.ru, denis@svoichuzhie.ru, agent@svoichuzhie.ru, director@svoichuzhie.ru, master@svoichuzhie.ru, manager@svoichuzhie.ru, assistant@svoichuzhie.ru, curator@svoichuzhie.ru, consultant@svoichuzhie.ru, coordinator@svoichuzhie.ru
```

Пример `author@svoichuzhie.ru` — паттерн «один логин, несколько ролевых имён в своём домене»:
приложение шлёт письма от лица разных ролей (`booking@`, `denis@`, `director@`, ...), но
авторизуется одним SMTP-аккаунтом `author@svoichuzhie.ru`. Тот же паттерн используется в паре
с `aliases` (см. ниже) для симметричного приёма на эти же адреса.

## `/data/aliases` — форвард входящих (replace_rcpt + reroute)

Применяется на 25 (входящая почта извне) и на 587/465 (когда локальный отправитель шлёт другому
локальному получателю) через `modify { replace_rcpt file /data/aliases }`, затем `reroute`
решает, доставить ли результат в `local_mailboxes` или отправить дальше как внешний адрес.

Формат — `откуда: куда1, куда2, ...`:

```
kami@letar.best: kami@letar.best, letarkami@gmail.com
kami@kami.letar.best: kami@letar.best, letarkami@gmail.com
admin@letar.best: admin@letar.best, letarkami@gmail.com
booking@svoichuzhie.ru: author@svoichuzhie.ru
denis@svoichuzhie.ru: author@svoichuzhie.ru
```

Два реальных паттерна использования:

1. **Форвард на внешний ящик** (`kami@letar.best`, `admin@letar.best` → `letarkami@gmail.com`):
   почта на рабочий адрес дублируется в личный gmail — обычный способ читать корпоративную почту
   без отдельного почтового клиента для IMAP.
2. **Схлопывание ролевых адресов в один mailbox** (`booking@`/`denis@`/`director@`/... →
   `author@svoichuzhie.ru`): зеркало записи в `sender_map.txt` — приложение и отправляет, и
   получает от лица нескольких ролевых имён, но реально всё падает в один ящик `author@`.

При добавлении нового домена с таким паттерном — заводить пару записей сразу в обоих файлах
(`sender_map.txt` для исходящих, `aliases` для входящих), не только одну.

## Docker Compose

```yaml
version: '3.8'

services:
  maddy:
    image: foxcpp/maddy:latest
    container_name: maddy
    restart: unless-stopped
    ports:
      - '25:25' # SMTP (incoming mail)
      - '465:465' # SMTPS (submission)
      - '587:587' # Submission (STARTTLS)
      - '993:993' # IMAPS (reading mail)
    volumes:
      - ./data:/data
    environment:
      - MADDY_HOSTNAME=mail.letar.best
      - MADDY_DOMAIN=letar.best
    hostname: mail.letar.best
```

Обрати внимание: `./config/maddy.conf` **не** монтируется — редактировать нужно
`/opt/maddy/data/maddy.conf`.

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

1. Добавить в `$(local_domains)` в `/opt/maddy/data/maddy.conf`:

   ```
   $(local_domains) = ... новый.letar.best
   ```

2. DKIM ключ отдельно заводить не нужно — единая директива
   `modify { dkim $(primary_domain) $(local_domains) default }` подпишет письма и с нового
   поддомена автоматически, раз он добавлен в `$(local_domains)`.

3. Перезапустить:

   ```bash
   docker restart maddy
   ```

4. Добавить DNS записи (SPF/DKIM/DMARC) для нового поддомена

5. Если приложению нужен приём почты/алиасы — добавить записи в `/data/aliases` и, если письма
   будут отправляться от лица нескольких ролевых адресов с одного логина — в `/data/sender_map.txt`
   (см. паттерн выше).

## Добавление отдельного домена (не поддомен letar.best)

Аналогично: добавить в `$(local_domains)`, перезапустить Maddy, настроить DNS (SPF, DKIM, DMARC) —
отдельный DKIM-ключ заводить не нужно, используется общий selector `default` из директивы `dkim`.
