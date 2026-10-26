---
id: KM-029
title: "Посадочная «Заказать сайт»: страница /site/ с условиями, шагами, FAQ и CTA в заявку студии"
status: done
size: L
area: design
priority: 1
blocked_by: []
owner: kami-dev-offer-page
stage: ""
source: Решение владельца 2026-10-26, спецификация KM-028
created: 2026-10-26
updated: 2026-10-27
closed: 2026-10-27
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
- [ ] В hero настоящее фото владельца: рядом с заголовком на компьютере, над ним на телефоне; `next/image`, alt в обеих локалях, без сдвига раскладки, не выше 240 px на телефоне.
- [ ] Превью ссылки с лицом и именем: `og:image`/`twitter:image` 1200×630 у главной (`/`, `/en/`) и у `/site/` в обеих локалях; адреса картинок отвечают 200 без редиректа на локаль; превью проверено по разметке и одним реальным постом ссылки в Telegram.
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
8. **Фото в hero** (решение владельца 2026-10-26). Исходник — `.claude/artifacts/kami-feedback-2026-10-25/portrait.webp`
   (640×640, анфас, чёрный фон). Скопировать в `src/assets/site/portrait.webp` (владелец согласен,
   что фото станет публичным вместе с сайтом; оригинал другого размера не добавлять). Статический
   импорт в `next/image` с `sizes`, `priority` только если фото оказалось LCP-элементом. Скругление
   и рамка в стиле стеклянных карточек; на светлой теме чёрный фон фото оставить как есть —
   кадр с рамкой, а не вырезанный силуэт. alt: «Ками» / «Kami».
9. **Превью ссылки.** Файлы `src/app/[locale]/opengraph-image.tsx` и `src/app/[locale]/site/opengraph-image.tsx`
   на `ImageResponse` из `next/og`, 1200×630: слева фото на чёрном, справа моноширинное «KAMI»
   и строка (главная — роль, `/site/` — заголовок оффера) на языке локали. Общая разметка — в
   `src/lib/og-card.tsx`, обе страницы её вызывают.
   - ⚠️ Satori не читает `woff2`: нужен TTF/OTF JetBrains Mono с кириллицей (OFL уже лежит в
     `src/app/fonts/`), добавить файл и грузить через `readFile`/`fetch(new URL(..., import.meta.url))`.
   - ⚠️ Metadata-роуты отдаются без расширения в URL и попадают в intl matcher: добавить
     `opengraph-image` и `twitter-image` в `metadataRoutes` при генерации литерала matcher в
     `src/proxy.ts` (дрейф ловит `proxy.spec.ts`), см.
     `.claude/docs/nextjs-intl-matcher-metadata-routes.md` и навык `i18n-multilingual`.
   - Проверить `curl -I` на `/opengraph-image`, `/en/opengraph-image`, `/site/opengraph-image`,
     `/en/site/opengraph-image` — 200 и `image/png`; затем в собранном приложении (`nx build`),
     а не только в `next dev`.
10. **Фон:** буквенный фон на `/site/` в спокойном режиме (без церемонии, `home={false}` уже так
    работает) — проверить читаемость; карточки на стекле как в меню главной.
11. **JSON-LD** FAQPage рядом с существующим `json-ld.tsx`; запись в `sitemap.ts` по образцу `contacts`.
12. **Umami:** `trackEvent('site-cta', { place })` на клик (client-обёртка вокруг ссылки).
13. Проверка по приёмке: Playwright-скрипт в scratchpad, снимки в `.claude/artifacts/km029-*.png`.
14. Версия minor, CHANGELOG, `format` → `lint` → `typecheck:tsgo`, коммит. Без push и `bun.lock`.

Не делать: формы на Kami, отзывов и логотипов без данных, изменений `hero.tsx` и меню (KM-031).

## Параллельная работа (KM-029 и KM-030 одновременно)

Обе задачи делаются в общем чекауте `main` двумя сессиями. Файлы у них разные, кроме общих:
`apps/kami/package.json`, `apps/kami/CHANGELOG.md`, `apps/kami/messages/ru.json`, `apps/kami/messages/en.json`.

- Перед правкой общего файла — эксклюзивная резервация в Agent Mail на этот файл (TTL 15 мин),
  `fetch_inbox` и чужие резервации проверить; правка → коммит сразу → `release_file_reservations`.
- Перед правкой общего файла перечитать его с диска: соседняя сессия могла его изменить.
- `messages/*.json`: только свой namespace (`site` у KM-029, `home.boot` у KM-030), чужие ключи не трогать.
- Версию и CHANGELOG поднимать одним коммитом в самом конце, от текущего значения на диске.
- Коммит — перечисляя файлы, затем `git show --stat HEAD`: в коммите нет файлов соседней задачи.
- Dev-сервер kami (порт 3005) один на двоих: если `http://localhost:3005` уже отвечает —
  использовать его, второй `nx dev kami` не запускать. Не останавливать сервер, который запускала не ты.
- Таймер studio: проект `kami` (внутренний), этап — название задачи дословно.

## Журнал

- 2026-10-26: поставлена по спецификации KM-028.
- 2026-10-26: по решению владельца добавлены фото в hero и превью ссылки с лицом (п. 8, 9).
- 2026-10-26: модель claude-sonnet-5-5, medium: решения приняты в задании, код и проверки по спецификации

## Итог

Посадочная /site/ (ru, en) готова: hero с фото, условия из offer.ts, tagline, шаги, FAQ + FAQPage JSON-LD, финальный CTA на заявку студии (?topic=site&from=kami), Umami site-cta, sitemap/canonical/hreflang. Превью ссылки 1200x630 у главной и /site/ (200 image/png в dev, адреса без /ru/ в метаданных). Проверено Playwright chromium+webkit, 320/390/430/1440, ru/en, светлая/тёмная: нет горизонтального скролла, CTA с верной ссылкой. НЕ проверено: nx build (standalone, ключ outputFileTracingIncludes для opengraph-image не подтверждён), реальный пост в Telegram, ручной focus-visible. Тексты условий и FAQ — черновики до KM-033. Коммиты bf6467de5, 1010a5a7b; версия 0.40.0, bun.lock не тронут (нужен отдельный коммит lock). proxy.ts не менялся: OG-файлы внутри [locale].
