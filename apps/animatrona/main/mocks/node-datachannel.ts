/**
 * Mock модуль для node-datachannel
 *
 * @libp2p/webrtc требует этот модуль, но мы не используем WebRTC.
 * Экспортируем пустые заглушки.
 */

export class RTCPeerConnection {
  close(): void {
    // Mock — ничего не делает
  }
  createDataChannel() {
    return {}
  }
  createOffer() {
    return Promise.resolve({})
  }
  createAnswer() {
    return Promise.resolve({})
  }
  setLocalDescription() {
    return Promise.resolve()
  }
  setRemoteDescription() {
    return Promise.resolve()
  }
  addIceCandidate() {
    return Promise.resolve()
  }
}

export class RTCSessionDescription {}
export class RTCIceCandidate {}

/** Заглушки для webrtc-polyfill */
export class Audio {}
export class Video {}
export class MediaStream {}
export class MediaStreamTrack {}
export class PeerConnection {}
export class RtcpReceivingSession {}

export function initLogger(): void {
  // Mock — ничего не делает
}
export function cleanup(): void {
  // Mock — ничего не делает
}

export default {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  initLogger,
  cleanup,
}
