# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.4.0] — 2026-09-03

### Feature: `useOfflineServiceWorker` — единая регистрация/снятие Service Worker

Дедуплицирует четыре копии `ServiceWorkerRegistration` (studio, grandslamcup, mandala, pravda),
все с одним и тем же багом: снятие регистрации шло по `ref`/`getRegistration('/')` с текущей
загрузки страницы, а не по `getRegistrations()` — воркер, зарегистрированный в прошлой сессии
браузера (или до внедрения консент-гейта), в такой список не попадал, и выключение оффлайн-режима
не делало ничего. Хук также не `await`-ит `unregister()` — у воркера в состоянии `installing`
этот промис не резолвится вообще. Парный компонент — `ServiceWorkerRegistration` в `@letar/ui`.

## [0.3.0] — 2026-08-19

### Feature: `useEventSource` — единое управление SSE/`EventSource`

Дедуплицирует 10 самостоятельных реализаций `new EventSource(...)`, расползшихся по
`studio`, `dashboard` (×2), `driving-school` (×3, включая `@letar/pin-auth`), `synth`,
`grandslamcup` — каждая с собственной логикой переподключения и без обработки фоновой
заморозки вкладки. Хук даёт: настраиваемый backoff (`constant`/`linear`/`exponential`,
джиттер, лимит попыток), форсированное пересоздание соединения на `visibilitychange`
(включено по умолчанию — Chrome Memory Saver замораживает `EventSource` фоновых вкладок и
не всегда переподключает его сам, найдено на баге панели активных таймеров `studio`), и
произвольные именованные события (не только безымянный `onmessage`).

См. [libs/hooks/README.md](./README.md#sse-поток-server-sent-events).
