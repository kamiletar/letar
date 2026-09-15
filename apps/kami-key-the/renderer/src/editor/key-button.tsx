/**
 * Одна клавиша визуальной клавиатуры
 *
 * EN — верх-лево, RU — низ-лево, символ AltGr — крупно по центру, AltGr+Shift — верх-право.
 * Поддержка flash-анимации и drag-and-drop (drop target). Размер клавиши (`unit`/`gap`) приходит
 * снаружи — клавиатура целиком масштабируется под ширину контейнера (см. keyboard-view.tsx).
 */

import { chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { KeyMapping } from '../../../src/types'
import type { KeyDef } from './keyboard-data'
import { displayChar, MODIFIER_VKS } from './keyboard-data'

interface KeyButtonProps {
  keyDef: KeyDef
  mapping?: KeyMapping
  isSelected: boolean
  isFlashing: boolean
  unit: number
  gap: number
  onClick: () => void
  onDrop?: (char: string, name: string, slot: 'char' | 'shiftChar') => void
}

/** Строит aria-label вида «E / У: AltGr — € евро; AltGr+Shift — не назначено» */
function buildAriaLabel(keyDef: KeyDef, mapping: KeyMapping | undefined): string {
  const label = keyDef.label || 'пробел'
  const ru = keyDef.ru ? ` / ${keyDef.ru}` : ''
  const altGr = mapping ? `${displayChar(mapping.char)} ${mapping.label}` : 'не назначено'
  const altGrShift = mapping?.shiftChar
    ? `${displayChar(mapping.shiftChar)} ${mapping.shiftLabel ?? ''}`
    : 'не назначено'
  return `${label}${ru}: AltGr — ${altGr}; AltGr+Shift — ${altGrShift}`
}

export function KeyButton({ keyDef, mapping, isSelected, isFlashing, unit, gap, onClick, onDrop }: KeyButtonProps) {
  const w = keyDef.w ?? 1
  const width = w * unit - gap
  const height = unit - gap
  const hasMapped = !!mapping
  const isModifier = MODIFIER_VKS.has(keyDef.vk)

  // Flash-анимация: кратковременная подсветка при назначении
  const [flashActive, setFlashActive] = useState(false)
  useEffect(() => {
    if (isFlashing) {
      // Синхронизация с таймером (внешняя система) — сброс подсветки через 400мс
      // oxlint-disable-next-line react/set-state-in-effect
      setFlashActive(true)
      const timer = setTimeout(() => setFlashActive(false), 400)
      return () => clearTimeout(timer)
    }
  }, [isFlashing])

  // Drag-over состояние
  const [dragOver, setDragOver] = useState(false)

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
    <chakra.button
      type="button"
      aria-label={buildAriaLabel(keyDef, mapping)}
      aria-pressed={isSelected}
      w={`${width}px`}
      h={`${height}px`}
      rounded="l2"
      bg={dragOver ? 'accent.subtle' : flashActive ? 'brand.emphasized' : hasMapped ? 'brand.subtle' : 'bg.muted'}
      borderWidth="1px"
      borderColor={isSelected ? 'brand.border' : dragOver ? 'accent.border' : flashActive ? 'brand.border' : 'border'}
      position="relative"
      flexShrink={0}
      overflow="hidden"
      transition="background 0.3s, border-color 0.3s"
      _hover={{ borderColor: 'brand.border' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '2px' }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isModifier && !hasMapped
        ? (
          // Спец. клавиша — label по центру
          <chakra.span
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            color="fg.subtle"
            fontSize={`${Math.max(9, unit * 0.17)}px`}
            userSelect="none"
          >
            {keyDef.label}
          </chakra.span>
        )
        : (
          <>
            {/* EN — верх-лево */}
            <chakra.span
              position="absolute"
              top="2px"
              left="4px"
              color="fg.subtle"
              fontSize={`${Math.max(10, unit * 0.19)}px`}
              userSelect="none"
            >
              {keyDef.label}
            </chakra.span>
            {/* RU — низ-лево */}
            {keyDef.ru && (
              <chakra.span
                position="absolute"
                bottom="2px"
                left="4px"
                color="fg.subtle"
                fontSize={`${Math.max(9, unit * 0.16)}px`}
                userSelect="none"
              >
                {keyDef.ru}
              </chakra.span>
            )}
            {/* AltGr — крупно, чуть ниже центра (место над ним освобождено под увеличенный Shift-символ) */}
            {mapping && (
              <chakra.span
                position="absolute"
                top="60%"
                left="50%"
                transform="translate(-50%, -50%)"
                color="brand.fg"
                fontSize={`${Math.max(16, unit * 0.4)}px`}
                fontWeight="700"
                userSelect="none"
              >
                {displayChar(mapping.char)}
              </chakra.span>
            )}
            {/* AltGr+Shift — верх-право, крупнее прежнего */}
            {mapping?.shiftChar && (
              <chakra.span
                position="absolute"
                top="2px"
                right="4px"
                color="accent.fg"
                fontSize={`${Math.max(13, unit * 0.28)}px`}
                fontWeight="600"
                userSelect="none"
              >
                {displayChar(mapping.shiftChar)}
              </chakra.span>
            )}
          </>
        )}
    </chakra.button>
  )
}
