# deploy-engine rollout: proxyKind — от per-app label к автоопределению

## Симптом

`libs/deploy-engine` (`bun run libs/deploy-engine/src/cli.ts rollout --app <app>`, вызывается
`deploy-affected.sh` для приложений с label `letar.rollout: 'true'`) на здоровом деплое падал на
шаге `nginx-reload-1`:

```
❌ [nginx-reload-1] nginx reload (резолвит alias на оба контейнера) — <error: nginx-proxy-manager: No such container>
```

Build ok → новый контейнер healthy → smoke-test ok → `nginx-reload-1` FAILED → весь rollout
`exitCode 1`. Из-за этого шаги `stop-old`/`rm-old` не выполнялись — старый контейнер оставался
висеть рядом с новым (найдено 2026-09-01: `domwellbes-app-35` рядом с `domwellbes-app-36`,
аналогично у `mandala`). Сайт при этом уже отдавал новый код — формальный провал был ложным, но
он ломал cleanup и вводил в заблуждение.

## Причина

s2 (production) полностью снят с Nginx Proxy Manager (NPM) и переведён на Traefik (коммит
`64ac84d5`, §48 M3 шаг 6). Traefik докер-провайдер сам подхватывает новые контейнеры через
автообнаружение по лейблам (`traefik.enable=true`, `traefik.http.routers.<app>.rule=Host(...)`) —
явный reload ему не нужен и не существует как понятие.

`libs/deploy-engine/src/rollout.ts` уже поддерживал `proxyKind: 'traefik'` (шаги `nginx-reload-1`/
`nginx-reload-2` становятся no-op) — но выбор прокси управлялся **per-app label**
`letar.proxy-kind: 'traefik'` в `docker-compose.production.yml`, который `cli.ts` читал через
`deploy-affected.sh` (`PROXY_KIND_ARGS`). Переход на Traefik произошёл **одномоментно на уровне
сервера**, а не по одному приложению — но label был выставлен только у одного приложения
(`animatrona-landing`) из 20 с `letar.rollout: true`. Остальные 19 продолжали получать дефолт
`proxyKind: 'npm'` из `cli.ts` и падали на `docker exec nginx-proxy-manager nginx -s reload` —
контейнера с этим именем на s2 больше нет.

Тот же класс расхождения между «что реально на сервере» и «что в конфиге приложения» уже решён в
самом `deploy-affected.sh` — общий (batch-level, не per-app) шаг `nginx-reload` в конце скрипта
(после всех деплоев) probe'ит `docker exec nginx-proxy-manager`/`npm`, а если оба недоступны —
проверяет `docker ps | grep -qx traefik` и не считает это провалом. `libs/deploy-engine` этот же
паттерн не унаследовал — своя ветка (`letar.rollout: true`) была написана раньше миграции на
Traefik и полагалась на явный per-app opt-in.

## Фикс

`detectProxyKind()` в `libs/deploy-engine/src/rollout.ts` — автоопределение по фактически
запущенным контейнерам хоста (`docker ps --format '{{.Names}}'`), тем же приоритетом, что
проверенный fallback в `deploy-affected.sh`: `nginx-proxy-manager` → `npm` (легаси-имя на s3) →
`traefik` → исторический дефолт `npm`/`nginx-proxy-manager` (не блокирует rollout, если вообще
ничего не нашлось — редкий edge case, не новая точка отказа).

`cli.ts` вызывает `detectProxyKind()`, только если `--proxy-kind` не передан явно — флаг и label
`letar.proxy-kind` в compose по-прежнему работают как явный форс, если он когда-нибудь понадобится
(например смешанный флот серверов на разных прокси).

**Библиотечная функция `runRollout()` не изменилась** — её дефолт `proxyKind: 'npm'` остаётся, это
низкоуровневый API без доступа к состоянию хоста в тестах (in-memory executor). Автоопределение —
только на уровне CLI, где executor реальный.

## Если увидишь снова

- Симптом «rollout падает именно на `nginx-reload-1`/`nginx-reload-2`, при этом сайт по факту
  живой» — почти всегда рассинхрон между тем, какой прокси реально стоит на сервере, и тем, что
  думает про это `libs/deploy-engine`. Проверить: `docker ps --format '{{.Names}}'` на сервере —
  если там `traefik`, а не `nginx-proxy-manager`/`npm`, а rollout всё равно пытался делать
  `nginx -s reload` — `detectProxyKind()` либо не вызвался (явный `--proxy-kind npm` где-то в
  цепочке), либо сам список кандидатов устарел (сервер сменил реализацию прокси на третью).
- После такого сбоя проверь `docker ps -a` на затронутом сервере на осиротевшие старые
  контейнеры (`<app>-app-N` рядом с более свежим `<app>-app-M`) — cleanup-шаги `rollout`
  останавливаются на первом провалившемся шаге и не доходят до `stop-old`/`rm-old`.
