import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  light(): void
  medium(): void
  heavy(): void
}

export default TurboModuleRegistry.getEnforcing<Spec>('HapticsModule')
