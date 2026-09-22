# ⚠️ Переменная шрифта ниже токена темы — сайт молча рисуется системным шрифтом

`next/font` отдаёт объект с полем `variable` — это **класс**, который нужно повесить на элемент;
класс объявляет CSS-переменную вида `--font-onest: "onest", "onest Fallback"`. Каноничный пример
из документации Next.js вешает класс на `<body>`:

```tsx
<html lang="ru">
  <body className={`${onest.variable} ${unbounded.variable}`}>
```

С Chakra v3 (и любой темой, которая собирает свои токены из этих переменных) так делать **нельзя**.

## Механизм

Chakra объявляет токены на `:root`, то есть на `<html>`:

```css
:root {
  --chakra-fonts-body: var(--font-onest), "Segoe UI", sans-serif;
}
```

Подстановка `var()` внутри значения **кастомного свойства** выполняется при вычислении этого
свойства — на том элементе, где оно объявлено, а не там, где потом используется
([CSS Variables §3](https://www.w3.org/TR/css-variables-1/#invalid-variables)). На `<html>`
переменной `--font-onest` ещё нет (она появится ниже, на `<body>`), поэтому `--chakra-fonts-body`
вычисляется в **пустую строку** и такой — уже без всякого `var()` — наследуется вниз по дереву.
Дальше `font-family: var(--chakra-fonts-body)` не даёт ничего, и браузер берёт дефолт.

Обычное свойство ведёт себя иначе: `.signal-font { font-family: var(--font-signal) }` на потомке
`<body>` работает, потому что подстановка идёт на самом потомке, где переменная уже видна. Ловушка
срабатывает **только** на цепочке «кастомное свойство → кастомное свойство», где потребитель
объявлен выше поставщика.

## Почему выглядит как успех

Ни одна привычная проверка не краснеет:

- `@font-face` в документе есть, с правильным `font-family`, `font-weight`, `font-display: swap`;
- `<link rel="preload" as="font">` стоит, файл по сети реально запрашивается;
- сборка, `lint`, `typecheck` зелёные — это не ошибка кода;
- `document.fonts.ready` резолвится;
- визуально страница выглядит законченной — просто другой гарнитурой, и без эталона рядом это
  не читается как дефект.

Единственный прямой признак — `getComputedStyle(document.documentElement)
.getPropertyValue('--chakra-fonts-body')` возвращает `''`, а статус фейса в `document.fonts`
остаётся `unloaded` при наличии preload-запроса.

## Проверка

```javascript
const root = document.documentElement
const token = getComputedStyle(root).getPropertyValue('--chakra-fonts-body').trim()
const applied = getComputedStyle(document.querySelector('h1')).fontFamily
const faces = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`)
console.log({ token, applied, faces })
```

Пустой `token` и `applied`, начинающийся с `ui-sans-serif`/`ui-monospace`, — дефект.

## Фикс

Класс переменной — на `<html>`, тот же элемент, где Chakra объявляет токены:

```tsx
<html lang="ru" suppressHydrationWarning className={`${onest.variable} ${unbounded.variable}`}>
  <body>
```

## Где встречалось

- `domwellbes` — починено 2026-09-22. Класс висел на `<body>` с момента вёрстки витрины; весь
  публичный сайт и админка рисовались системным `ui-sans-serif` вместо Onest/Unbounded. Нашлось
  случайно, при переводе шрифтов на `next/font/local`: живая проверка «шрифт применился» не
  прошла и на исходном коде тоже.
- Остальные приложения монорепо (`aprel8008`, `auth-hub`, `driving-school`, `dsperevod`, `kami`,
  `kami-key-the-landing`, `svoichuzhie`, `animatrona/renderer`) вешают класс на `<html>` — они
  не затронуты.
- `letar-landing` и `time` держат класс на `<body>`, но потребляют переменную **обычным**
  свойством (`.signal-font { font-family: … }`, инлайновый `style`) — это рабочий случай, трогать
  не нужно.
- `studio` — та же конструкция, что была в domwellbes (`phosphorFontStack` уходит в токены
  `fonts.*`, а классы висели на вложенном `<Box>` в `(public)/layout.tsx`): починено 2026-09-22,
  классы `vgaFont.variable`/`departureMonoFont.variable` перенесены на `<html>` в корневом
  `layout.tsx`. Живая проверка в браузере не проводилась (dev-сервер уже был занят другой
  сессией) — фикс сделан по статическому анализу кода, паттерн идентичен уже подтверждённому в
  domwellbes. Японский `arkPixelJaFont` не тронут — он потребляется **обычным** свойством
  (`css={{ fontFamily: phosphorFontStackJa }}` на том же элементе, где объявлен класс), это
  рабочий случай, не цепочка «кастомное свойство → кастомное свойство».
