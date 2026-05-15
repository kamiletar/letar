/**
 * DoubleTapRipple — визуальный ripple эффект при double-tap (как YouTube)
 *
 * Показывает круговой ripple в месте касания с иконкой направления.
 */

import { Box } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

interface RippleItem {
  id: number
  x: number
  y: number
  direction: 'left' | 'right'
}

interface DoubleTapRippleProps {
  /** Событие double-tap: { x, y, direction } */
  trigger: { x: number; y: number; direction: 'left' | 'right' } | null
}

export function DoubleTapRipple({ trigger }: DoubleTapRippleProps) {
  const [ripples, setRipples] = useState<RippleItem[]>([])

  // Добавляем ripple при trigger
  useEffect(() => {
    if (!trigger) {
      return
    }

    const id = Date.now()
    const newRipple: RippleItem = {
      id,
      x: trigger.x,
      y: trigger.y,
      direction: trigger.direction,
    }

    setRipples((prev) => [...prev, newRipple])

    // Удаляем ripple после анимации
    const timeout = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)

    return () => clearTimeout(timeout)
  }, [trigger])

  return (
    <>
      {ripples.map((ripple) => (
        <Box
          key={ripple.id}
          position="absolute"
          left={ripple.x}
          top={ripple.y}
          transform="translate(-50%, -50%)"
          pointerEvents="none"
          zIndex={50}
        >
          {/* Основной ripple круг */}
          <Box
            w="120px"
            h="120px"
            borderRadius="full"
            bg="white/20"
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="rippleExpand 0.6s ease-out forwards"
          />

          {/* Иконки направления */}
          <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" display="flex" gap={0}>
            {ripple.direction === 'left' ? (
              <>
                <LuChevronLeft size={28} color="white" style={{ animation: 'fadeInChevron 0.3s ease-out' }} />
                <LuChevronLeft size={28} color="white" style={{ animation: 'fadeInChevron 0.3s ease-out 0.1s both' }} />
              </>
            ) : (
              <>
                <LuChevronRight size={28} color="white" style={{ animation: 'fadeInChevron 0.3s ease-out' }} />
                <LuChevronRight
                  size={28}
                  color="white"
                  style={{ animation: 'fadeInChevron 0.3s ease-out 0.1s both' }}
                />
              </>
            )}
          </Box>
        </Box>
      ))}

      {/* CSS анимации */}
      <style>
        {`
          @keyframes rippleExpand {
            0% {
              transform: scale(0.3);
              opacity: 0.8;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }

          @keyframes fadeInChevron {
            0% {
              opacity: 0;
              transform: translateX(0);
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }
        `}
      </style>
    </>
  )
}
