import { resolve } from 'node:path'
import { runThemeCheckCli } from '@letar/theme-check'

// Сгенерировано `nx g @letar/generators:theme-check-integrate`. Общая логика правил (HEX/rgb/hsl,
// сырая тень, transition/transitionDuration, scale() вне шкалы темы) — в @letar/theme-check, см.
// её README за полным списком опций и .claude/docs/theme-hardcode-gate-coverage.md за историей.

const projectRoot = resolve(import.meta.dirname, '..')

// Список подобран автодетектом каталогов на момент подключения. Если позже заведёте новый каталог
// того же назначения (ещё один PDF-рендер, ещё один generated), впишите имя сюда вручную —
// повторный запуск генератора не перезаписывает существующий скрипт.
const ignoredDirectories = new Set(["generated"])

// Значения, которые НЕ являются нарушением, но совпадают с regex гейта. Три задокументированных
// класса легитимных исключений (образцы — уже подключённые apps/domwellbes, apps/studio,
// apps/aboi):
//   1. Metadata Next.js (themeColor/background_color) — literal вне доступа к CSS-переменным темы.
//   2. Рендер через next/og ImageResponse (satori) или без Chakra-провайдеров (см.
//      .claude/docs/nextjs-root-notfound-no-root-layout.md) — тоже без доступа к теме.
//   3. Одноразовый декоративный эффект (magic-number градиент/тень), не образующий шкалу и не
//      переиспользуемый — токенизировать нечего.
// Каждая находка вне этих трёх классов — вероятно настоящий баг (см. итоги подключения к aboi:
// один такой случай оказался небрежной копипастой мимо Chakra-пропа и был исправлен, а не
// занесён сюда).
//
// src/app/auth/_actions/signin.action.ts — `#310` НЕ цвет: номер ошибки React в комментарии
// («redirect() из server action вызывает React error #310 при transition»), ложное совпадение по
// regex (тот же класс, что studio active-timer.tsx «#418»).
//
// src/app/layout.tsx — `themeColor` в Next.js `viewport` — literal вне доступа к CSS-переменным
// темы (класс 1).
//
// src/lib/ansi-to-react.tsx — единственный источник маппинга ANSI-кодов терминала (30-37/90-97,
// плюс фон 40-47/100-107) в CSS-цвета для рендера цветного лога деплоя/сборки (переиспользуется
// в DeployLogDialog.tsx, LogsDialog.tsx, DeployProgress.tsx). Значения — фиксированная палитра
// ANSI-эмулятора терминала (та же у любого терминала), не UI-цвет компонента и не брендовая
// палитра — токенизировать через Chakra semantic tokens нечего, это отдельный протокол, а не
// элемент дизайн-системы.
//
// src/app/_components/apps/AppResourceHistory.tsx — #4299E1/#48BB78 не совпадают ни с одним
// текущим токеном Chakra (blue.400/green.400 в этой версии — #60a5fa/#4ade80, см.
// SystemOverview.tsx, где совпадающие цвета уже переведены на var(--chakra-colors-*)). Это
// собственная цветовая пара графика CPU/Memory, отдельная от общей CHART_COLORS — не дубликат
// уже токенизированного значения.
//
// src/app/_components/charts/MetricsChart.tsx — сетка/оси графика (`stroke`) `#374151`/`#6B7280`:
// не совпадают ни с одним текущим Chakra-токеном gray.* (см. node_modules/@chakra-ui/react —
// gray.700=#3f3f46, gray.500=#71717a) — не дубликат, а собственный decorative-цвет recharts вне
// доступа к семантическому контракту темы (SVG-примитив, значение задаётся один раз здесь).
//
// src/app/_components/system/SystemOverview.tsx, src/app/_components/charts/MetricsChart.tsx
// (дефолт `color` prop) — `#CA9E67` здесь уже не собственный литерал, а fallback внутри
// `var(--chakra-colors-brand-500, #CA9E67)` (тот же паттерн, что studio revenue-chart.tsx):
// реальный источник цвета — токен темы, HEX только на случай отсутствия CSS-переменной в
// контексте инлайн-SVG recharts.
const allowedMatches = new Map([
  ['src/app/auth/_actions/signin.action.ts', new Set(['#310'])],
  ['src/app/layout.tsx', new Set(['#CA9E67'])],
  [
    'src/lib/ansi-to-react.tsx',
    new Set([
      '#000000', '#ef4444', '#22c55e', '#eab308', '#3b82f6', '#a855f7', '#06b6d4', '#e5e5e5',
      '#737373', '#fca5a5', '#86efac', '#fde047', '#93c5fd', '#d8b4fe', '#67e8f9', '#ffffff',
    ]),
  ],
  ['src/app/_components/apps/AppResourceHistory.tsx', new Set(['#4299E1', '#48BB78'])],
  ['src/app/_components/charts/MetricsChart.tsx', new Set(['#374151', '#6B7280', '#CA9E67'])],
  ['src/app/_components/system/SystemOverview.tsx', new Set(['#CA9E67', '#4ADE80', '#60A5FA'])],
])

await runThemeCheckCli({
  projectRoot,
  sourceDirName: 'src',
  ignoredDirectories,
  // Приложение не имеет src/theme/ на момент подключения гейта — ни один файл не
  // освобождён от общих правил. Если позже заведёте отдельный каталог темы, впишите его сюда
  // вручную (см. apps/domwellbes/scripts/check-theme-hardcodes.mjs как образец).
  themePrefix: 'src/theme/',
  allowedMatches,
})
