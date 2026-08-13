# Zustand v5 — Документация

> Версия: ^5.0.13 | GitHub: https://github.com/pmndrs/zustand\
> Маленькая, быстрая, масштабируемая библиотека глобального состояния

## Базовое использование

```tsx
import { create } from 'zustand'

interface BearState {
  bears: number
  increase: () => void
  reset: () => void
}

const useBearStore = create<BearState>((set, get) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  reset: () => set({ bears: 0 }),
}))

// В компонентах
function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  const increase = useBearStore((state) => state.increase)
  return <button onClick={increase}>{bears} медведей</button>
}
```

## Селекторы (избегаем лишних ре-рендеров)

```tsx
// ✅ Атомарный выбор — ре-рендер только при изменении bears
const bears = useBearStore((state) => state.bears)
const increase = useBearStore((state) => state.increase)

// ✅ Несколько значений — useShallow предотвращает лишние ре-рендеры
import { useShallow } from 'zustand/react/shallow'

const { bears, honey } = useBearStore(useShallow((state) => ({ bears: state.bears, honey: state.honey })))

// ✅ Массив ключей
const [bears, honey] = useBearStore(useShallow((state) => [state.bears, state.honey]))
```

## Обновление состояния

```tsx
const useStore = create<State>((set, get) => ({
  count: 0,
  items: [],
  user: null,

  // Мёрж (частичное обновление)
  increment: () => set((state) => ({ count: state.count + 1 })),

  // Полная замена (второй аргумент = true)
  reset: () => set({ count: 0, items: [], user: null }, true),

  // Доступ к текущему состоянию через get()
  addItem: (item) => set({ items: [...get().items, item] }),

  // Асинхронные действия
  fetchUser: async (id) => {
    const user = await fetchUser(id)
    set({ user })
  },
}))
```

## Middlewares

### persist — сохранение в localStorage/sessionStorage

```tsx
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      language: 'ru',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'letar-settings', // ключ в storage
      storage: createJSONStorage(() => localStorage), // по умолчанию
      partialize: (state) => ({ theme: state.theme }), // сохранять только часть
    },
  ),
)
```

### immer — мутабельные обновления

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const useStore = create(
  immer((set) => ({
    items: [] as Item[],
    addItem: (item: Item) =>
      set((state) => {
        state.items.push(item) // мутация — immer делает копию
      }),
    updateItem: (id: string, data: Partial<Item>) =>
      set((state) => {
        const item = state.items.find((i) => i.id === id)
        if (item) { Object.assign(item, data) }
      }),
  })),
)
```

### devtools — Redux DevTools

```tsx
import { devtools } from 'zustand/middleware'

const useStore = create(devtools((set) => ({ count: 0, increment: () => set({ count: 1 }) }), { name: 'MyStore' }))
```

### Комбинирование middlewares

```tsx
import { create } from 'zustand'
import { devtools, immer, persist } from 'zustand/middleware'

const useStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        // ...
      })),
      { name: 'store' },
    ),
  ),
)
```

## Slice-паттерн (разделение стора)

```tsx
// slices/bear-slice.ts
export interface BearSlice {
  bears: number
  addBear: () => void
}

export const createBearSlice = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
})

// slices/fish-slice.ts
export interface FishSlice {
  fishes: number
  addFish: () => void
}

export const createFishSlice = (set) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
})

// store.ts — объединение
import { create } from 'zustand'
import { BearSlice, createBearSlice } from './slices/bear-slice'
import { createFishSlice, FishSlice } from './slices/fish-slice'

type StoreState = BearSlice & FishSlice

export const useStore = create<StoreState>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}))
```

## Использование вне React компонентов

```tsx
// Доступ к store вне React (Server Actions, утилиты)
const { bears, increase } = useBearStore.getState()
useBearStore.setState({ bears: 10 })

// Подписка
const unsub = useBearStore.subscribe(
  (state) => state.bears, // selector
  (bears, prevBears) => {
    // listener
    console.log('Bears changed:', bears)
  },
)
unsub() // отписаться
```

## Vanilla store (без React)

```tsx
import { createStore, useStore } from 'zustand/vanilla'

const store = createStore<State>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))

// В React через useStore hook
const useBoundStore = (selector) => useStore(store, selector)
```

## TypeScript

```tsx
// Рекомендуемый паттерн — явный тип через generic
interface State {
  count: number
  text: string
  increment: () => void
  setText: (text: string) => void
}

const useStore = create<State>()((set) => ({
  count: 0,
  text: '',
  increment: () => set((s) => ({ count: s.count + 1 })),
  setText: (text) => set({ text }),
}))

// Тип из store
type StoreState = ReturnType<typeof useStore.getState>
```

## Типичные паттерны в letar

```tsx
// Глобальный UI стор (тема, sidebar, модалки)
interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  activeModal: string | null
  openModal: (id: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>()(
  devtools((set) => ({
    sidebarOpen: false,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    activeModal: null,
    openModal: (id) => set({ activeModal: id }),
    closeModal: () => set({ activeModal: null }),
  })),
)

// Использование
const { sidebarOpen, toggleSidebar } = useUIStore(
  useShallow((s) => ({ sidebarOpen: s.sidebarOpen, toggleSidebar: s.toggleSidebar })),
)
```

## v5 vs v4 — Breaking Changes

| v4                                | v5                                      |
| --------------------------------- | --------------------------------------- |
| `create` возвращает hook напрямую | Те же API, но лучший TypeScript         |
| `setState` с полным state         | `set` с мёржем по умолчанию             |
| `useShallow` в отдельном пакете   | `useShallow` из `zustand/react/shallow` |
| `immer` из отдельного пакета      | `immer` из `zustand/middleware/immer`   |

## Ссылки

- GitHub: https://github.com/pmndrs/zustand
- Docs: https://zustand.docs.pmnd.rs
