// Singleton AudioContext + resume-хелпер.
// AudioContext нельзя создать до жеста пользователя — resume() вызываем при первом клике.

let _ctx: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 44100 })
  }
  return _ctx
}

export async function resumeContext(): Promise<AudioContext> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  return ctx
}
