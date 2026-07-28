// Захват мастер-шины в MediaRecorder — живая запись без рендера (см. PLAN.md Фаза 1 «Запись»).
// Детерминированный рендер через OfflineAudioContext — отдельная задача (для экспорта конкретного патча).

export class MasterRecorder {
  private recorder: MediaRecorder | null = null
  private chunks: BlobPart[] = []
  private destination: MediaStreamAudioDestinationNode

  constructor(ctx: AudioContext, source: AudioNode) {
    this.destination = ctx.createMediaStreamDestination()
    source.connect(this.destination)
  }

  isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }

  start(): void {
    this.chunks = []
    const recorder = new MediaRecorder(this.destination.stream, { mimeType: 'audio/webm' })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }
    recorder.start()
    this.recorder = recorder
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = this.recorder
      if (!recorder) {
        resolve(new Blob())
        return
      }
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: 'audio/webm' }))
      recorder.stop()
    })
  }

  dispose(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop()
    }
  }
}
