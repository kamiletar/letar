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

## Источники

Реальные диффы трёх сессий — `git show 80ac608c`, `git show d50a078c`, `git show 087521ce`.
Остаток по репозиторию — `PLAN.md` §61 (~1406 срабатываний в `apps/*` на момент замера).
