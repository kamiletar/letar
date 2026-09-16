# Playwright: колонтитулы PDF через CSS page margin boxes, не `displayHeaderFooter`

Проверено 2026-09-16 на Playwright + Chromium. Задача — собрать брендированный многостраничный
PDF из HTML-вёрстки (обложка + содержательные страницы), где колонтитул (номер страницы, название
раздела) не должен появляться на обложке.

## Ловушка: `page.pdf({ displayHeaderFooter, footerTemplate })`

`displayHeaderFooter` рисует переданный `footerTemplate`/`headerTemplate` на **каждой** странице
документа без исключений. Если обложка сделана как первая страница того же документа с
`@page :first { margin: 0 }` (картинка на весь лист), футер всё равно накладывается поверх неё —
опция не умеет пропустить конкретную страницу.

Внутри `footerTemplate` доступен `<span class="pageNumber">`, но нет самого номера страницы в
разметке шаблона в момент рендера — условие вида «не рисовать на странице 1» написать нельзя,
это plain HTML-строка без доступа к JS-логике вызывающего кода.

## Рабочий приём: CSS page margin boxes

Chromium (131+) поддерживает часть спецификации CSS Paged Media — колонтитулы описываются прямо в
CSS через `@bottom-left`/`@bottom-right`/`@top-center` и т.п. внутри `@page`, без опций Playwright:

```css
@page {
  margin: 20mm 15mm;
  @bottom-left {
    content: 'Название документа';
  }
  @bottom-right {
    content: counter(page) ' / ' counter(pages);
  }
}

@page :first {
  margin: 0;
}
```

На странице с обнулёнными полями (`:first`) margin boxes физически негде рисовать — контент,
описанный в `@bottom-*`/`@top-*`, там не появляется. Это и есть исключение для обложки, которое
не выразить через `footerTemplate`.

Вызов `page.pdf`:

```javascript
await page.pdf({
  path: outputPath,
  preferCSSPageSize: true,
  printBackground: true,
  // displayHeaderFooter НЕ указывать — колонтитулы уже в CSS
})
```

`preferCSSPageSize: true` обязателен — иначе Chromium игнорирует `@page` размер/поля и подставляет
свои дефолты поверх margin boxes.

## Сопутствующие мелочи, каждая по отдельности «не ловится глазом»

- **Шрифты Google Fonts не успевают.** Перед `page.pdf` дождаться
  `await page.evaluate(() => document.fonts.ready)`. Без этого часть текста уходит в PDF с
  фолбэк-шрифтом браузера — визуально «просто чуть другой шрифт», не ошибка рендера.
- **Контент подгружается асинхронно.** `waitUntil: 'networkidle'` при `page.goto` — если HTML
  сам подтягивает изображения или шрифты через сеть, `load` срабатывает раньше их прихода.
- **Playwright из скрипта вне корня монорепо.** Если скрипт сборки PDF лежит не в корне (например
  в `docs/` приложения) и импортирует `playwright` напрямую, обычный резолвер модулей может не
  найти пакет в изолированной установке bun — см.
  [nested-package-resolution-under-bun-isolated-installs](/.claude/docs/nested-package-resolution-under-bun-isolated-installs.md)
  (тот же фикс через `createRequire` от корневого `package.json` применим и здесь).
- **CSS-счётчики наследуются вложенными списками неожиданно.** Селектор `.steps li` матчит **все**
  `<li>` на любой глубине вложенности, включая `<li>` вложенного `<ul>` внутри пункта верхнего
  уровня — вложенный список наследует `counter-increment` родительского и сбивает нумерацию.
  Нужен прямой child-селектор `.steps > li`, если вложенность в разметке возможна.
- **Проверка вёрстки на глаз в браузере не эквивалентна проверке PDF.** Печатный CSS (`@page`,
  `break-*`, margin boxes) рендерится только в момент печати/экспорта — открытая в браузере
  страница показывает совсем другую раскладку. Надёжная проверка: рендер страниц готового PDF в
  PNG (например `pypdfium2`) и склейка результата в один обзорный лист для визуального ревью —
  не открывать сам PDF глазами постранично и не доверять превью HTML в браузере.

## Итоговый паттерн вызова

```javascript
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: outputPath,
  preferCSSPageSize: true,
  printBackground: true,
})
await browser.close()
```

Вся логика колонтитулов и их исключения на обложке — в CSS документа (`@page`, `@page :first`,
`@bottom-left`/`@bottom-right`), не в опциях Playwright.
