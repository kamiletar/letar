import { runThemeCheckCli } from '@letar/theme-check'
import { resolve } from 'node:path'

// Сгенерировано `nx g @letar/generators:theme-check-integrate`. Общая логика правил (HEX/rgb/hsl,
// сырая тень, transition/transitionDuration, scale() вне шкалы темы) — в @letar/theme-check, см.
// её README за полным списком опций и .claude/docs/theme-hardcode-gate-coverage.md за историей.

const projectRoot = resolve(import.meta.dirname, '..')

// Список подобран автодетектом каталогов на момент подключения. Если позже заведёте новый каталог
// того же назначения (ещё один PDF-рендер, ещё один generated), впишите имя сюда вручную —
// повторный запуск генератора не перезаписывает существующий скрипт.
const ignoredDirectories = new Set(['generated'])

// Значения, которые НЕ являются нарушением, но совпадают с regex гейта — заполняется вручную по
// мере первых прогонов. Три задокументированных класса легитимных исключений (образцы — уже
// подключённые apps/domwellbes, apps/studio, apps/aboi):
//   1. Metadata Next.js (themeColor/background_color) — literal вне доступа к CSS-переменным темы.
//   2. Рендер через next/og ImageResponse (satori) или без Chakra-провайдеров (см.
//      .claude/docs/nextjs-root-notfound-no-root-layout.md) — тоже без доступа к теме.
//   3. Одноразовый декоративный эффект (magic-number градиент/тень), не образующий шкалу и не
//      переиспользуемый — токенизировать нечего.
// Каждая находка вне этих трёх классов — вероятно настоящий баг (см. итоги подключения к aboi:
// один такой случай оказался небрежной копипастой мимо Chakra-пропа и был исправлен, а не
// занесён сюда).
const allowedMatches = new Map([
  // Класс 1 — metadata: `themeColor` во viewport читается браузером до гидратации, CSS-переменных
  // темы там нет. Значения повторяют `bg` (gray.50 / gray.900).
  ['src/app/[locale]/layout.tsx', new Set(['#FAFAFA', '#18181B'])],
  // Класс 2 — satori (next/og ImageResponse): рендер без Chakra-провайдера.
  ['src/app/apple-icon.tsx', new Set(['#7C3AED', '#5B21B6'])],
  // Категориальная палитра данных: у каждой шкалы свой фиксированный цвет-идентичность (легенда,
  // серии графика динамики, рамка карточки). Идёт в `stroke` recharts — SVG-атрибут, который
  // токены Chakra не резолвит. Шкалы не образует и не переиспользуется вне справочника шкал.
  [
    'src/app/[locale]/_data/personality-types.ts',
    new Set([
      '#00A3C4',
      '#00B5D8',
      '#2C7A7B',
      '#3182CE',
      '#319795',
      '#38A169',
      '#4299E1',
      '#48BB78',
      '#6B46C1',
      '#718096',
      '#805AD5',
      '#975A16',
      '#9C4221',
      '#A0AEC0',
      '#B794F4',
      '#B83280',
      '#C53030',
      '#D53F8C',
      '#D69E2E',
      '#DD6B20',
      '#E53E3E',
      '#ECC94B',
      '#F6AD55',
    ]),
  ],
])

await runThemeCheckCli({
  projectRoot,
  sourceDirName: 'src',
  ignoredDirectories,
  themePrefix: 'src/theme/',
  allowedMatches,
})
