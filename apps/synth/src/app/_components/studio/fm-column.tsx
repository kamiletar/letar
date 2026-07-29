'use client'

import type { MidiDevice } from '@/lib/audio/midi-input'
import type { ArpeggiatorParams, FmPatch } from '@/lib/patch/schema'
import { Box } from '@chakra-ui/react'
import { FmHardwareControls } from './fm-hardware-controls'
import { FmPanel } from './fm-panel'
import { MelodicPerformancePanel } from './melodic-performance-panel'
import { PatchLibrary } from './patch-library'
import type { usePianoRoll } from './use-piano-roll'

interface FmColumnProps {
  fmPatch: FmPatch
  onFmEngineChange: (engine: FmPatch['engine']) => void
  onLoadFm: (p: FmPatch) => void
  midiDevices: MidiDevice[]
  syxImportStatus: 'idle' | 'imported' | 'bulk-partial' | 'error'
  sendStatus: 'idle' | 'sent' | 'error'
  readStatus: 'idle' | 'requested' | 'received' | 'error'
  onDownloadSyx: () => void
  onImportSyxFile: (file: File) => void
  onSendToHardware: () => void
  onRequestFromHardware: () => void
  currentArp: ArpeggiatorParams
  onArpChange: (updater: (prev: ArpeggiatorParams) => ArpeggiatorParams) => void
  onToggleArp: () => void
  pianoRoll: ReturnType<typeof usePianoRoll>
}

// Левая колонка панелей движка FM: параметры операторов, библиотека патчей, обмен с железом
// по SysEx, арпеджиатор, пиано-ролл. Вынесена из studio-client.tsx (по образцу DrumkitColumn) —
// тот же приём: явные пропсы, без общего context-объекта.
export function FmColumn({
  fmPatch,
  onFmEngineChange,
  onLoadFm,
  midiDevices,
  syxImportStatus,
  sendStatus,
  readStatus,
  onDownloadSyx,
  onImportSyxFile,
  onSendToHardware,
  onRequestFromHardware,
  currentArp,
  onArpChange,
  onToggleArp,
  pianoRoll,
}: FmColumnProps) {
  return (
    <Box display="flex" flexDir="column" gap={2}>
      <FmPanel engine={fmPatch.engine} onChange={onFmEngineChange} />
      <PatchLibrary type="fm" currentPatch={fmPatch} onLoad={(p) => onLoadFm(p as FmPatch)} />
      <FmHardwareControls
        midiDevices={midiDevices}
        syxImportStatus={syxImportStatus}
        sendStatus={sendStatus}
        readStatus={readStatus}
        onDownloadSyx={onDownloadSyx}
        onImportSyxFile={onImportSyxFile}
        onSendToHardware={onSendToHardware}
        onRequestFromHardware={onRequestFromHardware}
      />
      <MelodicPerformancePanel
        arp={currentArp}
        onArpChange={onArpChange}
        onToggleArp={onToggleArp}
        pianoRoll={pianoRoll}
      />
    </Box>
  )
}
