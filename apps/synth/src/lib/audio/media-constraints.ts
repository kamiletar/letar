// echoCancellation/noiseSuppression/autoGainControl рассчитаны на голосовую связь
// (телефонные звонки) и портят музыкальный сигнал (компрессия, срез частот) —
// для записи/захвата инструмента или голоса в студии их всегда отключаем.
export function buildMusicalAudioConstraints(deviceId: string): MediaTrackConstraints {
  return {
    deviceId: { exact: deviceId },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  }
}
