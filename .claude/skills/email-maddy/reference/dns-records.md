# DNS Records for Email

## Типы записей

| Тип   | Назначение                                     |
| ----- | ---------------------------------------------- |
| MX    | Куда доставлять входящую почту                 |
| SPF   | Кто может отправлять от имени домена           |
| DKIM  | Подпись писем (защита от подделки)             |
| DMARC | Политика обработки неаутентифицированных писем |
| PTR   | Обратная запись (IP → hostname)                |

## letar.best (основной домен)

| Тип | Имя                 | Значение                                              |
| --- | ------------------- | ----------------------------------------------------- |
| A   | mail                | 193.37.68.73                                          |
| MX  | @                   | mail.letar.best (приоритет 10)                        |
| TXT | @                   | `v=spf1 a:mail.letar.best ~all`                       |
| TXT | default.\_domainkey | `v=DKIM1; k=rsa; p=<КЛЮЧ>`                            |
| TXT | \_dmarc             | `v=DMARC1; p=quarantine; rua=mailto:admin@letar.best` |

## Поддомены \*.letar.best

Для каждого поддомена (kami, imot, animatrona, mandala, dashboard):

| Тип | Имя                      | Значение                              |
| --- | ------------------------ | ------------------------------------- |
| TXT | kami                     | `v=spf1 a:mail.letar.best ~all`       |
| TXT | default.\_domainkey.kami | `v=DKIM1; k=rsa; p=<КЛЮЧ_letar.best>` |

**Примечание:** Все поддомены используют один DKIM ключ от letar.best.

### Пример для kami.letar.best

```
kami.letar.best.              TXT   "v=spf1 a:mail.letar.best ~all"
default._domainkey.kami.letar.best.  TXT   "v=DKIM1; k=rsa; p=MIIBIjAN..."
```

## направа.рф

| Тип | Имя                 | Значение                                              |
| --- | ------------------- | ----------------------------------------------------- |
| TXT | @                   | `v=spf1 a:mail.letar.best ~all`                       |
| TXT | default.\_domainkey | `v=DKIM1; k=rsa; p=<КЛЮЧ_naprava.rf>`                 |
| TXT | \_dmarc             | `v=DMARC1; p=quarantine; rua=mailto:admin@letar.best` |

## premium.rosstil.ru

| Тип | Имя                 | Значение                                              |
| --- | ------------------- | ----------------------------------------------------- |
| TXT | @                   | `v=spf1 a:mail.letar.best ~all`                       |
| TXT | default.\_domainkey | `v=DKIM1; k=rsa; p=<КЛЮЧ_premium.rosstil.ru>`         |
| TXT | \_dmarc             | `v=DMARC1; p=quarantine; rua=mailto:admin@letar.best` |

## Получение DKIM ключей

```bash
# letar.best и все поддомены
ssh root@mail.letar.best "cat /opt/maddy/data/dkim_keys/letar.best_default.dns"

# направа.рф (punycode: xn--80aaah6cnh.xn--p1ai)
ssh root@mail.letar.best "cat /opt/maddy/data/dkim_keys/xn--80aaah6cnh.xn--p1ai_default.dns"

# premium.rosstil.ru
ssh root@mail.letar.best "cat /opt/maddy/data/dkim_keys/premium.rosstil.ru_default.dns"
```

## Проверка DNS

```bash
# SPF
dig TXT letar.best
dig TXT kami.letar.best

# DKIM
dig TXT default._domainkey.letar.best
dig TXT default._domainkey.kami.letar.best

# DMARC
dig TXT _dmarc.letar.best

# MX
dig MX letar.best

# PTR (обратная запись)
dig -x 193.37.68.73
```

## SPF синтаксис

```
v=spf1                    # Версия SPF
a:mail.letar.best         # Разрешить отправку с mail.letar.best
~all                      # Мягкий fail для других серверов
```

Варианты:

- `~all` — softfail (письма могут быть помечены)
- `-all` — hardfail (письма отклоняются)
- `?all` — neutral (без политики)

## DKIM синтаксис

```
v=DKIM1                   # Версия DKIM
k=rsa                     # Алгоритм ключа
p=MIIBIjAN...             # Публичный ключ (base64)
```

## DMARC синтаксис

```
v=DMARC1                  # Версия DMARC
p=quarantine              # Политика: карантин для неаутентифицированных
rua=mailto:admin@...      # Куда слать отчёты
```

Политики:

- `none` — только мониторинг
- `quarantine` — помечать как спам
- `reject` — отклонять

## Добавление нового домена

1. **SPF запись** — `v=spf1 a:mail.letar.best ~all`
2. **DKIM запись** — получить публичный ключ с сервера
3. **DMARC запись** — `v=DMARC1; p=quarantine; ...`
4. **Подождать** — DNS может обновляться до 24 часов
5. **Проверить** — через mail-tester.com
