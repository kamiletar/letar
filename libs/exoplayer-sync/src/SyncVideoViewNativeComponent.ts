import type { CodegenTypes, HostComponent, ViewProps } from 'react-native'
import { codegenNativeCommands } from 'react-native'

const NativeComponentRegistry = require('react-native/Libraries/NativeComponent/NativeComponentRegistry')

type Double = CodegenTypes.Double
type Int32 = CodegenTypes.Int32
type DirectEventHandler<T> = CodegenTypes.DirectEventHandler<T>

type OnSyncVideoLoadEvent = Readonly<{
  duration: Double
  naturalWidth: Int32
  naturalHeight: Int32
}>

type OnSyncVideoProgressEvent = Readonly<{
  currentTime: Double
  playableDuration: Double
}>

type OnSyncVideoErrorEvent = Readonly<{
  code: string
  message: string
}>

type OnSyncVideoSeekEvent = Readonly<{
  currentTime: Double
  seekTime: Double
}>

type OnSyncVideoTapEvent = Readonly<{
  x: Double
  y: Double
}>

export interface NativeProps extends ViewProps {
  videoSource: string
  audioSource?: string
  paused?: boolean
  volume?: Double
  muted?: boolean
  volumeBoost?: Int32
  resizeMode?: string
  rate?: Double
  onSyncVideoLoad?: DirectEventHandler<OnSyncVideoLoadEvent>
  onSyncVideoProgress?: DirectEventHandler<OnSyncVideoProgressEvent>
  onSyncVideoError?: DirectEventHandler<OnSyncVideoErrorEvent>
  onSyncVideoEnd?: DirectEventHandler<null>
  onSyncVideoSeek?: DirectEventHandler<OnSyncVideoSeekEvent>
  onSyncVideoTap?: DirectEventHandler<OnSyncVideoTapEvent>
}

type ComponentType = HostComponent<NativeProps>

interface NativeCommands {
  seek: (viewRef: React.ElementRef<ComponentType>, position: Double) => void
  play: (viewRef: React.ElementRef<ComponentType>) => void
  pause: (viewRef: React.ElementRef<ComponentType>) => void
  setResizeMode: (viewRef: React.ElementRef<ComponentType>, mode: string) => void
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['seek', 'play', 'pause', 'setResizeMode'],
})

// Регистрация view config напрямую через NativeComponentRegistry
// (обход deprecated codegenNativeComponent для RN 0.83 bridgeless mode)
const nativeComponentName = 'SyncVideoView'

const viewConfig = {
  uiViewClassName: nativeComponentName,
  directEventTypes: {
    topSyncVideoLoad: { registrationName: 'onSyncVideoLoad' },
    topSyncVideoProgress: { registrationName: 'onSyncVideoProgress' },
    topSyncVideoError: { registrationName: 'onSyncVideoError' },
    topSyncVideoEnd: { registrationName: 'onSyncVideoEnd' },
    topSyncVideoSeek: { registrationName: 'onSyncVideoSeek' },
    topSyncVideoTap: { registrationName: 'onSyncVideoTap' },
  },
  validAttributes: {
    videoSource: true,
    audioSource: true,
    paused: true,
    volume: true,
    muted: true,
    volumeBoost: true,
    resizeMode: true,
    rate: true,
    onSyncVideoLoad: true,
    onSyncVideoProgress: true,
    onSyncVideoError: true,
    onSyncVideoEnd: true,
    onSyncVideoSeek: true,
    onSyncVideoTap: true,
  },
}

export default NativeComponentRegistry.get(nativeComponentName, () => viewConfig) as ComponentType
