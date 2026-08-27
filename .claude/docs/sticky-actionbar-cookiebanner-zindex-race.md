# StickyActionBar перекрыт CookieBanner по pointer-events на короткой странице

⚠️ Найдено 2026-08-27, `archetest` (`apps/archetest-e2e/src/express.spec.ts`, 3 из 21 теста,
только firefox/webkit) — регресс класса, задокументированного раньше в самом
`sticky-action-bar.tsx` (2026-07-28, тот же archetest).

## Симптом

`locator.click()` по кнопке внутри `StickyActionBar` (`@letar/ui`) висит 30с и падает:

```
<div class="chakra-stack css-...">…</div> from <div class="css-...">…</div>
subtree intercepts pointer events
```

Только в firefox/webkit headless, chromium проходит стабильно. Только на коротких
страницах (контент помещается в viewport без скролла — типично для intro-экранов).

## Причина

`StickyActionBar` — `position: sticky`, приподнимается над `CookieBanner` (`position: fixed`)
только через bottom-отступ по CSS-переменной `--letar-cookie-banner-height`. Это работает
исключительно пока панель уже физически «застряла» (stuck) в sticky-режиме.

На короткой странице (контент не требует скролла) панель может ещё **не застрять** и стоять в
обычном потоке документа у самого нижнего края страницы — ровно там же, где `CookieBanner`
всегда сидит как `fixed`. В этот момент решает только `zIndex`, а не bottom-отступ. У панели
был `zIndex="docked"` (Chakra-токен, значение 10), у `CookieBanner` по умолчанию `zIndex={1000}`
— на два порядка выше. `CookieBanner` выигрывает пересечение и перехватывает клик по CTA.

Firefox/webkit против chromium: расчёт высоты intro-контента от шрифта чуть отличается между
движками (в первую очередь line-height/font-metrics для кириллицы), поэтому «застрянет панель
к моменту клика или нет» — плавающая по браузеру граница, не детерминированная гонка таймингов.

## Фикс

`libs/ui/src/lib/sticky-action-bar.tsx` — `zIndex="docked"` → `zIndex="sticky"` (Chakra-токен,
значение 1100 > дефолтного 1000 у `CookieBanner`). CTA гарантированно выигрывает pointer-events
у баннера независимо от того, застряла панель или ещё в потоке. Коммит `33feb329`.

## Если всплывёт снова

Если у конкретного приложения `CookieBanner` передаётся с явным `zIndex` **выше** 1100 (studio,
например, использует пониженный zIndex 300–303 под слои «трубки» — там наоборот, но проверить
на случай будущих приложений с завышенным значением) — конфликт может вернуться. Общее решение
тогда — не гнаться за конкретным числом, а завести общую константу уровня z-index для
bottom-anchored интерактивных элементов, которую оба компонента (`CookieBanner`,
`StickyActionBar`) читают из одного места.
