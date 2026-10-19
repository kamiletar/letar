'use client'

import { makePage } from '@keystatic/next/ui/app'
import { createKeystaticConfig, type KeystaticStorageKind } from '../../../keystatic.config'

// Стабильные типы компонентов сохраняют состояние редактора при повторном рендере.
const GitHubPage = makePage(createKeystaticConfig('github'))
const LocalPage = makePage(createKeystaticConfig('local'))

export function KeystaticApp({ storageKind }: { storageKind: KeystaticStorageKind }) {
  return storageKind === 'github' ? <GitHubPage /> : <LocalPage />
}
