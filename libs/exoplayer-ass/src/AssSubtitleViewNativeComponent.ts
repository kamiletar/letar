import type { HostComponent, ViewProps } from 'react-native'
import type { Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'

// @ts-expect-error — внутренний API react-native для регистрации нативных компонентов

const NativeComponentRegistry = require('react-native/Libraries/NativeComponent/NativeComponentRegistry')

export interface NativeProps extends ViewProps {
  assContent: string
  currentTimeMs: Double
  videoWidth?: Int32
  videoHeight?: Int32
  fontDir?: string
}

type ComponentType = HostComponent<NativeProps>

interface NativeCommands {
  loadContent: (viewRef: React.ElementRef<ComponentType>, content: string) => void
  setFrameSize: (viewRef: React.ElementRef<ComponentType>, width: Int32, height: Int32) => void
  release: (viewRef: React.ElementRef<ComponentType>) => void
  setFontScale: (viewRef: React.ElementRef<ComponentType>, scale: Double) => void
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['loadContent', 'setFrameSize', 'release', 'setFontScale'],
})

// Регистрация view config напрямую через NativeComponentRegistry
const nativeComponentName = 'AssSubtitleView'

const viewConfig = {
  uiViewClassName: nativeComponentName,
  validAttributes: {
    assContent: true,
    currentTimeMs: true,
    videoWidth: true,
    videoHeight: true,
    fontDir: true,
  },
}

export default NativeComponentRegistry.get(nativeComponentName, () => viewConfig) as ComponentType
