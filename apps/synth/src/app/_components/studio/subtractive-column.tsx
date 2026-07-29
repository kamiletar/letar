'use client'

import type { ArpeggiatorParams, SubtractivePatch } from '@/lib/patch/schema'
import { Box } from '@chakra-ui/react'
import { MelodicPerformancePanel } from './melodic-performance-panel'
import { ParamPanel } from './param-panel'
import { PatchLibrary } from './patch-library'
import type { usePianoRoll } from './use-piano-roll'

interface SubtractiveColumnProps {
  patch: SubtractivePatch
  onEngineChange: (engine: SubtractivePatch['engine']) => void
  onLoadSubtractive: (p: SubtractivePatch) => void
  currentArp: ArpeggiatorParams
  onArpChange: (updater: (prev: ArpeggiatorParams) => ArpeggiatorParams) => void
  onToggleArp: () => void
  pianoRoll: ReturnType<typeof usePianoRoll>
}

// Левая колонка панелей движка subtractive: параметры, библиотека патчей, арпеджиатор,
// пиано-ролл. Вынесена из studio-client.tsx (по образцу DrumkitColumn) — тот же приём:
// явные пропсы, без общего context-объекта.
export function SubtractiveColumn({
  patch,
  onEngineChange,
  onLoadSubtractive,
  currentArp,
  onArpChange,
  onToggleArp,
  pianoRoll,
}: SubtractiveColumnProps) {
  return (
    <Box display="flex" flexDir="column" gap={2}>
      <ParamPanel engine={patch.engine} onChange={onEngineChange} />
      <PatchLibrary type="subtractive" currentPatch={patch} onLoad={(p) => onLoadSubtractive(p as SubtractivePatch)} />
      <MelodicPerformancePanel
        arp={currentArp}
        onArpChange={onArpChange}
        onToggleArp={onToggleArp}
        pianoRoll={pianoRoll}
      />
    </Box>
  )
}
