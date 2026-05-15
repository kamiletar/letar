import { vi } from 'vitest'

// Мок для offline модуля
export const getOfflineStatus = vi.fn(() => false)
export const subscribeToStatusChanges = vi.fn()

export const createScheduleStore = vi.fn(() => ({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  subscribe: vi.fn(() => () => {}),
  getState: vi.fn(() => ({ slots: [], lessons: [], lastSync: 0 })),
  initialize: vi.fn(() => Promise.resolve()),
  syncSchedule: vi.fn(() => Promise.resolve()),
}))

export const createSyncQueueStore = vi.fn(() => ({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  subscribe: vi.fn(() => () => {}),
  getQueue: vi.fn(() => []),
  initialize: vi.fn(() => Promise.resolve()),
  add: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  remove: vi.fn(() => Promise.resolve(true)),
  processAll: vi.fn(() => Promise.resolve([])),
}))
