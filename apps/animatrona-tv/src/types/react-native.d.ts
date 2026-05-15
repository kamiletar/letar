/**
 * Type augmentation для React Native TV
 *
 * Android TV расширяет PressableStateCallbackType свойством `focused`,
 * которое не включено в стандартные типы RN.
 */

import 'react-native'

declare module 'react-native' {
  interface PressableStateCallbackType {
    focused: boolean
  }
}
