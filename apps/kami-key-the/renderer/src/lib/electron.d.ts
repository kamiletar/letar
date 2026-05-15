/**
 * Типы для window.electronAPI
 */

import type { ElectronAPI } from '../../../shared/ipc-types'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
