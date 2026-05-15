import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  startService(title: string): void
  updateProgress(title: string, progress: number): void
  stopService(): void
}

export default TurboModuleRegistry.getEnforcing<Spec>('DownloadServiceModule')
