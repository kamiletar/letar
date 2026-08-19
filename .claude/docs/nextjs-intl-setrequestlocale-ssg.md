# next-intl: `setRequestLocale` в каждом `page.tsx`, не только в корневом `layout.tsx`

## Симптом

`[locale]/layout.tsx` объявляет `generateStaticParams`, но конкретная страница в выводе
`next build` остаётся `ƒ` (Dynamic) вместо `●` (SSG) / `○` (Static).

## Причина

next-intl не может определить локаль на этапе статической генерации сегмента, если
`setRequestLocale(locale)` вызван только в родительском `layout.tsx`. Next.js App Router решает
про статичность **каждый сегмент маршрута отдельно** — вызов в layout не распространяется на
листовой `page.tsx` для целей этого решения. Нужно вызывать `setRequestLocale(locale)` в начале
каждого `page.tsx` (и в `generateMetadata`, если он есть и использует locale), даже если тот же
вызов уже стоит в layout.

## Фикс

```tsx
type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  // ... использовать locale явно, не неявный getLocale()/getTranslations() без locale
}

export default async function SomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // ...
}
```

Рабочий эталон — `apps/aira-web/src/app/[locale]/page.tsx`.

## ⚠️ Две ловушки при массовом аудите

Найдены 2026-08-19 при проверке studio, aboi, kami, time, archetest, mandala по этому паттерну.

### 1. `ƒ` может стоять по легитимной причине — правка ничего не даст

Прежде чем добавлять `setRequestLocale`, проверь, не форсит ли страницу в Dynamic что-то другое:

- `export const dynamic = 'force-dynamic'` — явный флаг (в паре случаев оказался лишним, без
  реальной причины — см. `apps/mandala` ниже; но чаще стоит намеренно, см.
  `.claude/rules/nextjs-apps.md` про публичные страницы с админ-редактируемыми данными);
- `cookies()`/`headers()`/`searchParams` — Dynamic API Next.js, форсят динамику независимо от
  `setRequestLocale`;
- вызов `auth()`/`getSession()`/`requireAdmin()` внутри самой страницы **или в родительском
  layout** (route group).

Если такая причина есть — `setRequestLocale` физически ничего не изменит. Всегда перепроверяй
`nx build <app>` **до и после** правки и сверяй маркер именно для тронутой страницы, а не верь
на слово, что фикс сработал.

### 2. Причина может быть на уровень выше листовой страницы — в самом корневом `layout.tsx`

`apps/kami`: временно добавили `setRequestLocale` в 5 страниц-кандидатов, маркер не изменился
**ни для одной**, включая страницы, у которых `setRequestLocale` уже стоял раньше. Root cause
оказался на уровень выше: корневой `[locale]/layout.tsx` безусловно вызывал `getSession()` (для
шапки/`UserProvider`) на **каждой** странице сайта; `getSession()` внутри делает `await
headers()` — Dynamic API, форсящий динамику всего поддерева, включая уже статически
подготовленные листья. В такой ситуации `setRequestLocale` в `page.tsx` бессилен: SSG невозможен
для всего сайта, пока layout безусловно читает `headers()`/`cookies()`. Если правка не даёт
эффекта ни на одной странице сразу — ищи причину в layout-цепочке, а не только в самой странице.

### Итог аудита (2026-08-19)

| Приложение | Результат                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------- |
| studio     | ✅ Реальный фикс — 6 страниц `(public)/[locale]/*`, коммит `e8c31ac`                          |
| mandala    | ✅ Реальный фикс — `/contacts` держал лишний `force-dynamic` без причины, `ƒ → ●`             |
| aboi       | Без изменений — контент за `requireAdmin()` (pre-launch гейт), правка не дала бы эффекта      |
| kami       | Без изменений — root cause в корневом layout (`getSession()`→`headers()`), правки отменены    |
| time       | Без изменений — уже полностью `●` на всех маршрутах                                           |
| archetest  | Без изменений — все кандидаты уже вызывают `setRequestLocale`, остальное динамично заслуженно |

Не проверялись в этом заходе остальные приложения монорепо с тем же паттерном
(`[locale]/layout.tsx` + `generateStaticParams`) — если найдётся новый кандидат, применяй тот же
чек-лист: build до/после, поиск Dynamic API в самой странице и в родительских layout.
