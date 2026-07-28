# Next.js SSR-краш от статического импорта browser-only библиотек

## Проблема

`'use client'` на компоненте НЕ защищает от выполнения кода на сервере. Next.js App Router
всё равно пререндерит клиентские компоненты на сервере при сборке/первом запросе (SSR/SSG) —
`'use client'` управляет только тем, где компонент гидратируется, а не тем, где он выполняется
впервые.

Если такой компонент на **верхнем уровне модуля** статически импортирует библиотеку, рассчитанную
только на браузер (обращается к `self`, `window`, `document` в момент загрузки модуля, а не
внутри вызываемых функций) — модуль падает при выполнении в Node.js на сервере:

```
ReferenceError: self is not defined
    at Object.<anonymous> (.../shaka-player.compiled.js:...)
    at module evaluation (.../GlobalVideoProvider.tsx:19:1)
```

Симптом опасен тем, что падает **пререндер конкретной страницы** (`Export encountered an error
on /discover/page`), а не сразу весь `next build` — легко спутать с багом в самой странице,
хотя причина в компоненте, который эта страница транзитивно импортирует (например, через
`layout.tsx`, который оборачивает все страницы).

Прецедент: `apps/animatrona` — `GlobalVideoProvider.tsx` (используется в `layout.tsx`, то есть
рендерится вообще на каждой странице) статически импортировал `shaka-player`
(`import shaka from 'shaka-player'`). Это ронял `next build` целиком на `/discover` и
`/_not-found` — билд был сломан **с 3 июля**, никто не заметил: `nx build:win` запускался через
конвейер вида `nx build:win animatrona | tail -N`, а такой пайп возвращает код выхода `tail`
(почти всегда `0`), а не реального билда — провал молча читался как успех. При диагностике
подобных проблем всегда проверяйте реальный exit code без потери через пайп (`set -o pipefail`
или отдельный `echo $?` без хвостового пайпа), а не полагайтесь на "команда завершилась" в выводе.

## Решение — динамический `import()` внутри `useEffect`

Не убирать статическую типизацию — только сам runtime-импорт:

```tsx
// ❌ Падает на SSR — модуль вычисляется в момент импорта
import shaka from 'shaka-player'

export function VideoProvider() {
  const playerRef = useRef<shaka.Player | null>(null)
  useEffect(() => {
    shaka.polyfill.installAll()
    const player = new shaka.Player()
    // ...
  }, [])
}
```

```tsx
// ✅ Тип — статический импорт (стирается на этапе компиляции, не выполняется в рантайме)
import type Shaka from 'shaka-player'

export function VideoProvider() {
  const playerRef = useRef<Shaka.Player | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // Динамический import() выполняется только здесь — строго в браузере,
      // после гидратации, никогда на сервере при SSR/SSG
      const shaka = (await import('shaka-player')).default
      if (cancelled) return

      shaka.polyfill.installAll()
      const player = new shaka.Player()
      // ...
    })()
    return () => {
      cancelled = true
    }
  }, [])
}
```

Ключевые моменты:

- `import type X from 'lib'` полностью стирается TypeScript-компилятором — не порождает
  никакого runtime-импорта, поэтому безопасен даже для библиотек, ломающих SSR.
- Синхронный cleanup из `useEffect` должен обрабатывать случай, когда асинхронная инициализация
  ещё не завершилась к моменту размонтирования — держите флаг `cancelled` и/или `cleanup`-функцию,
  назначаемую изнутри async-колбэка (см. `GlobalVideoProvider.tsx`,
  `useShakaPlayer.ts` — `apps/animatrona/renderer/src/components/`).
- Альтернатива для компонентов (не хуков) — `next/dynamic(() => import('./Component'), { ssr:
false })`, но она не годится, если библиотека импортируется внутри хука/эффекта, а не как
  отдельный React-компонент.

## Как быстро найти подозрительные импорты

Библиотеки, которые почти гарантированно ломают SSR при статическом импорте: любые video/audio
плееры (`shaka-player`, `hls.js`, `dashjs`), canvas/WebGL-обёртки, библиотеки, работающие с
`localStorage`/`IndexedDB` на верхнем уровне модуля, полифиллы браузерных API.

```bash
# Найти статические импорты потенциально browser-only библиотек в 'use client' файлах
grep -rl "^import .* from 'shaka-player'\|^import .* from 'hls.js'" apps/*/renderer/src apps/*/src
```
