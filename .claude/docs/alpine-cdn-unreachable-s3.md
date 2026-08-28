# ⚠️ С s3 недоступен dl-cdn.alpinelinux.org — «TLS: unspecified error» в сборке не про BuildKit

**Кратко:** с s3 (`188.127.235.141`) нет сетевого пути до `dl-cdn.alpinelinux.org` — ни по IPv4
(все четыре адреса), ни по IPv6, ни с хоста, ни из контейнера. Всё остальное с того же сервера
работает: GitHub, npm, Docker registry и **три альтернативных зеркала Alpine**. Любой
`apk add` при сборке на s3 падает, пока репозиторий не переключён на зеркало.

Симптом:

```
RUN apk add --no-cache util-linux procps
WARNING: fetching https://dl-cdn.alpinelinux.org/.../APKINDEX.tar.gz: TLS: unspecified error
ERROR: unable to select packages: procps/util-linux (no such package)
```

Три сборки подряд, стабильно. Это **не флейк** и не тот же баг, что
[docker-prune-cold-layer-network-flake](/.claude/docs/docker-prune-cold-layer-network-flake.md)
(там кеш слоя сносился ночным prune, и первая сборка после 04:00 шла в сеть; здесь сеть не
работает вообще).

## Фикс

В Dockerfile перед первым `apk add`:

```dockerfile
ARG ALPINE_MIRROR=https://mirror.yandex.ru/mirrors/alpine
RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories
```

Зеркало доступно **и с s2, и с s3**, поэтому условий и per-server build-args не нужно.
Проверено вживую на `node:24-alpine` (Alpine 3.24.1) на s3: и `util-linux procps`, и
`git openssh-client docker-cli tzdata` ставятся (`OK: 64.3 MiB in 76 packages`).

В multi-stage `sed` нужен только в том стейдже, от которого наследуются остальные:
`FROM base AS production` получает уже исправленный `/etc/apk/repositories` вместе с ФС.

## Кого это касается

На 2026-08-28 `apk` при сборке остался только у двух приложений — `dashboard` и
`dashboard-agent` (docker-cli, git, openssh-client, util-linux, procps: реальные бинарники,
не data-файлы). Остальные 22 приложения получают zoneinfo через `COPY --from=node:24-slim` и в
сеть при сборке не ходят вообще — см.
[docker-prune-cold-layer-network-flake](/.claude/docs/docker-prune-cold-layer-network-flake.md).

Побочный вывод: тот переход на `COPY --from` задумывался как защита от ночного prune, но по
факту он же снял зависимость 22 приложений от ресурса, который с s3 недоступен в принципе.
Без него на s3 не собиралось бы ничего.

## ⚠️ Ловушка диагностики: `nc` на s3 не установлен

Проверка доступности через `nc -z host port` на s3 даёт **FAIL для любого адреса**, потому что
команды просто нет (`bash: nc: command not found` уходит в stderr, а `-z`-проверка возвращает
ненулевой код). Так рождается ложный вывод «заблокировано всё подряд» — включая GitHub и зеркала,
которые на самом деле доступны.

Проверяй через bash, без внешних утилит:

```bash
timeout 7 bash -c "echo > /dev/tcp/151.101.130.132/443" && echo OK || echo FAIL
```

Внутри Alpine-контейнера `nc` есть (busybox), там `-z` работает — то есть результаты из
контейнера и с хоста получались разными инструментами, и расхождение между ними легко принять
за «в контейнере сеть другая». Это тот же класс, что в
[verification-pitfalls](/.claude/docs/verification-pitfalls.md): проверка врёт, а не система.

## Гипотезы, которые НЕ подтвердились

Проверены и отброшены — не тратьте на них время повторно:

- **MTU.** Все интерфейсы s3 — 1500, включая `ens3` и `docker0`. Расхождения нет.
- **IPv6.** У s3 есть глобальный IPv6 и он действительно нерабочий (ping6 наружу — 100% loss),
  но контейнеры IPv6-адреса не получают вообще, а DNS внутри контейнера отдаёт IPv4. К падению
  сборки отношения не имеет.
- **conntrack.** 849 из 262144, `dmesg` без единой записи о переполнении.
- **BuildKit namespace.** Ошибка воспроизводится и в обычном `docker run` (не только в сборке),
  и с самого хоста — то есть BuildKit ни при чём.
