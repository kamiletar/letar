import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

/** Параметры для входа в PiP */
interface PipOptions {
  aspectRatio?: {
    numerator: number
    denominator: number
  }
}

export interface Spec extends TurboModule {
  isPipAvailable(): Promise<boolean>
  updatePlaybackState(playing: boolean): void
  enterPictureInPictureMode(options: PipOptions): Promise<boolean>
  exitPictureInPictureMode(): Promise<boolean>
  addListener(eventName: string): void
  removeListeners(count: number): void
}

export default TurboModuleRegistry.getEnforcing<Spec>('PipModule')
