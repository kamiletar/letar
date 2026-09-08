# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.6.1] — 2026-09-09

### Fixed: `useLocalStorage` перенесён из `./utility` в `./browser`

`useLocalStorage` использует `window`/`localStorage`/`StorageEvent` — он browser-only, а не
платформенно-нейтральный, как остальные три хука `./utility` (`useDebounce`, `usePrevious`,
`useThrottle`). Физическое расположение файла (`src/lib/utility/use-local-storage.ts`) не
совпадало с его реальной платформенной группой ещё с введения подпутей в 0.6.0.

Из-за этого потребитель, импортирующий из `@letar/hooks/utility` (например
`animatrona-mobile`), компилировал `useLocalStorage` вместе с нужными ему хуками — и был
вынужден держать `"dom"` в `lib` своего `tsconfig.json`, хотя сам не использует ничего
browser-специфичного. Перенос файла в `src/lib/browser/use-local-storage.ts` и правка
`utility.ts`/`browser.ts` убирает эту связь; `animatrona-mobile` больше не нуждается в `"dom"`
(см. его `PLAN.md`/`CHANGELOG.md`).

Обратной совместимости не нарушено: корневой `@letar/hooks` и `@letar/hooks/browser`
по-прежнему экспортируют `useLocalStorage`, поменялся только физический путь исходника и подпуть
`./utility`, из которого хук больше не доступен (единственный существующий потребитель через
`@letar/hooks/utility` использовал только другие хуки барреля).

## [0.6.0] — 2026-09-08

### Breaking (мягко): подпути exports `./utility`, `./browser`, `./query`

Корневой `src/index.ts` смешивал платформенно-нейтральные утилиты (`useDebounce`, `usePrevious`,
`useThrottle`, `useLocalStorage`), browser-хуки (`window`/`localStorage`/`ServiceWorker`) и
TanStack Query хуки в одном барабанном реэкспорте — библиотека была непригодна для React Native
потребителей (Metro резолвит статические импорты всего графа модулей без tree-shaking, импорт
одного хука тянул за собой browser API и optional-peer `@tanstack/react-query`).

Добавлены подпути `@letar/hooks/utility`, `@letar/hooks/browser`, `@letar/hooks/query` — каждый
изолирует свою группу. Корневой `.` остаётся полным реэкспортом всех трёх для обратной
совместимости ~20 существующих потребителей — их код не меняется. `paths` прописаны во все 18
tsconfig.json потребителей (публичные приложения + submodule) через
`scripts/add-lib-tsconfig-path.mjs`, проверено `scripts/check-lib-subpath-paths.mjs`.

Повод — `animatrona-mobile` (React Native): ручной `setTimeout`-debounce в
`LibraryScreen.tsx` нельзя было заменить на `useDebounce` из корня библиотеки именно из-за
затягивания несовместимого кода в Metro-бандл. Подключение `@letar/hooks/utility` в само
`animatrona-mobile` (правка `metro.config.js`) не входит в эту сессию — отдельная задача.

## [0.5.0] — 2026-09-03

### Feature: `useClientOrigin` — безопасный для SSR `window.location.origin`

Дедуплицирует паттерн `const [origin, setOrigin] = useState(''); useEffect(() =>
setOrigin(window.location.origin), [])`, найденный в один день независимо в двух приложениях
(`studio`, `grandslamcup`) как причина hydration mismatch (React error 418): вычисление
`typeof window !== 'undefined' ? window.location.origin : ''` прямо в теле рендера даёт `''`
на сервере и реальный origin на клиенте, тексты расходятся. Хук возвращает `''` до
монтирования и правильный origin после — как и раньше, но в одном месте. Заменены обе копии
в `grandslamcup` (`presenter-select-jury.tsx`, `wizard/step-select-jury.tsx`). `studio` чинил
тот же баг иначе — серверным `getRequestOrigin()` через `headers()`, без клиентского мигания —
и хук ему не нужен.

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
