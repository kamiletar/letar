# Web Push (VAPID) — паттерн для следующего приложения

Пакет `web-push` (npm) + модель `PushSubscription` в schema.zmodel. Два примера в
монорепо на 2026-07-30 — не выносим в `libs/` (см. «Почему не libs/» ниже), но паттерн
единый.

## Модель БД

```zmodel
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
}
```

## VAPID-ключи

- Генерация: `bunx web-push generate-vapid-keys`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — клиент, `navigator.serviceWorker...subscribe()`
- `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:...`) — сервер, только в `.env.docker.enc`

## Прямая реализация (studio) — для одного адресата/простого сценария

`apps/studio/src/lib/push-notifications.ts`. Ленивая инициализация `webpush.setVapidDetails`
(чтобы не падать при отсутствии ключей в dev), прямой Prisma-запрос подписок, отправка
через `webpush.sendNotification`, при `statusCode` 404/410 — подписка отозвана/просрочена,
удаляется из БД.

Подходит когда: сценарий один (например «уведомить владельца»), тестов на сам вызов
`web-push` не нужно — repo-слой и так покрыт.

## Repo/Provider-абстракция (driving-school) — для тестируемости и нескольких типов уведомлений

`apps/driving-school/src/lib/notifications/notifications-service.ts` определяет интерфейсы
`PushProvider` (`sendNotification(subscription, payload)`) и `NotificationsRepository`,
бизнес-логику (`shouldSendNotification` по настройкам пользователя, `sendNotificationToUser`)
тестирует через моки обоих интерфейсов (`notifications-service.spec.ts`) — без реального
`web-push` в unit-тестах.

⚠️ На 2026-07-30 конкретной реализации `PushProvider` через `web-push` в driving-school нет
(пакет `web-push` даже не установлен) — интерфейс есть, реализации нет. Когда она появится,
внутренняя логика send/cleanup будет почти идентична `sendPushToOwner` из studio.

Подходит когда: несколько типов уведомлений с разными настройками у пользователя, нужны
unit-тесты бизнес-логики без реального push.

## Почему не libs/web-push

Shared-first (CLAUDE.md) — эвристика, а не автоматика: выносить абстракцию есть смысл,
когда есть ≥2 **реальные** реализации, а не интерфейс + одна реализация. Извлечение сейчас
означало бы гадать на форму API driving-school ещё до того, как он написан.

**Сигнал для выноса:** третье приложение с web-push, или появление конкретного
`PushProvider` в driving-school поверх `web-push`. Тогда в `libs/web-push` выносить
минимум: `ensureVapidConfigured()` + `sendWebPush(subscription, payload)` с 404/410-детекцией
(возвращает булево «подписка мертва», удаление из БД остаётся на вызывающей стороне —
у каждого приложения свой Prisma-клиент). Repo/provider-паттерн driving-school поверх этого
не трогать — он про DI для тестов, а не про сам вызов `web-push`.

## Не путать с мультиканальными уведомлениями

Если где-то возникнет потребность в уведомлениях по нескольким каналам сразу
(email/push/Telegram/SMS с выбором канала по роли пользователя) — это **не тот же сигнал**,
что описан выше. Такая задача на уровень выше: диспетчеризация по каналу и роли, а не
абстракция над одним вызовом `web-push`. «Третий потребитель web-push» и «появилась
потребность в мультиканальной системе уведомлений» — разные сигналы; второй не выполняет
критерий выноса `libs/web-push` из этого документа и рассматривается отдельно, если/когда
до этого дойдёт.
