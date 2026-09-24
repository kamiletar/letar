# Авто-затемнение браузера перекрашивает светлую тему — «темы не различаются»

⚠️ Жалоба «светлая и тёмная темы выглядят одинаково» при исправных токенах и работающем
переключателе. В чистом браузере темы различаются, на телефоне пользователя — нет. Найдено в
archetest (аудит дизайна 2026-09-24, v0.28.0).

## Механизм

Brave и Chrome на Android умеют принудительно затемнять сайты («Тёмный режим для сайтов»,
флаг `WebContentsForceDark`). Браузер решает, затемнять ли страницу, по её `color-scheme`:

- `color-scheme: dark` — у страницы своя тёмная тема, её не трогают;
- `color-scheme: light` (или без объявления) — страница «светлая», её перекрашивают алгоритмом.

next-themes (`ColorModeProvider` из `@letar/chakra-provider`) по умолчанию пишет на `<html>`
инлайновый `style="color-scheme: light"` в светлой теме. Для браузера с авто-затемнением это
приглашение: выбранная пользователем светлая тема рендерится тёмной, и оба режима выглядят
почти одинаково. Цвета при этом ещё и искажаются (инверсия бренда, диаграмм).

Проверено в headless Chromium: `--enable-features=WebContentsForceDark
--blink-settings=forceDarkModeEnabled=true` + `localStorage.theme = 'light'` → скриншот
неотличим от тёмной темы; `<html class="light">`, вычисленный `color-scheme: light`.

## Фикс

Ключевое слово `only` запрещает браузеру подменять схему:

```ts
// theme/index.ts → defineConfig({ globalCss })
'html.light': { colorScheme: 'only light' },
'html.dark': { colorScheme: 'dark' },
```

```tsx
// providers.tsx — иначе инлайновый style от next-themes перебьёт правило темы
<ColorModeProvider enableColorScheme={false}>
```

После фикса тот же прогон с принудительным затемнением даёт настоящую светлую страницу,
вычисленный `color-scheme` — `light only`.

## Как проверить у себя

```js
// Playwright: воспроизведение «телефона с тёмным режимом для сайтов»
chromium.launch({ args: ['--enable-features=WebContentsForceDark', '--blink-settings=forceDarkModeEnabled=true'] })
// + context colorScheme: 'dark', localStorage.theme = 'light' → снимок должен быть светлым
```

## Что не является причиной

- Токены `_light`/`_dark` и условия Chakra (`.light &`/`.dark &`) — в archetest были исправны.
- Переключатель темы — рядом стояла кнопка высокого контраста с иконкой ◐, и её принимали
  за переключатель темы. Это отдельная UX-проблема той же жалобы: на мобильной шапке
  переключатель темы должен быть узнаваемым (☀/☾), а не прятаться в меню.

## Охват

Сейчас фикс только в archetest. `ColorModeProvider` общий для всех приложений с тёмной темой —
перенос в `@letar/chakra-provider` (опция или поведение по умолчанию) не сделан.
