# Electron: свой заголовок окна + системные кнопки Windows (`titleBarOverlay`)

**Коротко:** для своей HTML-шапки с сохранением нативных Snap Layouts Windows 11 нужен
`titleBarStyle: 'hidden'` + `titleBarOverlay`, а не `frame: false`. `frame: false` рисует кнопки
свернуть/развернуть/закрыть самостоятельно (HTML) и теряет `WM_NCHITTEST`/`HTMAXBUTTON` —
системное меню Snap Layouts (наведение на «развернуть») с ним не работает вообще, это ограничение
Chromium/Electron, не баг конкретного приложения.

Найдено и применено в `kami-key-the` (`apps/kami-key-the`, редизайн v1.8.0).

## Разница с `frame: false`

|                                      | `frame: false`                      | `titleBarStyle: 'hidden'` + `titleBarOverlay` |
| ------------------------------------ | ----------------------------------- | --------------------------------------------- |
| Кнопки свернуть/развернуть/закрыть   | рисуешь сам (HTML/SVG)              | системные, рисует Windows                     |
| Snap Layouts (hover на «развернуть») | ❌ не работает                      | ✅ работает                                   |
| Перетаскивание окна                  | `-webkit-app-region: drag` на шапке | то же самое                                   |
| Цвет кнопок под тему                 | свой SVG — сам меняешь цвет         | `setTitleBarOverlay({ color, symbolColor })`  |
| Место под кнопки в layout            | не нужно                            | нужен отступ через `env(titlebar-area-*)`     |

`apps/animatrona/renderer/src/components/layout/TitleBar.tsx` — пример `frame: false` (HTML-кнопки,
Snap Layouts недоступны, осознанный выбор для того приложения). `kami-key-the` выбрал обратное —
Kami явно попросил нативные кнопки ради Snap Layouts.

## Main-процесс

```typescript
// main/window-chrome.ts
import type { BrowserWindowConstructorOptions } from 'electron'
import { nativeTheme } from 'electron'

const TITLE_BAR_HEIGHT = 48 // гайдлайн Microsoft для заголовка с интерактивными элементами

export function editorWindowOptions(icon: string, preload: string): BrowserWindowConstructorOptions {
  const dark = nativeTheme.shouldUseDarkColors
  return {
    width: 1180,
    height: 800,
    minWidth: 920,
    minHeight: 620,
    icon,
    show: false, // + once('ready-to-show', () => win.show()) — без этого вспышка белым
    backgroundColor: dark ? '#0b0e0c' : '#f4f7f4',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000', // прозрачный — под кнопками видна HTML-шапка, не системная полоса
      symbolColor: dark ? '#e9efe9' : '#101511',
      height: TITLE_BAR_HEIGHT,
    },
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  }
}

/** Переприменить оверлей и фон окна при смене темы Windows на лету */
export function applyWindowTheme(win: Electron.BrowserWindow): void {
  const dark = nativeTheme.shouldUseDarkColors
  win.setTitleBarOverlay({
    color: '#00000000',
    symbolColor: dark ? '#e9efe9' : '#101511',
    height: TITLE_BAR_HEIGHT,
  })
  win.setBackgroundColor(dark ? '#0b0e0c' : '#f4f7f4')
}

export function watchNativeTheme(getWindows: () => Electron.BrowserWindow[]): void {
  nativeTheme.on('updated', () => {
    for (const win of getWindows()) {
      if (!win.isDestroyed()) {
        applyWindowTheme(win)
      }
    }
  })
}
```

⚠️ **`win.removeMenu()` обязателен рядом с этим паттерном.** Без него `Alt` открывает стандартное
меню Electron (File/Edit/View/...) поверх своей шапки — для утилиты без файлового меню это чистый
шум, а с `titleBarOverlay` выглядит особенно странно (меню появляется ниже системных кнопок).

## Renderer: безопасная зона под кнопки

Electron прокидывает CSS env-переменные `titlebar-area-x`/`titlebar-area-width` (и `-y`/`-height`)
только когда `titleBarOverlay` активен — в браузере (dev-заглушка, Browser pane) их нет, и
`env(..., fallback)` подставляет fallback.

```css
/* правый отступ шапки — не даёт контенту залезть под системные кнопки */
padding-inline-end: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
```

Перетаскивание — тот же приём, что у `frame: false`:

```tsx
const DRAG_REGION = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as React.CSSProperties
```

`WebkitAppRegion` отсутствует в типе `React.CSSProperties` (не стандартное CSS-свойство) — без
`as React.CSSProperties` TypeScript даёт `TS2353`. Каждый интерактивный элемент шапки (кнопки
навигации, `Switch`, `Tooltip`-триггер) должен получить `no-drag`, иначе клик по нему становится
перетаскиванием окна.

## Порядок вызовов

1. Регистрировать `nativeTheme.on('updated', ...)` **после** `app.whenReady()` — до готовности
   `nativeTheme.shouldUseDarkColors` может быть недостоверным.
2. `once('ready-to-show', () => win.show())` — обязательно, иначе окно либо мигает белым (дефолтный
   фон Chromium до первой отрисовки), либо видно недорисованным.
3. `setTitleBarOverlay()` можно вызывать многократно (на смену темы) — Electron просто перерисовывает
   полосу с кнопками, окно не мигает.

## Живая проверка (что нельзя увидеть в Browser pane)

Browser pane не эмулирует `titleBarOverlay` — оверлей и Snap Layouts видны только в реальном
Electron-окне. Часть пунктов физически недоступна агенту (наведение мышью на «развернуть» и
всплытие Snap Layouts — не тестируется программно, только руками):

- системные кнопки не перекрывают интерактивные элементы шапки (проверять `env(titlebar-area-*)`
  визуально на живом скриншоте, не в браузере — там `env()` даёт fallback);
- шапка тащит окно (сам факт, что `no-drag`-зоны не мешают клику);
- нет вспышки белым при открытии;
- `Alt` не открывает системное меню;
- смена темы Windows (Параметры → Персонализация → Цвета) на лету красит и кнопки, и HTML-шапку
  одновременно, без перезапуска окна.

## См. также

- [electron-app-protocol.md](/.claude/docs/electron-app-protocol.md) — другой класс проблем origin
  под `file://`, не пересекается с этим паттерном напрямую
- [vite-dev-letar-ui-barrel-process-undefined.md](/.claude/docs/vite-dev-letar-ui-barrel-process-undefined.md) —
  найдено в том же редизайне `kami-key-the`
- Источники: [Electron docs — Window Customization § Overlay](https://www.electronjs.org/docs/latest/tutorial/window-customization#overlay),
  [MDN — env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
