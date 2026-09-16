# Electron/Nextron: `shared/` рантайм-код и единый объект настроек

Два паттерна, повторяющиеся во всех Electron-приложениях монорепо (`label-printer-desktop`,
`poster-microtext-desktop`) — не дублирование кода (у каждого приложения свои типы/расчёты), а
один и тот же устоявшийся способ решать одну и ту же структурную задачу.

## `shared/` — рантайм-код для main и renderer одновременно

В `label-printer-desktop` `shared/` содержит только типы (стираются при компиляции, не требуют
настройки сборки). В `poster-microtext-desktop` `shared/` — **рантайм-код**
(`visibility-model.ts`, `masking-model.ts`: расчётные модели видимости/маскировки), и он
собирается и Next.js-рендерером, и webpack-бандлом main-процесса **без дополнительной
настройки** — оба бандлера у Nextron уже резолвят пути относительно корня приложения.

Зачем нужен рантайм-код в `shared/`, а не только типы: main-процесс использует формулу для
применения эффекта к пикселям, renderer — ту же формулу для показа пользователю подсказки («с
какой дистанции надпись читается»). Если формулу продублировать, они разойдутся при первой же
правке одной из копий — ровно то, что `shared/` предотвращает по конструкции (один файл, один
источник истины для обоих процессов).

**Когда заводить `shared/` с рантайм-кодом:** как только один и тот же расчёт (не просто тип)
нужен и main, и renderer. Не нужно ничего специально прописывать в `webpack.config.js` или
`next.config.js` — просто `import { ... } from '../../shared/foo'` из обоих мест.

## Единый объект настроек вместо россыпи `useState`

Найдено независимо в двух приложениях (`label-printer-desktop` `renderer/app/settings/page.tsx`,
`poster-microtext-desktop` `renderer/app/page.tsx`) — один и тот же устоявшийся способ держать
персистентные настройки формы.

**Проблема, которую он решает.** Одна настройка на `useState` — это пять мест, где легко забыть
одно: объявление `useState`, строка `if (saved.X !== undefined) setX(saved.X)` при загрузке,
поле в объекте на сохранение, элемент зависимостей автосохранения, элемент зависимостей
обработчика, который эти настройки читает. Прецедент: `edgeSoftness` забыли в зависимостях
`handleProcess` — поле сохранялось и подгружалось, но не участвовало в пересчёте (`PLAN.md`
`poster-microtext-desktop`, 2026-07-28).

**Реализация:**

```typescript
const DEFAULT_SETTINGS: Required<MySettings> = { widthCm: 91, letterMm: 1.2 /* ... */ }

const [settings, setSettings] = useState<Required<MySettings>>(DEFAULT_SETTINGS)
const patchSettings = useCallback((patch: Partial<MySettings>) => {
  setSettings((prev) => ({ ...prev, ...patch }))
}, [])

// Загрузка — одним setSettings поверх дефолтов, а не десятком точечных if
useEffect(() => {
  void window.myAPI.loadSettings().then((saved) => {
    if (saved) { setSettings((prev) => ({ ...prev, ...saved })) }
  })
}, [])

// Автосохранение и любой обработчик, читающий настройки, — зависят от settings целиком
useEffect(() => {
  void window.myAPI.saveSettings(settings)
}, [settings])
```

Новое поле настройки добавляется в **одном месте** (`DEFAULT_SETTINGS` + тип настроек в
IPC-хендлере) — без права забыть одно из пяти. Библиотека для этого не нужна.
