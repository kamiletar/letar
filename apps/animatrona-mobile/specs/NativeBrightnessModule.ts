import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  getBrightness(): Promise<number>
  setBrightness(value: number): Promise<number>
  restoreSystemBrightness(): Promise<boolean>
  setKeepScreenOn(enabled: boolean): Promise<boolean>
}

export default TurboModuleRegistry.getEnforcing<Spec>('BrightnessModule')
