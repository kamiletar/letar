'use client'

import type { DrumkitPatch, DrumPad } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { filledToggleStyle, outlineButtonStyle } from './button-style'
import { DrumPanel } from './drum-panel'
import { PatchLibrary } from './patch-library'
import { SequencerPanel } from './sequencer-panel'
import type { useDrumSequencer } from './use-drum-sequencer'
import type { usePadMidiLearn } from './use-pad-midi-learn'

interface DrumkitColumnProps {
  drumPatch: DrumkitPatch
  selectedPad: number
  onPadChange: (pad: DrumPad) => void
  onLoadDrumkit: (p: DrumkitPatch) => void
  padMidiLearn: ReturnType<typeof usePadMidiLearn>
  sequencer: ReturnType<typeof useDrumSequencer>
  onUploadSample: (file: File) => void
  onRemoveSample: (sampleId: string) => void
}

// Левая колонка панелей движка drumkit: MIDI Learn пэдов, редактор выбранного пэда,
// библиотека патчей, степ-секвенсор. Вынесена из studio-client.tsx (Фаза 3) — тот же
// приём, что use-studio-mentor.ts для ментора: явные пропсы, без общего context-объекта.
export function DrumkitColumn({
  drumPatch,
  selectedPad,
  onPadChange,
  onLoadDrumkit,
  padMidiLearn,
  sequencer,
  onUploadSample,
  onRemoveSample,
}: DrumkitColumnProps) {
  return (
    <Box display="flex" flexDir="column" gap={2}>
      <Box display="flex" alignItems="center" gap={2}>
        <button
          style={filledToggleStyle(padMidiLearn.active, { padding: '3px 8px', letterSpacing: '0.04em' })}
          onClick={padMidiLearn.toggleActive}
        >
          {padMidiLearn.active ? '● обучение пэдов включено' : 'MIDI Learn: пэды'}
        </button>
        {padMidiLearn.active && (
          <button
            style={outlineButtonStyle('default', { padding: '3px 8px', letterSpacing: '0.04em' })}
            onClick={padMidiLearn.reset}
          >
            сбросить к дефолту
          </button>
        )}
        {padMidiLearn.active && (
          <Text fontSize="9px" color="fg.subtle" letterSpacing="0.04em">
            {padMidiLearn.armedPad !== null
              ? `жду удар по железу для пэда ${padMidiLearn.armedPad + 1}…`
              : 'кликни по экранному пэду, потом ударь по нужному пэду на железе'}
          </Text>
        )}
      </Box>
      <DrumPanel
        pad={drumPatch.engine.pads[selectedPad]}
        onChange={onPadChange}
        onUploadSample={onUploadSample}
        onRemoveSample={onRemoveSample}
      />
      <PatchLibrary type="drumkit" currentPatch={drumPatch} onLoad={(p) => onLoadDrumkit(p as DrumkitPatch)} />
      <SequencerPanel
        pads={drumPatch.engine.pads}
        pattern={sequencer.pattern}
        currentStep={sequencer.currentStep}
        isPlaying={sequencer.isPlaying}
        bpm={sequencer.bpm}
        swing={sequencer.swing}
        onToggleStep={sequencer.toggleStep}
        onToggle={sequencer.toggle}
        onBpmChange={sequencer.setBpm}
        onSwingChange={sequencer.setSwing}
        onClear={sequencer.clear}
      />
    </Box>
  )
}
