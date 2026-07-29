'use client'

import { midiNoteName } from '@/lib/audio/midi'
import { type DiatonicChord, QUALITY_LABEL, SCALE_IDS, type ScaleId, SCALES } from '@/lib/patch/harmony'
import { Box, Text } from '@chakra-ui/react'
import { filledToggleStyle, outlineButtonStyle } from './button-style'

interface HarmonyPanelProps {
  root: number
  onRootChange: (root: number) => void
  scaleId: ScaleId
  onScaleChange: (id: ScaleId) => void
  chords: DiatonicChord[]
  onPreviewScale: () => void
  onPlayChord: (chord: DiatonicChord) => void
}

// 12 тональных центров одной октавы — доступны по имени ноты (здесь это оправдано: выбор
// тонального центра — символический шаг, не позиция на клавиатуре «по цвету», см. PLAN.md).
const ROOT_OCTAVE_BASE = 48 // C3 — середина рабочего диапазона клавиатуры/пиано-ролла

// Помощник по гармонии (Фаза 3): выбираешь лад по ощущению, а не по имени — метафора всегда
// крупным текстом сверху, музыкальное имя — мелко и приглушённо снизу. Аккорды ступеней лада
// звучат сразу по клику и одновременно ложатся в пиано-ролл — ear-first, потом eye-first.
export function HarmonyPanel({
  root,
  onRootChange,
  scaleId,
  onScaleChange,
  chords,
  onPreviewScale,
  onPlayChord,
}: HarmonyPanelProps) {
  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mb={2}>
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Помощник по гармонии
        </Text>
        <button style={outlineButtonStyle('default', { padding: '3px 10px' })} onClick={onPreviewScale}>
          ▶ услышать лад
        </button>
      </Box>

      {/* Тональный центр */}
      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <Text fontSize="9px" color="fg.subtle" mr={1}>
          от
        </Text>
        {Array.from({ length: 12 }, (_, i) => ROOT_OCTAVE_BASE + i).map((note) => (
          <button
            key={note}
            style={filledToggleStyle(root % 12 === note % 12, { padding: '3px 6px', fontSize: '9px' })}
            onClick={() => onRootChange(note)}
          >
            {midiNoteName(note).replace(/\d+$/, '')}
          </button>
        ))}
      </Box>

      {/* Выбор лада — ощущение сначала, имя лада мелко снизу */}
      <Box display="flex" gap={1} mb={3} flexWrap="wrap">
        {SCALE_IDS.map((id) => {
          const def = SCALES[id]
          const active = id === scaleId
          return (
            <button
              key={id}
              title={def.description}
              style={{
                ...filledToggleStyle(active, { padding: '5px 8px', fontSize: '10px' }),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '1px',
                textAlign: 'left',
              }}
              onClick={() => onScaleChange(id)}
            >
              <span>{def.label}</span>
              <span style={{ fontSize: '8px', opacity: 0.6, letterSpacing: '0.03em' }}>{def.theoryName}</span>
            </button>
          )
        })}
      </Box>

      {/* Аккорды ступеней лада — клик и звучит, и ложится в пиано-ролл */}
      {chords.length > 0 ? (
        <Box display="flex" gap={1} flexWrap="wrap">
          {chords.map((chord) => (
            <button
              key={chord.degree}
              title={`Ступень ${chord.degree} — ${QUALITY_LABEL[chord.quality]}`}
              style={outlineButtonStyle('default', { padding: '4px 8px', fontSize: '9px' })}
              onClick={() => onPlayChord(chord)}
            >
              {chord.degree}. {QUALITY_LABEL[chord.quality]}
            </button>
          ))}
        </Box>
      ) : (
        <Text fontSize="9px" color="fg.subtle">
          У пентатоники нет ступенчатых аккордов — просто играй ноты лада на слух.
        </Text>
      )}
    </Box>
  )
}
