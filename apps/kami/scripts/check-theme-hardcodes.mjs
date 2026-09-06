import { resolve } from 'node:path'
import { runThemeCheckCli } from '@letar/theme-check'

// Сгенерировано `nx g @letar/generators:theme-check-integrate`. Общая логика правил (HEX/rgb/hsl,
// сырая тень, transition/transitionDuration, scale() вне шкалы темы) — в @letar/theme-check, см.
// её README за полным списком опций и .claude/docs/theme-hardcode-gate-coverage.md за историей.

const projectRoot = resolve(import.meta.dirname, '..')

const ignoredDirectories = new Set(['generated'])

// kami не имеет каталога src/theme/ (см. .claude/docs/theme-hardcode-gate-coverage.md,
// раздел «kami — особый случай») — роль src/theme/ у него играет один файл,
// src/app/_components/theme-provider.tsx (createSystem/defineConfig, семантические токены
// изумрудно-зелёной Matrix-палитры). themePrefix указывает прямо на него, а не на директорию,
// чтобы этот файл получил то же освобождение от HEX/тени/transition, что theme-файлы в других
// приложениях — правило scale() (includeTheme: true) проверяется и здесь, см. allowlist ниже.
const themePrefix = 'src/app/_components/theme-provider.tsx'

// Значения, которые НЕ являются нарушением, но совпадают с regex гейта. Классы легитимных
// исключений — три задокументированных (metadata Next.js, рендер без Chakra-провайдеров,
// одноразовый декоративный эффект) плюс четвёртый, специфичный для kami: Canvas 2D API. У
// canvas ровно тот же класс проблемы, что у satori/next-og — ctx.fillStyle/strokeStyle не
// умеет резолвить CSS-переменные темы (var(--chakra-colors-x)), только конкретный цвет-строку,
// поэтому там нет смысла требовать токен.
const allowedMatches = new Map([
  // PWA-манифест (web-app-manifest spec) — background_color/theme_color обязаны быть literal
  // HEX, читает браузер/ОС при установке, вне рендер-дерева Chakra.
  ['src/app/manifest.ts', new Set(['#0a0a0a', '#00d9ff'])],

  // Canvas 2D — аудио-спектрограмма (audio/[slug]): цвета вычисляются на лету по амплитуде
  // сигнала и пишутся в ctx.fillStyle/strokeStyle, доступа к CSS-переменным темы нет.
  [
    'src/app/[locale]/audio/[slug]/_components/audio-spectrogram.tsx',
    new Set(['#00FF41', '#f5f5f5', 'rgba(${drawR}, ${drawG}, ${drawB}, ${intensity})']),
  ],
  [
    'src/app/[locale]/audio/[slug]/_components/audio-spectrum-visualizer.tsx',
    new Set(['rgba(${bgRgb}, ${fadeOpacity})', 'hsl(${hue}, 100%, ${lum})']),
  ],
  [
    'src/app/[locale]/audio/[slug]/_components/audio-waveform.tsx',
    new Set(['#047857', '#00FF41', '#d1d5db', '#4b5563']),
  ],
  [
    'src/app/[locale]/audio/[slug]/_components/poster-sonogram-slider.tsx',
    new Set(['#f5f5f5', 'rgba(${drawR}, ${drawG}, ${drawB}, ${intensity})']),
  ],
  [
    'src/app/_components/matrix-rain.tsx',
    new Set([
      '#00FF41',
      'rgba(0,0,0,0.05)',
      'rgba(${bgRgb}, ${fadeOpacity})',
      'rgb(${bgRgb})',
      'rgba(249,250,251,0.9)',
      'rgba(0,0,0,0.9)',
    ]),
  ],

  // Аккордеон FAQ (consulting): один css-блок анимирует grid-template-rows (высота через grid
  // вместо max-height) и opacity в одной декларации с РАЗНЫМИ длительностями/кривыми на каждое
  // свойство — Chakra transitionProperty/transitionDuration не умеет задать разную длительность
  // на разные свойства одного элемента, поэтому здесь это остаётся сырой CSS-строкой.
  [
    'src/app/[locale]/consulting/_components/faq-section.tsx',
    new Set([
      "transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease'",
    ]),
  ],

  // Плавающая кнопка чата — рост при hover (scale > 1), а не глубина нажатия (scale < 1): по
  // документации pressScale (libs/ui/src/lib/press-scale.ts, раздел «Когда НЕ использовать эту
  // шкалу») это другая механика — привлечение внимания, а не press-feedback, шкала для неё не
  // подходит по смыслу даже при численном совпадении.
  ['src/app/_components/chat/chat-button.tsx', new Set(["transform: 'scale(1.05)"])],

  // Фолбэк code-highlighter при сбое shiki — статичная HTML-строка (inline style=), уходит
  // напрямую в разметку мимо React/Chakra, доступа к теме нет; #24292e/#e1e4e8 — цвета темы
  // 'github-dark' самого shiki (см. themes выше по файлу), не UI kami.
  ['src/app/_components/code-highlighter.tsx', new Set(['#24292e', '#e1e4e8'])],

  // MatrixRain — canvas-компонент, `color` уходит прямо в ctx.fillStyle, не в CSS. #0a7a4a —
  // отдельный, специально приглушённый оттенок для светлой темы (не совпадает ни с одним шагом
  // fg-палитры — на белом фоне обычный matrix-green слишком кислотный), подобран визуально.
  ['src/app/_components/hero/hero.tsx', new Set(['#0a7a4a'])],

  // Официальные брендовые цвета логотипа Google («G») — фиксированы гайдлайном Google, не
  // цвет UI kami, токенизировать нечего.
  [
    'src/app/_components/icons/google-icon.tsx',
    new Set(['#4285F4', '#34A853', '#FBBC05', '#EB4335']),
  ],

  // theme-provider.tsx освобождён от HEX/тени/transition через themePrefix выше (это и есть
  // src/theme/ этого приложения). Правило scale() — includeTheme: true, проверяется всегда:
  //   - button-recipe `_active: scale(0.93)` — press-feedback самой кнопки; сознательно не
  //     переиспользует pressScale из @letar/ui (см. её JSDoc, раздел «Когда НЕ использовать эту
  //     шкалу») и не смешивается с pressableConfig.globalCss (тот не разлит в этом приложении,
  //     см. комментарий в globalCss выше по файлу) — одно значение, один источник.
  //   - keyframes 'matrix-zoom' (scale 3→6→12→108→100→3) — разовый декоративный эффект
  //     («цифровой» zoom-burst фона), последовательность подобрана визуально кадр за кадром,
  //     не переиспользуемая шкала.
  [
    'src/app/_components/theme-provider.tsx',
    new Set([
      "transform: 'scale(0.93)",
      "transform: 'scale(3)",
      "transform: 'scale(6)",
      "transform: 'scale(12)",
      "transform: 'scale(108)",
      "transform: 'scale(100)",
    ]),
  ],

  // HTML email-шаблоны (заявки hire/consulting) — плейн-HTML строки, отправляются через SMTP,
  // рендерятся почтовыми клиентами вне React/Chakra целиком; тот же класс, что и next/og —
  // рендер без доступа к CSS-переменным темы. Значения продублированы между двумя похожими
  // шаблонами (hire/consulting) сознательно — email-клиенты ненадёжно поддерживают внешний CSS,
  // общий source of truth здесь не выигрыш.
  [
    'src/lib/email/email-service.ts',
    new Set([
      '#666',
      '#333',
      '#f5f5f5',
      '#ffffff',
      '#38a169',
      '#2d3748',
      '#3182ce',
      '#f8f9fa',
      '#eee',
      '#999',
      '#805ad5',
      'rgba(0,0,0,0.1)',
    ]),
  ],

  // GLOW (Matrix-стиль свечения) — двойное использование:
  //  1. GLOW.color уходит в canvas-компонент MatrixRain (см. hero.tsx) — та же причина
  //     дублирования HEX вместо ссылки на токен fg.500, что у canvas-визуализаторов выше:
  //     ctx.fillStyle не резолвит var(--chakra-colors-fg-500).
  //  2. text/box-shadow-поля — декоративное свечение под текст/карточки (feature-card.tsx,
  //     blog/page.tsx), rgba с постоянным emerald-каналом (16,185,129 = #10B981 = fg.500) и
  //     разной альфой/офсетом по месту использования — один эффект, не шкала, токенизировать
  //     нечего без заведения отдельной shadow-token-системы ради трёх мест использования.
  [
    'src/lib/utils/constants.ts',
    new Set([
      '#10B981',
      'rgba(16, 185, 129, 0.5)',
      'rgba(16, 185, 129, 0.4)',
      'rgba(16, 185, 129, 0.6)',
      'rgba(16, 185, 129, 0.15)',
      'rgba(0,0,0,0.1)',
      "Shadow: '0 ",
      "boxShadow: '0 ",
    ]),
  ],
])

await runThemeCheckCli({
  projectRoot,
  sourceDirName: 'src',
  ignoredDirectories,
  themePrefix,
  allowedMatches,
})
