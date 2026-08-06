'use client'

import { Box, HStack, Text, useBreakpointValue, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Режимы дыхания
 */
export type BreathingMode = '4-7-8' | 'box' | 'relaxing' | 'energizing'

/**
 * Конфигурация режимов дыхания (в секундах)
 */
const BREATHING_PATTERNS: Record<BreathingMode, { inhale: number; holdIn: number; exhale: number; holdOut: number }> = {
  '4-7-8': { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
  box: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  relaxing: { inhale: 4, holdIn: 2, exhale: 6, holdOut: 2 },
  energizing: { inhale: 2, holdIn: 0, exhale: 2, holdOut: 0 },
}

/**
 * Названия режимов
 */
export const BREATHING_MODE_LABELS: Record<BreathingMode, string> = {
  '4-7-8': '4-7-8 (Релаксация)',
  box: 'Box Breathing',
  relaxing: 'Расслабление',
  energizing: 'Энергия',
}

/**
 * Описания режимов
 */
export const BREATHING_MODE_DESCRIPTIONS: Record<BreathingMode, string> = {
  '4-7-8': 'Классическая техника для глубокого расслабления и сна',
  box: 'Техника Navy SEAL для концентрации',
  relaxing: 'Мягкий режим для снятия стресса',
  energizing: 'Быстрое дыхание для бодрости',
}

interface BreathingGuideProps {
  /** Включён ли guide */
  enabled: boolean
  /** Режим дыхания */
  mode?: BreathingMode
  /** BPM музыки для синхронизации (если указан — синхронизируется с ритмом) */
  musicBPM?: number
  /** Показывать ли кольцо */
  showRing?: boolean
  /** Показывать ли текстовые подсказки */
  showHints?: boolean
  /** Цвет кольца */
  ringColor?: string
  /** Радиус кольца в процентах от размера */
  ringRadiusPercent?: number
}

type Phase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut'

const MotionBox = motion.create(Box)

/**
 * Расширенный guide для дыхания с разными режимами.
 * - Режимы: 4-7-8, Box Breathing, Relaxing, Energizing
 * - Визуальное кольцо-индикатор
 * - Синхронизация с BPM музыки (опционально)
 */
export function BreathingGuide({
  enabled,
  mode = 'relaxing',
  musicBPM,
  showRing = true,
  showHints = true,
  ringColor = '#8B5CF6',
  ringRadiusPercent: ringRadiusProp,
}: BreathingGuideProps) {
  // Responsive default: меньше на мобильных чтобы не выходило за границы экрана
  const defaultRingRadius = useBreakpointValue({ base: 35, md: 45 }, { fallback: 'md' }) ?? 45
  const ringRadiusPercent = ringRadiusProp ?? defaultRingRadius
  const [phase, setPhase] = useState<Phase>('inhale')
  const [phaseProgress, setPhaseProgress] = useState(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const currentPhaseRef = useRef<Phase>('inhale')

  /**
   * Получить паттерн дыхания (с учётом BPM если указан)
   */
  const pattern = useMemo(() => {
    const basePattern = BREATHING_PATTERNS[mode]

    if (!musicBPM) {
      return basePattern
    }

    // Синхронизация с музыкой: один цикл = 4 такта
    const beatDuration = 60 / musicBPM
    const totalBeats = 16 // 4 такта по 4 доли
    const totalDuration = beatDuration * totalBeats
    const originalTotal = basePattern.inhale + basePattern.holdIn + basePattern.exhale + basePattern.holdOut

    if (originalTotal === 0) {
      return basePattern
    }

    const scale = totalDuration / originalTotal

    return {
      inhale: basePattern.inhale * scale,
      holdIn: basePattern.holdIn * scale,
      exhale: basePattern.exhale * scale,
      holdOut: basePattern.holdOut * scale,
    }
  }, [mode, musicBPM])

  /**
   * Общая длительность цикла
   */
  const cycleDuration = pattern.inhale + pattern.holdIn + pattern.exhale + pattern.holdOut

  /**
   * Подсказки для фаз
   */
  const phaseLabels: Record<Phase, string> = {
    inhale: 'Вдох',
    holdIn: 'Задержка',
    exhale: 'Выдох',
    holdOut: 'Пауза',
  }

  /**
   * Анимация дыхания
   */
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000
      const cyclePosition = elapsed % cycleDuration

      // Определяем текущую фазу и прогресс
      let currentPhase: Phase
      let phaseStart: number
      let phaseDuration: number

      if (cyclePosition < pattern.inhale) {
        currentPhase = 'inhale'
        phaseStart = 0
        phaseDuration = pattern.inhale
      } else if (cyclePosition < pattern.inhale + pattern.holdIn) {
        currentPhase = 'holdIn'
        phaseStart = pattern.inhale
        phaseDuration = pattern.holdIn
      } else if (cyclePosition < pattern.inhale + pattern.holdIn + pattern.exhale) {
        currentPhase = 'exhale'
        phaseStart = pattern.inhale + pattern.holdIn
        phaseDuration = pattern.exhale
      } else {
        currentPhase = 'holdOut'
        phaseStart = pattern.inhale + pattern.holdIn + pattern.exhale
        phaseDuration = pattern.holdOut
      }

      const progress = phaseDuration > 0 ? (cyclePosition - phaseStart) / phaseDuration : 0

      // Обновляем состояние только при изменении фазы
      if (currentPhase !== currentPhaseRef.current) {
        currentPhaseRef.current = currentPhase
        setPhase(currentPhase)
      }
      setPhaseProgress(progress)

      animationRef.current = requestAnimationFrame(animate)
    },
    [cycleDuration, pattern],
  )

  /**
   * Запуск/остановка анимации
   */
  useEffect(() => {
    if (!enabled) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      startTimeRef.current = 0
      setPhase('inhale')
      setPhaseProgress(0)
      return
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enabled, animate])

  if (!enabled) {
    return null
  }

  // Масштаб кольца на основе фазы
  const ringScale = phase === 'inhale'
    ? 1 + phaseProgress * 0.15
    : phase === 'exhale'
    ? 1.15 - phaseProgress * 0.15
    : phase === 'holdIn'
    ? 1.15
    : 1

  // Прозрачность на основе фазы
  const ringOpacity = phase === 'holdIn' || phase === 'holdOut' ? 0.3 + phaseProgress * 0.1 : 0.4

  return (
    <>
      {/* Кольцо-индикатор */}
      {showRing && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          width={`${ringRadiusPercent * 2}%`}
          height={`${ringRadiusPercent * 2}%`}
          pointerEvents="none"
          zIndex={8}
        >
          <MotionBox
            width="100%"
            height="100%"
            borderRadius="full"
            border="3px solid"
            borderColor={ringColor}
            opacity={ringOpacity}
            animate={{
              scale: ringScale,
            }}
            transition={{
              duration: 0.1,
              ease: 'linear',
            }}
            boxShadow={`0 0 30px ${ringColor}40, inset 0 0 30px ${ringColor}20`}
          />
        </Box>
      )}

      {/* Текстовые подсказки */}
      <AnimatePresence>
        {showHints && (
          <VStack
            position="absolute"
            bottom={24}
            left="50%"
            transform="translateX(-50%)"
            zIndex={10002}
            gap={3}
            pointerEvents="none"
          >
            {/* Название режима */}
            <MotionBox initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.5, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Text color="white" fontSize="xs" opacity={0.6}>
                {BREATHING_MODE_LABELS[mode]}
              </Text>
            </MotionBox>

            {/* Текущая фаза */}
            <MotionBox
              key={phase}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Box bg="blackAlpha.600" backdropFilter="blur(8px)" borderRadius="full" px={8} py={3}>
                <Text
                  color="white"
                  fontSize="xl"
                  fontWeight="medium"
                  textAlign="center"
                  style={{
                    textShadow: `0 0 20px ${ringColor}`,
                  }}
                >
                  {phaseLabels[phase]}
                </Text>
              </Box>
            </MotionBox>

            {/* Прогресс-бар */}
            <HStack gap={1}>
              {(['inhale', 'holdIn', 'exhale', 'holdOut'] as Phase[]).map((p) => {
                const isActive = p === phase
                const isPast = (p === 'inhale' && (phase === 'holdIn' || phase === 'exhale' || phase === 'holdOut'))
                  || (p === 'holdIn' && (phase === 'exhale' || phase === 'holdOut'))
                  || (p === 'exhale' && phase === 'holdOut')

                // Пропускаем фазы с нулевой длительностью
                const phaseDuration = pattern[p]
                if (phaseDuration === 0) {
                  return null
                }

                return (
                  <Box key={p} width="40px" height="4px" bg="whiteAlpha.200" borderRadius="full" overflow="hidden">
                    <Box
                      height="100%"
                      bg={ringColor}
                      borderRadius="full"
                      width={isPast ? '100%' : isActive ? `${phaseProgress * 100}%` : '0%'}
                      transition="width 0.1s linear"
                    />
                  </Box>
                )
              })}
            </HStack>
          </VStack>
        )}
      </AnimatePresence>
    </>
  )
}
