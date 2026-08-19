/**
 * Type augmentation для React Native TV
 *
 * Android TV передаёт в PressableStateCallbackType дополнительное поле `focused`,
 * не описанное в стандартных типах RN. До RN 0.87 `PressableStateCallbackType` был
 * `interface` — расширялся через declaration merging. С 0.87 это `type`, merging
 * больше не работает, поэтому используем локальный union-тип с явной аннотацией
 * в каждом месте использования: `({ focused }: TVPressableState) => ...`.
 */
import type { PressableStateCallbackType } from 'react-native'

export type TVPressableState = PressableStateCallbackType & { focused?: boolean }
