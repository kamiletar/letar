import type { CodegenTypes, HostComponent, ViewProps } from 'react-native'
import { codegenNativeCommands } from 'react-native'

const NativeComponentRegistry = require('react-native/Libraries/NativeComponent/NativeComponentRegistry')

type Double = CodegenTypes.Double
type Int32 = CodegenTypes.Int32

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
