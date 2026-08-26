# Чистка Chakra `as=` (`Icon as=`, `Link as=`) — общий рецепт

Semgrep-правило `letar-chakra-as-prop-forbidden` (`.semgrep/letar-rules.yml`, `PLAN.md` §61)
запрещает проп `as=` на Chakra-компонентах. Три независимые сессии (`libs/video-player-react`,
`libs/ui`, `apps/animatrona-landing` — коммиты `80ac608c`, `d50a078c`, `087521ce`) вывели один и
тот же рецепт заново. Ниже — рецепт, чтобы следующая сессия его не переизобретала.

## 1. Статический `<Icon as={LuX} boxSize={N} color="token" />`

Убрать `Icon`, рендерить react-icons компонент напрямую. `boxSize` (Chakra spacing scale) → `size`
в пикселях (`boxSize={N}` = `size={N*4}`, т.к. Chakra spacing token `N` = `N*0.25rem` = `N*4px`).
Chakra-токен цвета → CSS custom property `var(--chakra-colors-<токен-через-дефис>)`.

```tsx
// до
<Icon as={LuSkipBack} color="player.control" />
<Icon as={isPlaying ? LuPause : LuPlay} color="player.control" boxSize={6} />

// после
<LuSkipBack size={20} color="var(--chakra-colors-player-control)" />
{isPlaying
  ? <LuPause size={24} color="var(--chakra-colors-player-control)" />
  : <LuPlay size={24} color="var(--chakra-colors-player-control)" />}
```

Точечные значения из практики: `boxSize={3}` → `size={12}`, `boxSize={4}` → `size={16}`,
`boxSize={5}` → `size={20}`, `boxSize={6}` → `size={24}`, `boxSize={10}` → `size={40}`.

Токен с точкой в имени (`player.control`, `whiteAlpha.500`) превращается в дефис:
`whiteAlpha.500` → `var(--chakra-colors-white-alpha-500)`, `green.400` →
`var(--chakra-colors-green-400)`.

## 2. Иконка уже наследует цвет от родителя — просто убрать `color`

Если обёртка (`Box`/`Button`) уже задаёт `color` через Chakra, отдельный `color=` на иконке не
нужен — react-icons SVG использует `currentColor` по умолчанию:

```tsx
// было: <Icon as={icon} boxSize={6} /> внутри Box с color={`${colorPalette}.600`}
<IconComponent size={24} />
```

(пример — `libs/ui/src/lib/stat-card.tsx`, коммит `80ac608c`).

## 3. Динамический `<Icon as={obj.icon} />` — завести переменную с большой буквы

JSX резолвит тег как DOM-элемент, если имя начинается со строчной буквы. `obj.icon` (свойство
объекта) в JSX так и остаётся lowercase-выражением — нужно присвоить его локальной переменной
`PascalCase` **непосредственно перед использованием** (внутри `.map()`-колбэка — на каждой
итерации отдельно):

```tsx
// пропс/данные: icon: IconType
const IconComponent = icon
const SubtextIcon = subtextIcon
// ...
<IconComponent size={24} />
<SubtextIcon size={12} />

// внутри .map()
{NAV_ITEMS.map((item) => {
  const NavIcon = item.icon
  return <NavIcon size={16} />
})}
```

Примеры: `libs/ui/src/lib/stat-card.tsx` (`IconComponent`/`SubtextIcon`),
`apps/animatrona-landing/.../downloads-section.tsx` (`PlatformIcon = info.icon`),
`apps/animatrona-landing/.../docs-sidebar.tsx` (`NavIcon = item.icon` внутри `.map()`),
`apps/animatrona-landing/.../UpNextOverlay.tsx` (`ButtonIcon = contentStyles.buttonIcon`).

## 4. Spacing-проп на `Icon` (`mr`, `ml` и т.п.) — react-icons не понимает Chakra style-пропы

`<Icon as={X} mr={1} />` работал, потому что `Icon` — Chakra-компонент и понимает `mr`. Голый
react-icons SVG — нет. Перенести отступ в инлайн `style`:

```tsx
// до
<Icon as={contentStyles.buttonIcon} mr={1} />

// после
<ButtonIcon size={16} style={{ marginRight: 4 }} />
```

(Chakra spacing `1` = `4px` — та же конвертация ×4, что и для `boxSize`.)

## 5. Тот же паттерн ловит любой Chakra-компонент с `as=`, не только `Icon`

Semgrep-правило матчит `as=` на произвольном Chakra-компоненте. Частый случай — `Link as={NextLink}`:
чинится через `asChild` + `NextLink` как единственный child:

```tsx
// до
<Link as={NextLink} href={item.href} display="flex" alignItems="center" gap={3} ...>
  <Icon as={item.icon} boxSize={4} />
  {item.label}
</Link>

// после
<Link asChild display="flex" alignItems="center" gap={3} ...>
  <NextLink href={item.href}>
    <NavIcon size={16} />
    {item.label}
  </NextLink>
</Link>
```

⚠️ `asChild` с несколькими детьми молча рендерит только первого — см.
[chakra-aschild-multiple-children-silent-drop](chakra-aschild-multiple-children-silent-drop.md).
Здесь это не проблема: у `Link` ровно один child (`NextLink`), а иконка и текст — дети _внутри_
`NextLink`, не самого `Link`.

## 6. Codemod — `scripts/codemods/chakra-icon-as-cleanup.mjs`

После пяти сессий, вручную применявших один и тот же рецепт, пункты 1-4 автоматизированы
(ts-morph, AST-трансформация, не regex). Запуск:

```bash
node scripts/codemods/chakra-icon-as-cleanup.mjs "apps/<app>/**/*.tsx"
```

Для каждого `<Icon as=...>` печатает `[skip] <файл>:<строка> — <причина>`, если случай
неоднозначный, и в конце — сводку `сконвертировано N, пропущено M` плюс список файлов с
оставшимися вхождениями. Удаляет неиспользуемый импорт `Icon` из `@chakra-ui/react`, если после
трансформации файла он больше нигде не встречается.

### Что конвертирует автоматически

- Статический `as={LuX}` (пункт 1) и наследование `currentColor` без `color=` (пункт 2).
- Динамический `as={identifier}` / `as={obj.prop}` (пункт 3) — заводит `const <Var> = <expr>`
  перед ближайшим statement блока, который содержит использование (не обязательно в начале
  функции — см. пример с `contentStyles.buttonIcon` в UpNextOverlay, где переменная встаёт прямо
  перед `return`, после того как `contentStyles` уже вычислен).
- Тернарник `as={cond ? A : B}`, когда обе ветки — простой `Identifier`/`PropertyAccessExpression`
  (рекурсивно резолвятся тем же путём, что и одиночный `as=`).
- `mr=`/`ml=` с числовым литералом → `style={{ marginRight/marginLeft: N }}` (пункт 4, только
  инлайн-`style`-вариант; вариант «добавить `gap` на родителя» codemod не делает — это требует
  понимания, гарантированно ли родитель flex-контейнер).

### Что осознанно пропускает (нужна ручная доработка)

- **`boxSize=` отсутствует.** Это не редкий край, а **примерно половина** реальных вхождений
  (проверено на исходных версиях `SharedPlayerControls.tsx`/`SharedVolumeControl.tsx`/
  `SpeedSelector.tsx` до чистки — 9 из 14 узлов). Chakra `Icon` без `boxSize` рендерится в
  `1em`, но человек в реальных диффах подставлял разный числовой размер (16/20/24) по контексту
  окружающей кнопки (`IconButton size="sm"` → 20, `size="md"` → 24, инлайн-иконка перед текстом
  → 16) — единого дефолта нет, кодмод намеренно не угадывает.
- Любой проп на `Icon`, кроме `as`/`boxSize`/`color`/`mr`/`ml` и заведомо HTML/SVG-совместимых
  (`className`, `title`, `onClick`/`onMouseEnter`/..., `tabIndex`, `role`, `id`, `fill`, `stroke`,
  `strokeWidth`, `data-*`, `aria-*`). Пример живого случая — `zIndex={1}` в `ResumeOverlay.tsx`:
  человек не просто перенёс его в `style`, а **добавил** `position: 'relative'`, которого не было
  в исходнике — `zIndex` без `position` ничего не даёт, это осознанное архитектурное решение, не
  механический перенос. Кодмод такие узлы не трогает.
- `boxSize=`/`color=`/`mr=`/`ml=` не буквальный литерал (числовой/строковый), а выражение.
  `as=` — не `Identifier`/`PropertyAccessExpression`/простой тернарник (вложенные тернарники,
  вызовы функций).
- `Icon` с детьми (`<Icon as={X}>...</Icon>` вместо самозакрывающегося) — нетипичный случай.
- Спред-атрибут (`{...iconProps}`) на `Icon`.
- **`as=` на не-`Icon` компонентах** (`Link as={NextLink}`, `Box as="section"`, `Heading
  as="h1"`) — вне скоупа кодмода целиком, даже не пытается опознать. Эти случаи чинятся другим
  приёмом (`asChild` + нативный тег, пункт 5) и остаются полностью ручными.

На реальных данных (28 файлов `apps/driving-school`, отобранных до кодмода) конвертирует ~50%
узлов автоматически, остальное — предсказуемо честные `[skip]` с причиной, не молчаливый
пропуск. После кодмода **обязателен** проход `nx run-many -t format --projects=<app>` — вставка
переменных через ts-morph не всегда попадает в отступ окружающего блока 1:1, дальше эту
косметику подчищает dprint, а не сам кодмод.

## 7. `as="строка-html-тега"` — та же `asChild`-механика, другой источник

Пункт 5 разбирал `Link as={NextLink}` (component-as). Отдельная форма того же запрета —
`as="section"`/`"nav"`/`"footer"`/`"h1"`/`"span"` и т.п. на `Box`/`Heading`/`Text`: вместо
компонента в `as=` передана строка HTML-тега. Механика фикса та же (`asChild` + единственный
нативный child), но исходный код и типовые ловушки — другие. Разобрано на `animatrona-landing`
(коммит `19f055a5`, 49 срабатываний → 0 по всему приложению).

### `Box as="section"/"nav"/"footer"` — простой случай

```tsx
// до
<Box as="section" id="features" py={16}>{children}</Box>

// после
<Box asChild id="features" py={16}>
  <section id="features">{children}</section>
</Box>
```

⚠️ Атрибуты, специфичные для тега (`id` в примере выше), обычно нужно продублировать на
нативном элементе, а не только оставить на `Box` — `id` как HTML-атрибут и `id` как Chakra-проп
в разметке совпадают, но не все атрибуты так безобидны (см. случай с обработчиками ниже).

### `Heading as="h1"` — сохранить уровень заголовка 1:1

Самый рискованный случай пункта: ошибиться в уровне (`h1`→`h2`) не даёт ни ошибки typecheck, ни
визуальной разницы (стиль задаёт `size=`, не тег), но ломает семантику страницы для
accessibility/SEO — пропадает единственный `h1` или задваивается уровень.

```tsx
// до
<Heading as="h1" size="xl">Заголовок</Heading>

// после
<Heading asChild size="xl">
  <h1>Заголовок</h1>
</Heading>
```

Переносить нужно ровно тот тег, что стоял в `as=` — не «естественный» уровень по контексту.

### `Text as="span"` — аналогично, инлайн-контекст

```tsx
// до
<Text as="span" color="brand.400">текст</Text>

// после
<Text asChild color="brand.400">
  <span>текст</span>
</Text>
```

### Нетривиальный случай — стили и HTML-обработчики вперемешку на одном узле

`Box as="button"` часто нёс одновременно Chakra-стили (`w`, `h`, `bg`) и HTML-специфичные пропы
(`onClick`, `aria-label`) — при `asChild` их нужно растащить: стили остаются на `Box`,
HTML-атрибуты и обработчики переезжают на нативный тег внутри.

```tsx
// до
<Box
  as="button"
  onClick={handleClick}
  aria-label="Закрыть"
  w={8}
  h={8}
  bg="brand.500"
/>

// после
<Box asChild w={8} h={8} bg="brand.500">
  <button type="button" onClick={handleClick} aria-label="Закрыть" />
</Box>
```

`type="button"` добавлен явно — нативный `<button>` без него в форме ведёт себя как submit,
чего не было у Chakra `Box as="button"`.

### Несколько JSX-детей — все переезжают ВНУТРЬ единственного нативного тега

`Heading`/`Box` с несколькими прямыми детьми (текст + условный `<Text as="span">` и т.п.) при
переходе на `asChild` не могут оставить их прямыми детьми `Heading` — все они переезжают внутрь
единственного нативного тега:

```tsx
// до
<Heading as="h1" size="xl">
  {title}
  {isNew && <Text as="span" color="brand.400"> New</Text>}
</Heading>

// после
<Heading asChild size="xl">
  <h1>
    {title}
    {isNew && <span style={{ color: 'var(--chakra-colors-brand-400)' }}> New</span>}
  </h1>
</Heading>
```

Иначе Chakra's `asChild` молча отрендерит только первого ребёнка — см.
[chakra-aschild-multiple-children-silent-drop](chakra-aschild-multiple-children-silent-drop.md).

## Источники

Реальные диффы четырёх сессий — `git show 80ac608c`, `git show d50a078c`, `git show 087521ce`,
`git show 19f055a5`. Остаток по репозиторию — `PLAN.md` §61 (~1406 срабатываний в `apps/*` на
момент замера).
