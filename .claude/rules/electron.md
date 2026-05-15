---
paths: apps/label-printer-desktop/**
---

# Правила для Electron приложений

## Архитектура Nextron

```
apps/label-printer-desktop/
├── main/                    # Electron main process
│   ├── background.ts        # Entry point
│   ├── preload.ts           # IPC bridge
│   └── ipc/                 # IPC handlers
├── renderer/                # Next.js (UI)
│   ├── app/                 # Страницы
│   └── lib/                 # Утилиты
└── src/generated/           # ZenStack/Prisma
```

## Main Process

```typescript
// main/background.ts
import { app, ipcMain } from 'electron'

// Регистрация IPC handlers
import './ipc/printer.handlers'
import './ipc/settings.handlers'
```

## IPC Handlers

```typescript
// main/ipc/printer.handlers.ts
import { ipcMain } from 'electron'

ipcMain.handle('printer:print', async (event, data) => {
  // Логика печати
  return { success: true }
})

ipcMain.handle('printer:status', async () => {
  return { connected: true, name: 'TSC TE210' }
})
```

## Preload Script

```typescript
// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  printer: {
    print: (data: PrintData) => ipcRenderer.invoke('printer:print', data),
    getStatus: () => ipcRenderer.invoke('printer:status'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
  },
})
```

## Renderer (Next.js)

```typescript
// renderer/lib/electron.ts
declare global {
  interface Window {
    electronAPI: {
      printer: {
        print: (data: PrintData) => Promise<PrintResult>
        getStatus: () => Promise<PrinterStatus>
      }
    }
  }
}

// Использование
const status = await window.electronAPI.printer.getStatus()
```

## Shared библиотека

Используй `@letar/label-printer-core` для:

- GS1Parser — парсинг кодов
- ImageGeneratorService — генерация этикеток
- TSPLService — команды принтера

```typescript
import { GS1Parser, ImageGeneratorService } from '@letar/label-printer-core'
```

## Правила

- Main process — только Node.js код
- Renderer — React/Next.js код
- IPC — единственный способ связи между процессами
- Preload — минимальный bridge, без бизнес-логики
- Типизация — общие типы в `renderer/types/electron.d.ts`
