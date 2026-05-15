/**
 * Одна клавиша визуальной клавиатуры
 *
 * 4 угла: EN (верх-лево), AltGr+Shift (верх-право),
 * AltGr (низ-лево), RU (низ-право)
 *
 * Поддержка flash-анимации и drag-and-drop (drop target)
 */

import { Box } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { KeyMapping } from '../../../src/types'
import type { KeyDef } from './keyboard-data'
import { displayChar, MODIFIER_VKS } from './keyboard-data'

const KEY_SIZE = 56
const KEY_GAP = 4
const UNIT = KEY_SIZE + KEY_GAP

interface KeyButtonProps {
  keyDef: KeyDef
  mapping?: KeyMapping
  isSelected: boolean
  isFlashing: boolean
  onClick: () => void
  onDrop?: (char: string, name: string, slot: 'char' | 'shiftChar') => void
}

export function KeyButton({ keyDef, mapping, isSelected, isFlashing, onClick, onDrop }: KeyButtonProps) {
  const w = keyDef.w ?? 1
  const width = w * UNIT - KEY_GAP
  const hasMapped = !!mapping
  const isModifier = MODIFIER_VKS.has(keyDef.vk)

  // Flash-анимация: кратковременная подсветка при назначении
  const [flashActive, setFlashActive] = useState(false)
  useEffect(() => {
    if (isFlashing) {
      setFlashActive(true)
      const timer = setTimeout(() => setFlashActive(false), 400)
      return () => clearTimeout(timer)
    }
  }, [isFlashing])

  // Drag-over состояние
  const [dragOver, setDragOver] = useState(false)

  const bgColor = dragOver
    ? '#2a4a5a' // синий при drag-over
    : flashActive
      ? '#2a5a3a' // зелёный flash
      : hasMapped
        ? '#1e2a4a'
        : '#2a2a4a'

  const borderStyle = isSelected
    ? '2px solid #6c7ae0'
    : dragOver
      ? '2px solid #4ac'
      : flashActive
        ? '2px solid #4a8a4a'
        : '1px solid #3a3a5a'

  const shadowStyle = isSelected
    ? '0 0 8px rgba(108,122,224,0.4)'
    : dragOver
      ? '0 0 12px rgba(68,170,204,0.5)'
      : flashActive
        ? '0 0 12px rgba(74,138,74,0.6)'
        : undefined

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/json')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as { char: string; name: string }
      if (data.char && data.name && onDrop) {
        // Shift при дропе → shiftChar, иначе char
        onDrop(data.char, data.name, e.shiftKey ? 'shiftChar' : 'char')
      }
    } catch {
      // Невалидные данные
    }
  }

  return (
    <Box
      w={`${width}px`}
      h={`${KEY_SIZE}px`}
      borderRadius="6px"
      bg={bgColor}
      border={borderStyle}
      boxShadow={shadowStyle}
      position="relative"
      cursor="pointer"
      flexShrink={0}
      overflow="hidden"
      transition="background 0.3s, border-color 0.3s, box-shadow 0.3s"
      _hover={{ borderColor: '#6c7ae0' }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isModifier && !hasMapped ? (
        // Спец. клавиша — label по центру
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          color="#888"
          fontSize="12px"
          userSelect="none"
        >
          {keyDef.label}
        </Box>
      ) : (
        <>
          {/* EN — верх-лево */}
          <Box position="absolute" top="3px" left="5px" color="#888" fontSize="11px" userSelect="none">
            {keyDef.label}
          </Box>
          {/* RU — низ-право */}
          {keyDef.ru && (
            <Box position="absolute" bottom="3px" right="5px" color="#666" fontSize="11px" userSelect="none">
              {keyDef.ru}
            </Box>
          )}
          {/* AltGr — низ-лево (синий, крупный) */}
          {mapping && (
            <Box
              position="absolute"
              bottom="3px"
              left="5px"
              color="#6c7ae0"
              fontSize="14px"
              fontWeight="700"
              userSelect="none"
            >
              {displayChar(mapping.char)}
            </Box>
          )}
          {/* AltGr+Shift — верх-право */}
          {mapping?.shiftChar && (
            <Box position="absolute" top="3px" right="5px" color="#4a6ae0" fontSize="11px" userSelect="none">
              {mapping.shiftChar}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
