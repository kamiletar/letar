/**
 * Zustand store для управления состоянием обновлений
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Расширенный статус обновления */
export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  updateInfo: {
    version: string
    releaseDate: string
    releaseNotes?: string
  } | null
  downloadProgress: number
  error: string | null
  downloadSpeed: number
  downloadEta: number
}

/** Элемент истории обновлений */
export interface UpdateHistoryItem {
  version: string
  installedAt: string
  releaseNotes?: string
}

/** Настройки автообновлений */
export interface UpdatePreferences {
  /** Автоматически проверять обновления */
  autoCheck: boolean
  /** Автоматически скачивать обновления */
  autoDownload: boolean
  /** Показывать уведомления */
  showNotifications: boolean
  /** Канал обновлений (stable/beta) */
  channel: 'stable' | 'beta'
}

/** Состояние Zustand store */
interface UpdateStore {
  // Состояние
  status: UpdateStatus
  changelog: string | null
  skippedVersions: string[]
  updateHistory: UpdateHistoryItem[]
  scheduledInstall: Date | null
  preferences: UpdatePreferences
  drawerOpen: boolean

  // Actions
  setStatus: (status: UpdateStatus) => void
  setChangelog: (changelog: string | null) => void
  skipVersion: (version: string) => void
  unskipVersion: (version: string) => void
  scheduleInstall: (date: Date | null) => void
  updatePreferences: (prefs: Partial<UpdatePreferences>) => void
  addToHistory: (item: UpdateHistoryItem) => void
  setDrawerOpen: (open: boolean) => void
  reset: () => void
}

/** Начальное состояние */
const initialState = {
  status: {
    status: 'idle' as const,
    updateInfo: null,
    downloadProgress: 0,
    error: null,
    downloadSpeed: 0,
    downloadEta: 0,
  },
  changelog: null,
  skippedVersions: [],
  updateHistory: [],
  scheduledInstall: null,
  preferences: {
    autoCheck: true,
    autoDownload: true,
    showNotifications: true,
    channel: 'stable' as const,
  },
  drawerOpen: false,
}

/**
 * Zustand store для управления обновлениями
 */
export const useUpdateStore = create<UpdateStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStatus: (status) => set({ status }),

      setChangelog: (changelog) => set({ changelog }),

      skipVersion: (version) =>
        set((state) => ({
          skippedVersions: [...state.skippedVersions, version],
        })),

      unskipVersion: (version) =>
        set((state) => ({
          skippedVersions: state.skippedVersions.filter((v) => v !== version),
        })),

      scheduleInstall: (date) => set({ scheduledInstall: date }),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      addToHistory: (item) =>
        set((state) => ({
          updateHistory: [item, ...state.updateHistory].slice(0, 10), // Храним только последние 10
        })),

      setDrawerOpen: (open) => set({ drawerOpen: open }),

      reset: () => set(initialState),
    }),
    {
      name: 'animatrona-update-store',
      // v2: одноразовая миграция — включаем autoCheck/autoDownload для старых установок
      version: 2,
      migrate: (persisted: unknown): unknown => {
        const state = persisted as { preferences?: Partial<UpdatePreferences> } | null
        return {
          ...(state ?? {}),
          preferences: {
            ...initialState.preferences,
            ...(state?.preferences ?? {}),
            autoCheck: true,
            autoDownload: true,
          },
        }
      },
      // Сохраняем только preferences, skippedVersions, updateHistory и scheduledInstall
      partialize: (state) => ({
        skippedVersions: state.skippedVersions,
        updateHistory: state.updateHistory,
        scheduledInstall: state.scheduledInstall,
        preferences: state.preferences,
      }),
    },
  ),
)

// Экспортируем store в глобальный объект для E2E тестов
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E тесты обращаются к store через window
  ;(window as any).useUpdateStore = useUpdateStore
}
