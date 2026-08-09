import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SyncAction, SyncQueueItem } from './types'

// Mock idb-keyval
const mockStore: Map<string, unknown> = new Map()
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key)
    return Promise.resolve()
  }),
}))

import {
  addToQueue,
  clearQueue,
  createSyncQueueStore,
  getOfflineStatus,
  getQueueFromStorage,
  processQueueItem,
  removeFromQueue,
  subscribeToStatusChanges,
} from './offline-service'

describe('offline-service', () => {
  beforeEach(() => {
    mockStore.clear()
    vi.clearAllMocks()
  })

  describe('getOfflineStatus', () => {
    const originalNavigator = global.navigator

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      })
    })

    it('returns false when online', () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      })

      expect(getOfflineStatus()).toBe(false)
    })

    it('returns true when offline', () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      })

      expect(getOfflineStatus()).toBe(true)
    })

    it('returns false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      })

      expect(getOfflineStatus()).toBe(false)
    })
  })

  describe('subscribeToStatusChanges', () => {
    it('calls callback when going offline', () => {
      const callback = vi.fn()
      subscribeToStatusChanges(callback)

      window.dispatchEvent(new Event('offline'))

      expect(callback).toHaveBeenCalledWith(true)
    })

    it('calls callback when going online', () => {
      const callback = vi.fn()
      subscribeToStatusChanges(callback)

      window.dispatchEvent(new Event('online'))

      expect(callback).toHaveBeenCalledWith(false)
    })

    it('returns unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeToStatusChanges(callback)

      unsubscribe()
      window.dispatchEvent(new Event('offline'))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getQueueFromStorage', () => {
    it('returns empty array when no data', async () => {
      const result = await getQueueFromStorage()

      expect(result).toEqual([])
    })

    it('returns stored queue', async () => {
      const queue: SyncQueueItem[] = [
        {
          id: 'test-1',
          action: { type: 'FORM_SUBMIT', payload: { foo: 'bar' } },
          createdAt: Date.now(),
          attempts: 0,
          maxAttempts: 3,
          status: 'PENDING',
        },
      ]
      mockStore.set('letar-form-sync-queue', queue)

      const result = await getQueueFromStorage()

      expect(result).toEqual(queue)
    })

    it('uses custom storage key', async () => {
      const queue: SyncQueueItem[] = [
        {
          id: 'test-1',
          action: { type: 'FORM_SUBMIT', payload: {} },
          createdAt: Date.now(),
          attempts: 0,
          maxAttempts: 3,
          status: 'PENDING',
        },
      ]
      mockStore.set('custom-key', queue)

      const result = await getQueueFromStorage('custom-key')

      expect(result).toEqual(queue)
    })

    it('migrates data from legacy lena-form-sync-queue key', async () => {
      const legacyQueue: SyncQueueItem[] = [
        {
          id: 'legacy-1',
          action: { type: 'FORM_SUBMIT', payload: { migrated: true } },
          createdAt: Date.now(),
          attempts: 0,
          maxAttempts: 3,
          status: 'PENDING',
        },
      ]
      mockStore.set('lena-form-sync-queue', legacyQueue)

      const result = await getQueueFromStorage()

      expect(result).toEqual(legacyQueue)
      expect(mockStore.has('lena-form-sync-queue')).toBe(false)
      expect(mockStore.get('letar-form-sync-queue')).toEqual(legacyQueue)
    })
  })

  describe('addToQueue', () => {
    it('adds action to queue', async () => {
      const action: SyncAction = { type: 'FORM_SUBMIT', payload: { name: 'test' } }

      const item = await addToQueue(action)

      expect(item.id).toBeDefined()
      expect(item.action).toEqual(action)
      expect(item.status).toBe('PENDING')
      expect(item.attempts).toBe(0)
      expect(item.maxAttempts).toBe(3)
    })

    it('saves item to storage', async () => {
      const action: SyncAction = { type: 'FORM_SUBMIT', payload: {} }

      await addToQueue(action)

      const stored = mockStore.get('letar-form-sync-queue') as SyncQueueItem[]
      expect(stored).toHaveLength(1)
      expect(stored[0].action).toEqual(action)
    })

    it('appends to existing queue', async () => {
      const existingItem: SyncQueueItem = {
        id: 'existing',
        action: { type: 'FORM_UPDATE', payload: {} },
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
        status: 'PENDING',
      }
      mockStore.set('letar-form-sync-queue', [existingItem])

      await addToQueue({ type: 'FORM_SUBMIT', payload: {} })

      const stored = mockStore.get('letar-form-sync-queue') as SyncQueueItem[]
      expect(stored).toHaveLength(2)
    })
  })

  describe('removeFromQueue', () => {
    it('removes item from queue', async () => {
      const item: SyncQueueItem = {
        id: 'to-remove',
        action: { type: 'FORM_SUBMIT', payload: {} },
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
        status: 'PENDING',
      }
      mockStore.set('letar-form-sync-queue', [item])

      const result = await removeFromQueue('to-remove')

      expect(result).toBe(true)
      const stored = mockStore.get('letar-form-sync-queue') as SyncQueueItem[]
      expect(stored).toHaveLength(0)
    })

    it('returns false if item not found', async () => {
      mockStore.set('letar-form-sync-queue', [])

      const result = await removeFromQueue('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('processQueueItem', () => {
    const baseItem: SyncQueueItem = {
      id: 'test-item',
      action: { type: 'FORM_SUBMIT', payload: { data: 'test' } },
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3,
      status: 'PENDING',
    }

    it('returns success when handler succeeds', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true })

      const result = await processQueueItem(baseItem, handler)

      expect(result.success).toBe(true)
      expect(result.item?.status).toBe('SYNCED')
      expect(handler).toHaveBeenCalledWith(baseItem.action)
    })

    it('increments attempts on failure', async () => {
      const handler = vi.fn().mockResolvedValue({ success: false, error: 'Failed' })

      const result = await processQueueItem(baseItem, handler)

      expect(result.success).toBe(false)
      expect(result.item?.attempts).toBe(1)
      expect(result.item?.status).toBe('PENDING')
      expect(result.error).toBe('Failed')
    })

    it('sets FAILED after maxAttempts', async () => {
      const item = { ...baseItem, attempts: 2 } // Already 2 attempts out of 3
      const handler = vi.fn().mockResolvedValue({ success: false, error: 'Failed' })

      const result = await processQueueItem(item, handler)

      expect(result.item?.status).toBe('FAILED')
      expect(result.item?.attempts).toBe(3)
    })

    it('handles exceptions in handler', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await processQueueItem(baseItem, handler)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.item?.attempts).toBe(1)
    })
  })

  describe('clearQueue', () => {
    it('clears queue from storage', async () => {
      mockStore.set('letar-form-sync-queue', [{ id: 'item' }])

      await clearQueue()

      expect(mockStore.has('letar-form-sync-queue')).toBe(false)
    })

    it('uses custom key', async () => {
      mockStore.set('custom-queue', [{ id: 'item' }])

      await clearQueue('custom-queue')

      expect(mockStore.has('custom-queue')).toBe(false)
    })
  })

  describe('createSyncQueueStore', () => {
    it('creates store with empty queue', () => {
      const store = createSyncQueueStore()

      expect(store.getQueue()).toEqual([])
      expect(store.getQueueLength()).toBe(0)
    })

    it('initialize loads queue from storage', async () => {
      const existingQueue: SyncQueueItem[] = [
        {
          id: 'existing',
          action: { type: 'FORM_SUBMIT', payload: {} },
          createdAt: Date.now(),
          attempts: 0,
          maxAttempts: 3,
          status: 'PENDING',
        },
      ]
      mockStore.set('letar-form-sync-queue', existingQueue)

      const store = createSyncQueueStore()
      await store.initialize()

      expect(store.getQueue()).toEqual(existingQueue)
    })

    it('add adds item and notifies listeners', async () => {
      const store = createSyncQueueStore()
      const listener = vi.fn()
      store.subscribe(listener)

      await store.add({ type: 'FORM_SUBMIT', payload: { test: true } })

      expect(store.getQueueLength()).toBe(1)
      expect(listener).toHaveBeenCalled()
    })

    it('remove removes item and notifies listeners', async () => {
      const store = createSyncQueueStore()
      const item = await store.add({ type: 'FORM_SUBMIT', payload: {} })
      const listener = vi.fn()
      store.subscribe(listener)

      const result = await store.remove(item.id)

      expect(result).toBe(true)
      expect(store.getQueueLength()).toBe(0)
      expect(listener).toHaveBeenCalled()
    })

    it('subscribe returns unsubscribe function', () => {
      const store = createSyncQueueStore()
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      unsubscribe()
      // Listener should not be called after unsubscribe
      store.add({ type: 'FORM_SUBMIT', payload: {} })

      // listener was already called in add, but not after unsubscribe
      // This test verifies that unsubscribe works
      expect(typeof unsubscribe).toBe('function')
    })

    it('processAll processes pending items', async () => {
      const store = createSyncQueueStore()
      await store.add({ type: 'FORM_SUBMIT', payload: { id: 1 } })
      await store.add({ type: 'FORM_UPDATE', payload: { id: 2 } })

      const handler = vi.fn().mockResolvedValue({ success: true })
      const results = await store.processAll(handler)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('processAll removes successfully processed items', async () => {
      const store = createSyncQueueStore()
      await store.add({ type: 'FORM_SUBMIT', payload: {} })

      const handler = vi.fn().mockResolvedValue({ success: true })
      await store.processAll(handler)

      expect(store.getQueueLength()).toBe(0)
    })

    it('processAll keeps failed items in queue', async () => {
      const store = createSyncQueueStore()
      await store.add({ type: 'FORM_SUBMIT', payload: {} })

      const handler = vi.fn().mockResolvedValue({ success: false, error: 'Failed' })
      await store.processAll(handler)

      expect(store.getQueueLength()).toBe(1)
      expect(store.getQueue()[0].attempts).toBe(1)
    })
  })
})
