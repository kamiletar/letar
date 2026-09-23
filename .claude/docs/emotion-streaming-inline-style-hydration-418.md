# Плавающий #418: инлайн-`<style>` Emotion в потоковом сегменте

⚠️ На прод-сборке Next 16 + Chakra v3 (Emotion) страница **изредка** бросает
`Minified React error #418; args[]=HTML`. Потом React выкидывает весь серверный DOM и
перерисовывает корень на клиенте. Серверный HTML у удачной и неудачной загрузки одинаковый, а в
`next dev` ошибку поймать не удалось. Всё это выглядит как баг React, но им не является.

## Как узнать

- Ошибка плавает: одна и та же страница в свежем контексте браузера падает примерно в 1 загрузке
  из 4, только на маршрутах, где разметка приходит поздним потоковым сегментом (`loading.tsx`,
  `<Suspense>`, в HTML видны `$RS`/`$RV`/`$RC`).
- В неудачной загрузке **все** `useId` в DOM клиентские (`_r_0_`), в удачной — серверные
  (`_R_1qal9…_`): пересобран весь корень.
- Для пользователя страница работает, но всё сделанное до пересборки теряется: раскрытый
  `<details>` закрывается, ввод в поле откатывается к серверному значению, ранний клик уходит в
  выброшенный DOM. В e2e это видно как «клик/ввод прошёл, результата нет».

## Механизм

Без реестра кеша Emotion на SSR фабрика Chakra (как и `styled` Emotion) рендерит
`<style data-emotion="css 9687x5">` **инлайн, прямо перед элементом**. На клиенте `createCache`
при инициализации переносит все такие `<style>` из `<body>` в `<head>`, и React их не видит. Но
перенос разовый. Если сегмент со стилизованной шапкой пришёл **после** инициализации кеша, его
`<style>` остаётся в теле. Гидратация доходит до места, где ждёт `<header>`, и находит там
`<style>`. React бросает #418 и пересобирает корень: Suspense-границы с обработчиком выше этого
места нет. Всё решает гонка «что раньше: кеш Emotion или поздний сегмент», отсюда и плавающий
характер.

## Как это найдено (для следующего раза)

Минифицированный #418 ничего не говорит, а dev не воспроизводит. Сработала подмена чанка React
на staging через `page.route()` в Playwright. Функцию, бросающую #418 (в чанке —
`function r1(e){var n=Error(u(418,…`), дополнили логом: цепочка файберов вверх
(`fiber.return`), следующий DOM-узел для гидратации (переменная рядом с `hydrationParentFiber`)
и `document.readyState`. Первый же неудачный прогон показал: файбер
`header.css-9687x5`, курсор — `<style data-emotion="css 9687x5">`. Имена переменных в чанке
меняются от сборки к сборке: ищи по `(418,`.

Ложные следы, которые отняли время:

- [react/react#37584](https://github.com/react/react/issues/37584) — курсор гидратации не
  откатывается при повторе host-узла. В React 19.3 внутри Next 16.3.6 он уже исправлен
  (`replaySuspendedUnitOfWork`, `case 5`).
- [react/react#37321](https://github.com/react/react/issues/37321) — гидратация обгоняет
  HTML-парсер. Эмуляция обхода из issue (планировщик ждёт `readyState !== 'loading'`) долю ошибок
  не изменила: 5/20 без гейта, 6/20 с ним.
- Часовой пояс, `localStorage`, калькулятор с `Field.Select`, сторонние скрипты — ни при чём.

## Фикс

Реестр кеша Emotion для App Router — паттерн `AppRouterCacheProvider` из MUI. Кеш с
`compat = true` копит правила в `cache.inserted` вместо того, чтобы возвращать их в фабрику
(инлайн-`<style>` перестаёт рендериться), а `useServerInsertedHTML` отдаёт их в поток Next.
Первый блок попадает в `<head>`, следующие — между `<script>` потока на уровне `<body>`, вне
дерева React. Обёртка — снаружи `ColorModeProvider`/`RootChakraProvider`.

Живёт в библиотеке: `EmotionRegistry` из подпути `@letar/chakra-provider/next`
([libs/chakra-provider/src/lib/emotion-registry.tsx](/libs/chakra-provider/src/lib/emotion-registry.tsx)).
Подпуть отдельный, в общий баррель компонент не входит: баррель используют и Electron/Vite-рендереры,
им `next/navigation` не нужен. CSS кладётся обычными children `<style>`, без вставки сырого
HTML-пропом: React 19 внутри `<style>` экранирует только `<style`/`</style`. Зависимость
`@emotion/cache` объявлена в корневом `package.json`: раньше она была только транзитивной, а при
изолированном линкере bun такое не резолвится.

```tsx
'use client'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'

export function Providers({ children }: PropsWithChildren) {
  return (
    <EmotionRegistry>
      <ColorModeProvider>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
```

**Охват (2026-09-24):** подключён в корневом провайдере всех веб-приложений на Next — потребителей
`@letar/chakra-provider` (19 штук, включая приватные submodule). Первым был пилот в одном
приложении, 2026-09-24 компонент перенесён в библиотеку, локальная копия удалена. Серверный layout
(как в `auth-hub`) оборачивается так же: клиентский компонент рендерится из серверного без
обёртки. Если в приложении несколько взаимоисключающих корневых провайдеров по группам маршрутов,
реестр ставится в каждый.

Не подключён — и почему:

- **Electron-рендереры** (`animatrona/renderer`, `animatrona-folder-player`, `animatrona-ipfs-player`,
  `label-printer-desktop`, `poster-microtext-desktop`). У `output: 'export'` HTML готов целиком до
  инициализации кеша, потоковых сегментов нет. ⚠️ Но `label-printer-desktop` и
  `animatrona/renderer` собираются в `output: 'standalone'`, то есть это живой Next-сервер со
  стримингом. Если #418 всплывёт там — подключать так же, `paths` на подпуть у них уже есть.
- **Next-приложения на Chakra без этой библиотеки** (`letar-landing`, `kami-key-the-landing`,
  `animatrona-landing`, `form-example`) и демо-страницы `form-docs` со своим `ChakraProvider`
  на странице. Им сначала нужен `@letar/chakra-provider` в зависимостях. Без `loading.tsx` и
  `<Suspense>` баг не проявляется.

Тест — [emotion-registry.spec.tsx](/libs/chakra-provider/src/lib/emotion-registry.spec.tsx):
`renderToString` с подставленным `ServerInsertedHTMLContext`. Контрольный случай «без реестра —
инлайн-`<style>` в разметке есть» держит тест честным. ⚠️ Файл обязан идти под
`// @vitest-environment node`: под jsdom Emotion видит `document`, уходит в браузерную ветку и
кладёт стили в `document.head`, инлайн-`<style>` не появляется даже без реестра — тест позеленел
бы на сломанном коде.

Проверка после фикса: в сыром HTML страницы нет `<style data-emotion="css …">` внутри
разметки сегментов. С реестром такие теги стоят только в `<head>` и в точках вставки между
`<script>` потока (перед ними `</script>`, после — `<script>`/`<link>`), а не перед элементом
компонента. В dev при переносе в библиотеку (2026-09-24) так выглядели четыре приложения с
разной схемой подключения: инлайн-стилей перед элементами 0, ошибок гидратации в консоли нет.
На staging пилота — 20 загрузок проблемной карточки в свежих контекстах без #418.

Смежное: [nextjs16-turbopack-default-emotion-hydration](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)
— другой mismatch от Emotion (`<Global>` + Turbopack), лечится `--webpack`;
[ssr-hydration-persisted-state](/.claude/docs/ssr-hydration-persisted-state.md) —
детерминированный mismatch из-за своего кода.

Найдено 2026-09-24: плавающий #418 на карточках каталога ронял по 1–2 разных e2e-теста в каждом
полном прогоне staging перед первым продом.
