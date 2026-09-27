import { resolve } from 'node:path'
import { runThemeCheckCli } from '@letar/theme-check'

// Сгенерировано `nx g @letar/generators:theme-check-integrate`. Общая логика правил (HEX/rgb/hsl,
// сырая тень, transition/transitionDuration, scale() вне шкалы темы) — в @letar/theme-check, см.
// её README за полным списком опций и .claude/docs/theme-hardcode-gate-coverage.md за историей.

const projectRoot = resolve(import.meta.dirname, '..')

// Список подобран автодетектом каталогов на момент подключения. Если позже заведёте новый каталог
// того же назначения (ещё один PDF-рендер, ещё один generated), впишите имя сюда вручную —
// повторный запуск генератора не перезаписывает существующий скрипт.
const ignoredDirectories = new Set(["assets","generated"])

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
  // Класс 1: Metadata Next.js (viewport.themeColor) — literal вне доступа к CSS-переменным темы.
  ['src/app/layout.tsx', new Set(['#319795'])],

  // Класс 2: рендер через next/og ImageResponse (satori, opengraph-image.tsx/twitter-image.tsx) —
  // инлайновые style без доступа к DOM/CSSOM и, следовательно, к переменным темы Chakra.
  [
    'src/app/_components/social-image.tsx',
    new Set([
      '#070a10',
      '#111827',
      '#0d3436',
      '#f7f3e8',
      '#4fd1c5',
      '#9ca3af',
      '#d1d5db',
      'rgba(79, 209, 197, 0.22)',
      'rgba(79, 209, 197, 0.12)',
      'rgba(255, 255, 255, 0.18)',
    ]),
  ],

  // Класс 3: одноразовый декоративный эффект (мягкая elevation-тень карточки), не образующий
  // переиспользуемую шкалу — у каждой карточки свой подбор непрозрачности. Regex «сырая тень»
  // матчит только префикс до открывающей rgba(), не всё значение — allowlist держит именно этот
  // префикс, отдельно от самого rgba()-цвета (правило «сырой rgb()/rgba()-цвет» ловит его целиком).
  [
    'src/app/_components/ecosystem-preview.tsx',
    new Set(['rgba(0, 0, 0, 0.34)', 'rgba(0, 0, 0, 0.44)', 'boxShadow="0 ', "boxShadow: '0 "]),
  ],
  [
    'src/app/_components/featured-projects-section.tsx',
    new Set(['rgba(0, 0, 0, 0.28)', "boxShadow: '0 "]),
  ],
  // Класс 3: точечный тёплый glow вокруг статус-индикатора в шапке — одноразовый эффект.
  [
    'src/app/_components/site-header.tsx',
    new Set(['rgba(101, 230, 210, 0.7)', 'boxShadow="0 ']),
  ],
])

await runThemeCheckCli({
  projectRoot,
  sourceDirName: 'src',
  ignoredDirectories,
  // Приложение не имеет каталога src/theme/ — тема лежит в одном файле src/lib/theme.ts
  // (createSystem/defineConfig с палитрой brand и семантическими токенами bg/fg/border), тот же
  // случай, что у apps/kami (см. .claude/docs/theme-hardcode-gate-coverage.md, раздел «kami —
  // особый случай»). themePrefix матчится через startsWith на путь, не обязательно на директорию.
  themePrefix: 'src/lib/theme.ts',
  allowedMatches,
})
