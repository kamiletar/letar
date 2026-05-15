import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  getVolume(): Promise<number>
  setVolume(value: number): Promise<number>
  getMaxVolume(): Promise<number>
}

export default TurboModuleRegistry.getEnforcing<Spec>('VolumeModule')
