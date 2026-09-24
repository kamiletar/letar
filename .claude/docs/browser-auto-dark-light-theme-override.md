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

Ключевое слово `only` запрещает браузеру подменять схему. Правило живёт в
`ColorModeProvider` (`@letar/chakra-provider`, с 0.5.0) и включено по умолчанию:

- рендерит `<style>` с `html.light{color-scheme:only light}html.dark{color-scheme:dark}` —
  обычный CSS в потоке SSR, действует до гидратации, без вспышки;
- передаёт next-themes `enableColorScheme={false}`: его инлайновый `style="color-scheme: …"`
  перебил бы это правило;
- селекторы строятся по `attribute`/`value` провайдера (`class`, `data-*`, карта значений);
- `lockColorScheme={false}` возвращает прежнее поведение next-themes.

Приложению делать ничего не нужно. Не дублируй `colorScheme` в `globalCss` темы и не передавай
`enableColorScheme` вручную — вернёшь старую проблему.

После фикса прогон с принудительным затемнением даёт настоящую светлую страницу, вычисленный
`color-scheme` у `<html>` — `light only`.

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

Закрыто для всех приложений на `ColorModeProvider` из `@letar/chakra-provider` (проверено
2026-09-24 в Playwright с принудительным затемнением: archetest и grandslamcup — `light only`,
светлый снимок; при снятом правиле тот же снимок тёмный). `DarkOnlyChakraProvider` (лендинги,
synth) не затронут: там всегда `forcedTheme="dark"`, вычисленный `color-scheme` — `dark`, как и был.

⚠️ Не покрыты приложения со **своим** `ThemeProvider` из `next-themes`, минуя `ColorModeProvider`
(по грепу импортов `next-themes` на 2026-09-24 — `animatrona/renderer`, `mandala`): там инлайновый `color-scheme: light` остаётся. Переводить на общий провайдер
или добавлять правило руками — по мере надобности; Electron-рендереры авто-затемнением Chrome
Android не страдают.
