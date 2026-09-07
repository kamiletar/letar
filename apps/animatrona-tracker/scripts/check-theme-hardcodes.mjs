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
  // src/app/_components/ui/provider.tsx — аудит pressScale (.claude/docs/press-scale-audit-task.md):
  // 0.9 — мелкие поверхности (control чекбокса/радио, компактная кнопка xs/sm), вне диапазона
  // шкалы; 0.85 — close-триггер тега, тот же класс; 1.1 — рост thumb слайдера при захвате, а не
  // проседание (другая механика по семантике, не глубина нажатия).
  ['src/app/_components/ui/provider.tsx', new Set([`transform: 'scale(0.9)`, `transform: 'scale(0.85)`, `transform: 'scale(1.1)`])],
  // Рост при наведении, не проседание — другая механика, pressScale не подходит по семантике
  // (см. её JSDoc в libs/ui/src/lib/press-scale.ts).
  ['src/app/anime/[id]/_components/video-section.tsx', new Set([`transform: 'scale(1.02)`])],
  ['src/app/_components/continue-watching-section.tsx', new Set([`transform: 'scale(1.02)`])],
])

await runThemeCheckCli({
  projectRoot,
  sourceDirName: 'src',
  ignoredDirectories,
  // Приложение не имеет каталога src/theme/ — палитра/семантические токены/recipes живут в
  // одном файле provider.tsx (тот же случай, что у apps/kami — themePrefix матчится через
  // startsWith на путь, не обязательно на директорию, см.
  // .claude/docs/theme-hardcode-gate-coverage.md § «kami — особый случай»).
  themePrefix: 'src/app/_components/ui/provider.tsx',
  allowedMatches,
})
