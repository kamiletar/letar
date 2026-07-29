'use client'

import type { MidiDevice } from '@/lib/audio/midi-input'
import { Box, Text } from '@chakra-ui/react'
import { useRef } from 'react'

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '10px',
  borderRadius: '4px',
  border: '1px solid #5a3a10',
  background: 'transparent',
  color: '#D4AF37',
  cursor: 'pointer',
  letterSpacing: '0.04em',
}

interface FmHardwareControlsProps {
  midiDevices: MidiDevice[]
  syxImportStatus: 'idle' | 'imported' | 'bulk-partial' | 'error'
  sendStatus: 'idle' | 'sent' | 'error'
  readStatus: 'idle' | 'requested' | 'received' | 'error'
  onDownloadSyx: () => void
  onImportSyxFile: (file: File) => void
  onSendToHardware: () => void
  onRequestFromHardware: () => void
}

/** Импорт/экспорт .syx-файла патча и обмен с реальным DX7-совместимым железом по SysEx */
export function FmHardwareControls({
  midiDevices,
  syxImportStatus,
  sendStatus,
  readStatus,
  onDownloadSyx,
  onImportSyxFile,
  onSendToHardware,
  onRequestFromHardware,
}: FmHardwareControlsProps) {
  const syxFileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <Box display="flex" alignItems="center" gap={2}>
        <button
          style={btnStyle}
          onClick={onDownloadSyx}
          title="Скачивает патч как стандартный DX7 .syx-файл — открывается на любом DX7-совместимом железе/плагине"
        >
          ↓ .syx
        </button>
        <input
          ref={syxFileInputRef}
          type="file"
          accept=".syx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onImportSyxFile(file)
            }
            e.target.value = ''
          }}
        />
        <button
          style={btnStyle}
          onClick={() => syxFileInputRef.current?.click()}
          title="Загружает .syx-файл (single-voice или 32-голосый bulk-банк — тогда импортируется первый голос)"
        >
          ↑ .syx
        </button>
        {syxImportStatus === 'imported' && (
          <Text fontSize="9px" color="green.400">
            ✓ патч загружен
          </Text>
        )}
        {syxImportStatus === 'bulk-partial' && (
          <Text fontSize="9px" color="fg.subtle">
            ✓ загружен 1-й голос из bulk-банка
          </Text>
        )}
        {syxImportStatus === 'error' && (
          <Text fontSize="9px" color="red.400">
            ✗ не удалось разобрать файл
          </Text>
        )}
      </Box>
      {midiDevices.length > 0 && (
        <Box display="flex" alignItems="center" gap={2}>
          <button style={btnStyle} onClick={onSendToHardware}>
            Отправить в железо
          </button>
          {sendStatus === 'sent' && (
            <Text fontSize="9px" color="green.400">
              ✓ отправлено на {midiDevices[0].name}
            </Text>
          )}
          {sendStatus === 'error' && (
            <Text fontSize="9px" color="red.400">
              ✗ не удалось отправить
            </Text>
          )}
          <button
            style={btnStyle}
            onClick={onRequestFromHardware}
            title="SMK-37 PRO не отвечает на этот запрос (прошивка не поддерживает dump request) — оставлено для другого DX7-совместимого железа"
          >
            Прочитать из железа
          </button>
          {readStatus === 'requested' && (
            <Text fontSize="9px" color="fg.subtle">
              … ждём ответ
            </Text>
          )}
          {readStatus === 'received' && (
            <Text fontSize="9px" color="green.400">
              ✓ патч прочитан
            </Text>
          )}
          {readStatus === 'error' && (
            <Text fontSize="9px" color="red.400">
              ✗ не удалось прочитать
            </Text>
          )}
        </Box>
      )}
    </>
  )
}
