# «Сохранить в PDF» через печать браузера: тёмная тема и двойной `beforeprint`

Паттерн для выгрузки страницы в PDF **без серверного рендера**: кнопка зовёт `window.print()`,
а PDF пользователь выбирает принтером в системном диалоге. Серверный рендер PDF — CPU-работа в
потоке запроса ([heavy-work-off-main-thread](/.claude/rules/heavy-work-off-main-thread.md)), а
печатная версия страницы уже есть: её надо только почистить стилями печати.

Образец — `apps/archetest` (волна 7.6, v0.34.0): `_components/print-button.tsx`,
`@media print`-правила в `src/theme/index.ts`, атрибут `data-print-hide` на экране результатов и
в карточке клиента.

## Что делает каждая часть

- **CSS печати** (`globalCss` темы): `header`, `[data-print-hide]`, тосты (`[data-scope="toast"]`)
  → `display: none`; карточки → `break-inside: avoid`; `body` → `print-color-adjust: exact`, иначе
  полосы баллов и бейджи на фоне пропадают при выключенной «печати фона» в диалоге.
- **`data-print-hide`** ставится на то, что на бумаге бессмысленно (кнопки, навигация, баннер
  cookie — через обёртку, у `CookieBanner` своего атрибута нет) **и на то, что нельзя печатать**:
  приватные заметки специалиста в карточке клиента — распечатка может уйти клиенту.
- **Светлая тема на время печати** — в самой кнопке, слушателями `beforeprint`/`afterprint` на
  `window`. Слушатели, а не код в `onClick`, потому что Ctrl+P кнопку не нажимает.

## ⚠️ Ловушка 1: тёмная тема печатается нечитаемой

Браузер по умолчанию не печатает фоны, а цвет текста печатает. В тёмной теме текст светлый, и на
белой бумаге он почти не виден. Выглядит как «PDF какой-то бледный», а не как ошибка. Поэтому
класс темы на `<html>` на время печати меняется `dark` → `light` и возвращается после.

## ⚠️ Ловушка 2: второй `beforeprint` затирает флаг

Наивная версия:

```ts
// ❌ повторный beforeprint (класс уже light) пишет wasDark = false — тема не вернётся
const before = () => {
  wasDark = root.classList.contains('dark')
  if (wasDark) { root.classList.replace('dark', 'light') }
}
```

Chromium шлёт `beforeprint` сам при печати в PDF, в том числе поверх уже идущей печати. Так это и
нашлось: проверка через Playwright `page.pdf()` после ручного `beforeprint` оставила страницу в
светлой теме. Флаг должен только **взводиться**, а сбрасывать его — один `afterprint`:

```ts
// ✅ replace() возвращает true, только если заменил
const before = () => {
  if (root.classList.replace('dark', 'light')) { wasDark = true }
}
const after = () => {
  if (wasDark) {
    root.classList.replace('light', 'dark')
    wasDark = false
  }
}
```

Компонентный тест — два `beforeprint` подряд, потом `afterprint`, класс снова `dark`
(`print-button.spec.tsx`).

## ⚠️ Ловушка 3: `'@media print'` внутри `globalCss` Chakra v3 — TS2353

Вложенный объект `'@media print': { 'header, [data-print-hide]': {…} }` не проходит typecheck:
значение `@media` — это `SystemStyleObject`, а произвольный селектор его ключом быть не может. Надо
наоборот: селектор на верхнем уровне `globalCss`, условие `_print` внутри:

```ts
'header, [data-print-hide], [data-scope="toast"]': { _print: { display: 'none !important' } },
```

## Проверка

Playwright в том же браузере, что и пользователь:

1. `page.pdf({ format: 'A4', printBackground: true })` — сам PDF (Chromium применяет print-медиа
   и шлёт `beforeprint`/`afterprint`).
2. Текст PDF (PyMuPDF `page.get_text()`): приватного и кнопок в нём нет. Страницы — растром,
   глазами: светлая тема, графики recharts укладываются в ширину A4.
3. `page.emulateMedia({ media: 'print' })` + `getComputedStyle` — точечно, что скрыто.
