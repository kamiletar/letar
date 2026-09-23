// Тест правил .semgrep/letar-rules.yml. Запуск (явные пути обязательны — из скрытой папки автопоиск пуст):
//   PYTHONUTF8=1 uvx semgrep --test --config .semgrep/letar-rules.yml .semgrep/letar-rules.ts
import * as React from 'react'
import { useSyncExternalStore } from 'react'

declare const subscribe: (cb: () => void) => () => void
declare const getSnapshot: () => string[]
declare const EMPTY: string[]

export function Cases() {
  // ruleid: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, getSnapshot, () => [])
  // ruleid: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, getSnapshot, () => ({ items: [] }))
  // ruleid: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, getSnapshot, () => new Map())
  // ruleid: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, () => [], () => EMPTY)
  // ruleid: letar-use-sync-external-store-uncached-snapshot
  React.useSyncExternalStore(subscribe, getSnapshot, () => [])

  // ok: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  // ok: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, () => 0, () => 0)
  // ok: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, () => false, () => false)
  // ok: letar-use-sync-external-store-uncached-snapshot
  useSyncExternalStore(subscribe, () => 'pending', () => null)
}
