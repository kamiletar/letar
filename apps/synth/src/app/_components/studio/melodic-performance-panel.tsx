'use client'

import type { ArpeggiatorParams } from '@/lib/patch/schema'
import { ArpPanel } from './arp-panel'
import { HarmonyPanel } from './harmony-panel'
import { PianoRollPanel } from './piano-roll-panel'
import { useHarmony } from './use-harmony'
import type { usePianoRoll } from './use-piano-roll'

interface MelodicPerformancePanelProps {
  arp: ArpeggiatorParams
  onArpChange: (updater: (prev: ArpeggiatorParams) => ArpeggiatorParams) => void
  onToggleArp: () => void
  pianoRoll: ReturnType<typeof usePianoRoll>
}

// Арпеджиатор + помощник по гармонии + пиано-ролл — общая тройка панелей для SUB и FM (see
// use-melodic-performance.ts). Вынесена, чтобы не дублировать разметку между
// subtractive-column.tsx и fm-column.tsx. Помощник по гармонии живёт своим стейтом здесь же
// (не в патче) — это инструмент момента, не часть звука; но пишет прямо в pianoRoll текущего
// движка, поэтому у SUB и FM — независимые тональные центры/лады.
export function MelodicPerformancePanel({ arp, onArpChange, onToggleArp, pianoRoll }: MelodicPerformancePanelProps) {
  const harmony = useHarmony(pianoRoll)

  return (
    <>
      <ArpPanel params={arp} onChange={onArpChange} onToggleEnabled={onToggleArp} />
      <HarmonyPanel
        root={harmony.root}
        onRootChange={harmony.setRoot}
        scaleId={harmony.scaleId}
        onScaleChange={harmony.setScaleId}
        chords={harmony.chords}
        onPreviewScale={harmony.previewScale}
        onPlayChord={harmony.playChord}
      />
      <PianoRollPanel
        notes={pianoRoll.sequence.notes}
        steps={pianoRoll.sequence.steps}
        currentStep={pianoRoll.currentStep}
        isPlaying={pianoRoll.isPlaying}
        bpm={pianoRoll.sequence.bpm}
        swing={pianoRoll.sequence.swing}
        scalePitchClasses={harmony.pitchClasses}
        onToggleCell={pianoRoll.toggleCell}
        onToggle={pianoRoll.toggle}
        onBpmChange={pianoRoll.setBpm}
        onSwingChange={pianoRoll.setSwing}
        onClear={pianoRoll.clear}
      />
    </>
  )
}
