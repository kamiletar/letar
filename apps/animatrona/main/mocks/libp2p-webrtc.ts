/**
 * Mock модуль для @libp2p/webrtc
 *
 * libp2p требует этот модуль, но мы не используем WebRTC транспорт.
 * Этот mock возвращает пустую функцию, которая ничего не делает.
 */

export function webRTC() {
  // Возвращаем "транспорт" который ничего не делает
  return () => ({
    [Symbol.toStringTag]: '@libp2p/webrtc',
  })
}

export function webRTCDirect() {
  return () => ({
    [Symbol.toStringTag]: '@libp2p/webrtc-direct',
  })
}

export default { webRTC, webRTCDirect }
