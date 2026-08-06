'use client'

import { MAX_TELEPROMPTER_SPEED, MIN_TELEPROMPTER_SPEED } from '@/lib/patch/teleprompter-storage'
import { Box, Text, Textarea } from '@chakra-ui/react'
import { useFullscreenOverlay } from '../use-fullscreen-overlay'
import { filledToggleStyle } from './button-style'
import { Knob } from './knob'
import type { Teleprompter } from './use-teleprompter'

interface TeleprompterOverlayProps {
  open: boolean
  teleprompter: Teleprompter
  onClose: () => void
}

const buttonStyle = {
  padding: '4px 10px',
  fontSize: '11px',
  borderRadius: '4px',
  border: '1px solid #5a3a10',
  background: 'rgba(14, 10, 0, 0.6)',
  color: '#D4AF37',
  cursor: 'pointer',
  letterSpacing: '0.06em',
} as const

/**
 * Полноэкранный суфлёр (Фаза 5) — репетиция стихов перед голосом в микрофон. Пауза = режим
 * правки (textarea с текстом), запуск = крупный автопрокручивающийся текст. Цель — приручить
 * сценическую тревогу через репетицию в условиях, близких к реальным (второй экран/проектор,
 * тот же Fullscreen API, что у VJ-режима).
 */
export function TeleprompterOverlay({ open, teleprompter, onClose }: TeleprompterOverlayProps) {
  const { containerRef, handleFullscreen } = useFullscreenOverlay(open, onClose)
  const { lyrics, setLyrics, speed, setSpeed, running, toggleRunning, reset, scrollRef } = teleprompter

  if (!open) {
    return null
  }

  return (
    <Box ref={containerRef} position="fixed" inset={0} zIndex={100} bg="void.950" display="flex" flexDir="column">
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={3}
        borderBottom="1px solid"
        borderColor="border.subtle"
        flexShrink={0}
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Box asChild>
            <button onClick={toggleRunning} style={filledToggleStyle(running, { padding: '4px 10px' })}>
              {running ? '⏸ пауза' : '▶ поехали'}
            </button>
          </Box>
          <Box asChild>
            <button onClick={reset} style={buttonStyle} title="Вернуться к началу текста">
              ⤒ в начало
            </button>
          </Box>
          <Knob
            value={(speed - MIN_TELEPROMPTER_SPEED) / (MAX_TELEPROMPTER_SPEED - MIN_TELEPROMPTER_SPEED)}
            onChange={(v) =>
              setSpeed(Math.round(MIN_TELEPROMPTER_SPEED + v * (MAX_TELEPROMPTER_SPEED - MIN_TELEPROMPTER_SPEED)))}
            label="скорость"
            hint="Скорость автопрокрутки текста — темп твоего чтения на сцене."
            displayValue={`${speed}px/с`}
            size={40}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Box asChild>
            <button onClick={handleFullscreen} style={buttonStyle}>
              ⛶ во весь экран
            </button>
          </Box>
          <Box asChild>
            <button onClick={onClose} style={buttonStyle}>
              ✕ выход (Esc)
            </button>
          </Box>
        </Box>
      </Box>

      {running
        ? (
          <Box ref={scrollRef} flex={1} overflowY="hidden" px={8} py={12}>
            <Text
              fontSize="40px"
              lineHeight={1.6}
              color="fg.gold"
              textAlign="center"
              whiteSpace="pre-wrap"
              maxW="900px"
              mx="auto"
            >
              {lyrics || '(пусто — поставь на паузу и впиши текст)'}
            </Text>
            {/* Хвост пустого пространства — чтобы последняя строка тоже успела прокрутиться до центра */}
            <Box h="60vh" />
          </Box>
        )
        : (
          <Box flex={1} p={8} display="flex" flexDir="column">
            <Text fontSize="10px" color="fg.subtle" mb={2} letterSpacing="0.06em">
              Пауза — режим правки. Впиши или вставь текст, потом «▶ поехали».
            </Text>
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Текст стихов…"
              flex={1}
              fontSize="18px"
              lineHeight={1.6}
              color="fg.gold"
              bg="bg.surface"
              border="1px solid"
              borderColor="border.DEFAULT"
              resize="none"
            />
          </Box>
        )}
    </Box>
  )
}
