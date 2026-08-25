# Одноразово-раскрываемая публичная ссылка: fragment-токен → scoped cookie

Паттерн для любой ссылки, которую нужно отправить внешнему получателю без аккаунта (счёт,
договор, приглашение, коммерческое предложение) так, чтобы секретный токен доступа не осел ни в
одном логе, `Referer`-заголовке или адресной строке дольше одного клика.

## Проблема

Классический вариант «токен в query-строке» (`/view?token=xxx`) течёт по построению:
query-параметры копируются в `Referer` при переходе по внешним ссылкам со страницы, попадают в
access-логи nginx/прокси, сохраняются в истории браузера, легко копипастятся вместе со всей
ссылкой куда угодно. Токен в пути (`/view/xxx-token`) течёт тем же способом и вдобавок выглядит
как постоянный публичный идентификатор ресурса.

## Поток

1. **Ссылка несёт токен в URL fragment**: `https://app/reveal#token=<raw>`. Fragment (часть после
   `#`) — единственная часть URL, которую браузер физически не отправляет на сервер при обычной
   навигации: не уходит в HTTP-запрос, не появляется в access-логах, не копируется в `Referer`.
2. **Клиентская страница-шелл** читает `window.location.hash` в `useEffect` (только в браузере —
   на сервере fragment недоступен в принципе, значит эта страница обязана быть клиентским
   компонентом для самого чтения токена) и сразу шлёт токен в теле `POST`-запроса на серверный
   обменный эндпоинт.
3. **Серверный эндпоинт** резолвит токен (хеш + сверка с БД, rate-limit — см. ниже), при успехе
   ставит `Set-Cookie`: `Secure`, `HttpOnly`, `SameSite=Lax`, `path` — **scoped на конкретный
   ресурс** (`/reveal/<resourceId>`, не на всё приложение), и возвращает клиенту публичный
   `resourceId` (не сам токен).
4. Клиент делает `router.replace('/reveal/<resourceId>')` — заменяет URL в истории, fragment с
   токеном пропадает из адресной строки и не остаётся в истории браузера.
5. Дальнейший просмотр/скачивание идёт **без токена в URL** — сервер на каждом запросе читает
   cookie, сверяет с `resourceId` из пути и отдаёт контент. Токен больше не появляется ни в одном
   URL, начиная с шага 4.

## Почему именно cookie, а не, например, сессия в localStorage

- **Path-scoping cookie — изоляция на уровне браузера, не приложения.** RFC 6265 гарантирует, что
  cookie с `path=/reveal/A` не будет отправлена браузером на запрос к `/reveal/B` — при
  нескольких активных ссылках (несколько разных документов отправлены одному получателю или
  открыты в одной вкладке по очереди) каждая живёт в собственном cookie, гранты не пересекаются.
  Этого не даёт `localStorage`/`sessionStorage` — там изоляция только по origin, разводить гранты
  пришлось бы вручную в JS.
- **`HttpOnly`** — cookie недоступна из `document.cookie`, а значит не читается XSS-полезной
  нагрузкой, если она случайно окажется на странице.
- **`SameSite=Lax`** — не уходит на сторонние сайты при кросс-сайтовых запросах, но переживает
  обычный переход по прямой ссылке (top-level navigation), что и нужно для повторного открытия
  той же ссылки получателем.
- **`Secure`** — cookie не уходит по обычному HTTP.

## ⚠️ `resourceId` в пути — декоративен без сверки с cookie

Path-scoping cookie не проверяет владение сам по себе — он только решает, какую cookie браузер
приложит к запросу. Серверный обработчик обязан **явно сверить** `resourceId`, резолвленный из
самой cookie (через хранящийся в ней токен → грант → его ресурс), с `resourceId` из URL. Без этой
сверки путь в URL — просто строка, подставить в него чужой `resourceId` при действующей своей
cookie ничего не проверяющий обработчик не помешает.

## ⚠️ `Secure`-флаг — не из `NODE_ENV`

`next build`/`next start` всегда выставляет `NODE_ENV=production`, в том числе на staging и на
локальной prod-сборке разработчика — `NODE_ENV === 'production'` не отличает реальный прод от
остального. Флаг `Secure` определяется по фактическому протоколу запроса: заголовок
`X-Forwarded-Proto` от прокси (если есть) либо протокол самого запроса. Разбор класса ошибки и
других случаев, где `NODE_ENV` вводит в заблуждение —
[node-env-not-production-signal](/.claude/docs/node-env-not-production-signal.md).

## Rate limiting

Токен обычно длинный и криптостойкий, но обменный эндпоинт всё равно стоит защищать
двухуровневым rate-limit по IP:

- лимит на **невалидные** попытки (гасит перебор наугад);
- отдельный лимит на **валидный** токен (не даёт заспамить один и тот же, возможно утёкший,
  токен).

Раздельные счётчики имеет смысл заводить на каждое смысловое действие отдельно (просмотр,
скачивание) — открытие страницы и клик «Скачать» не должны делить один бюджет запросов.

## Пример кода (абстрактный)

```typescript
// cookie.ts — общее имя и TTL между обменным эндпоинтом и потребителями
export const REVEAL_COOKIE_NAME = 'app_reveal_view'
export const REVEAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

// app/reveal/page.tsx — серверный shell, дальше клиентский компонент читает fragment
// app/reveal/_components/exchange-client.tsx
'use client'
function extractTokenFromHash(): string | null {
  if (typeof window === 'undefined') { return null }
  const match = window.location.hash.match(/(?:^#|&)token=([^&]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
// useEffect: читает токен → POST /api/reveal/access → router.replace(`/reveal/view/${resourceId}`)

// app/api/reveal/access/route.ts
export async function POST(req: Request) {
  const { token } = await parseBody(req) // Zod, .strip()
  const result = await resolveGrantByToken(token, await getClientIp()) // hash + БД + rate-limit
  if (!result.ok) { return NextResponse.json({ error: result.message }, { status: result.status }) }

  const isSecureRequest = req.headers.get('x-forwarded-proto') === 'https'
    || new URL(req.url).protocol === 'https:'

  const cookieStore = await cookies()
  cookieStore.set(REVEAL_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureRequest,
    sameSite: 'lax',
    path: `/reveal/view/${result.resourceId}`,
    maxAge: REVEAL_COOKIE_MAX_AGE_SECONDS,
  })

  return NextResponse.json({ resourceId: result.resourceId })
}

// app/reveal/view/[resourceId]/page.tsx — tokenless-просмотр
export default async function ViewPage({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params
  const token = (await cookies()).get(REVEAL_COOKIE_NAME)?.value
  const result = token ? await resolveGrantByToken(token, await getClientIp()) : null

  // ⚠️ обязательная сверка — resourceId из пути должен совпадать с тем, что резолвился из cookie
  if (!result?.ok || result.resourceId !== resourceId) {
    return <ExpiredOrInvalidView />
  }

  return <ResourceView data={result.data} />
}
```

## Рабочий пример в монорепо

Приватное приложение `domwellbes` реализует этот паттерн для одного из своих публичных
документов (сессия 2026-08-25) — обменный эндпоинт, клиентский fragment-shell, tokenless-роуты
просмотра и скачивания, двухуровневый rate-limit. Детали бизнес-логики — внутри submodule
(`apps/domwellbes/PLAN.md`), здесь не приводятся.
