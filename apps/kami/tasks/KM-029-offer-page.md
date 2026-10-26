---
id: KM-029
title: "Посадочная «Заказать сайт»: страница /site/ с условиями, шагами, FAQ и CTA в заявку студии"
status: ready
size: L
area: design
priority: 1
blocked_by: []
owner: ""
stage: ""
source: Решение владельца 2026-10-26, спецификация KM-028
created: 2026-10-26
updated: 2026-10-26
---

## Что и зачем

Своя посадочная Kami для одного оффера «Заказать сайт». Посетители — знакомые и друзья,
пришедшие по QR с визитки или по рекомендации, почти всегда с телефона. Странице нужно быстро
ответить: сколько стоит, как долго, как идёт работа, что если не понравится. Финальное
действие — заявка студии. Полная спецификация и черновики текста — KM-028.

## Приёмка

- [ ] `/site/` (ru, без префикса) и `/en/site/` открываются напрямую и после reload; metadata, canonical, hreflang, запись в `sitemap.ts`, страница индексируется.
- [ ] Секции по порядку: hero → условия → tagline → три шага → проекты (слот для KM-032) → FAQ → финальный CTA. Над сгибом один CTA.
- [ ] CTA hero и финала ведут на заявку студии с `?topic=site&from=kami`; адрес собирается одной функцией, которую использует и `public-navigation.ts`.
- [ ] Цифры условий берутся из `src/lib/offer.ts`; значение `null` — карточка не выводится, выдуманных чисел в коде нет.
- [ ] Tagline: каждое слово переходит из приглушённого (~30%) в полный цвет по очереди при прокрутке; без JS и при reduced-motion текст сразу полного цвета.
- [ ] Основной текст виден без JS: появления секций не прячут контент до гидратации.
- [ ] FAQ — `<details>`/`<summary>` или аналог с клавиатурой; FAQPage JSON-LD.
- [ ] События Umami `site-cta` с `{ place: 'hero' | 'final' }`.
- [ ] Проверено: 320/390/430/1440 px, RU/EN, светлая/тёмная тема, Chromium и WebKit, нет горизонтального скролла, CTA ведёт по живой ссылке, focus-visible у всех ссылок и кнопок.

## План

Перед началом: прочитать KM-028, навык `landing-page-design` (часть A и адаптацию для Letar),
`.claude/skills/kami/references/public-entry.md`.

1. **Адрес заявки.** В `src/lib/public-navigation.ts` вынести `getStudioOrderUrl(locale, from?)`
   (сейчас строка собирается внутри `getPublicNavigation`); пункт `order` пока не трогать —
   его адрес меняет KM-031.
2. **Конфиг условий** `src/lib/offer.ts`:
   ```ts
   /** Условия посадочной; null — карточка скрыта, пока владелец не дал цифру (KM-033). */
   export const OFFER = {
     priceFromRub: null as number | null,
     weeksFrom: null as number | null,
     friendsDiscountPercent: null as number | null,
     freeFirstCall: true,
     stagedPayment: true,
   }
   ```
   Формат цены — `Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })`.
3. **Тексты** в `messages/ru.json` и `messages/en.json`, namespace `site`: hero, условия, tagline,
   шаги, FAQ (вопросы и ответы-черновики из KM-028 с пометкой в журнале «черновик, ждёт KM-033»),
   CTA. Без дефисов внутри фраз там, где их можно переписать; русская орфография важнее.
4. **Страница** `src/app/[locale]/site/page.tsx` (Server Component, `setRequestLocale`, `generateMetadata`
   по образцу `contacts/page.tsx`) и секции в `src/app/[locale]/site/_components/`:
   `offer-hero.tsx`, `offer-terms.tsx`, `tagline-reveal.tsx` (client), `offer-steps.tsx`,
   `offer-faq.tsx`, `offer-final-cta.tsx`. Слот проектов — пустой компонент `offer-projects.tsx`,
   который KM-032 наполнит.
5. **Hero:** заголовок и подзаголовок `maxW="680px"`, `textWrap="balance"`, переносы по смыслу;
   CTA `Button asChild` + `<a href>` 16 px semibold; строка доказательства — только из `OFFER`
   и реальных счётчиков, иначе строки нет.
6. **Tagline:** слова в `<span>`; один `IntersectionObserver` с набором порогов либо один
   scroll-обработчик через `requestAnimationFrame`, слово активно, когда пересекло линию на 60%
   высоты окна; переход `color`/`opacity` 300 мс по `cubic-bezier(0.22,1,0.36,1)`.
   Исходное состояние «приглушено» ставит только JS (атрибут на секции после монтирования).
7. **Появление секций:** не использовать `FadeIn` из `_components/motion` для основного текста —
   `initial="hidden"` прячет SSR-текст до гидратации. Либо CSS-класс, который вешает JS, либо
   без анимации.
8. **Фон:** буквенный фон на `/site/` в спокойном режиме (без церемонии, `home={false}` уже так
   работает) — проверить читаемость; карточки на стекле как в меню главной.
9. **JSON-LD** FAQPage рядом с существующим `json-ld.tsx`; запись в `sitemap.ts` по образцу `contacts`.
10. **Umami:** `trackEvent('site-cta', { place })` на клик (client-обёртка вокруг ссылки).
11. Проверка по приёмке: Playwright-скрипт в scratchpad, снимки в `.claude/artifacts/km029-*.png`.
12. Версия minor, CHANGELOG, `format` → `lint` → `typecheck:tsgo`, коммит. Без push и `bun.lock`.

Не делать: формы на Kami, отзывов и логотипов без данных, изменений `hero.tsx` и меню (KM-031).

## Журнал

- 2026-10-26: поставлена по спецификации KM-028.

## Итог
