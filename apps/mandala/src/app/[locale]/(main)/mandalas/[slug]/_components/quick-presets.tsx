'use client'

import { Box, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { LuHeart, LuMoon, LuZap } from 'react-icons/lu'
import { ATMOSPHERE_PRESETS, type AtmospherePresetId, type ViewerSettings } from '../_schemas/viewer-settings.schema'

const MotionBox = motion.create(Box)

/**
 * Иконки для пресетов
 */
const PRESET_ICONS: Record<AtmospherePresetId, React.ElementType> = {
  calm: LuMoon,
  energy: LuZap,
  meditation: LuHeart,
}

/**
 * Цвета для пресетов
 */
const PRESET_COLORS: Record<AtmospherePresetId, string> = {
  calm: 'blue',
  energy: 'orange',
  meditation: 'pink',
}

interface QuickPresetsProps {
  /** ID текущего активного пресета */
  currentPreset: string | null
  /** Callback для выбора пресета */
  onSelectPreset: (presetId: AtmospherePresetId, settings: Partial<ViewerSettings>) => void
  /** Видимость компонента */
  visible?: boolean
}

/**
 * Компонент быстрого выбора пресетов атмосферы.
 * Отображает 3 кнопки-иконки с tooltip для быстрой смены настроек.
 */
export function QuickPresets({ currentPreset, onSelectPreset, visible = true }: QuickPresetsProps) {
  const [hoveredPreset, setHoveredPreset] = useState<AtmospherePresetId | null>(null)

  /**
   * Обработчик выбора пресета
   */
  const handleSelect = useCallback(
    (presetId: AtmospherePresetId) => {
      const preset = ATMOSPHERE_PRESETS[presetId]
      onSelectPreset(presetId, preset.settings)
    },
    [onSelectPreset]
  )

  return (
    <AnimatePresence>
      {visible && (
        <MotionBox
          position="fixed"
          top={4}
          right={4}
          zIndex={10001}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Glassmorphism контейнер */}
          <Box
            bg="blackAlpha.600"
            backdropFilter="blur(16px)"
            borderRadius="xl"
            p={2}
            border="1px solid"
            borderColor="whiteAlpha.200"
            boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
            data-onboarding="presets-panel"
          >
            <HStack gap={1}>
              {(Object.keys(ATMOSPHERE_PRESETS) as AtmospherePresetId[]).map((presetId) => {
                const preset = ATMOSPHERE_PRESETS[presetId]
                const Icon = PRESET_ICONS[presetId]
                const color = PRESET_COLORS[presetId]
                const isActive = currentPreset === presetId

                return (
                  <Box key={presetId} position="relative">
                    <IconButton
                      aria-label={preset.name}
                      size="lg"
                      variant={isActive ? 'solid' : 'ghost'}
                      colorPalette={color}
                      onClick={() => handleSelect(presetId)}
                      onMouseEnter={() => setHoveredPreset(presetId)}
                      onMouseLeave={() => setHoveredPreset(null)}
                      _hover={{
                        transform: 'scale(1.1)',
                      }}
                      transition="all 0.2s"
                    >
                      <Icon />
                    </IconButton>

                    {/* Tooltip при наведении */}
                    <AnimatePresence>
                      {hoveredPreset === presetId && (
                        <MotionBox
                          position="absolute"
                          top="100%"
                          right={0}
                          mt={2}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          pointerEvents="none"
                          zIndex={10002}
                        >
                          <Box
                            bg="gray.900"
                            borderRadius="md"
                            p={3}
                            minW="160px"
                            boxShadow="lg"
                            border="1px solid"
                            borderColor="whiteAlpha.200"
                          >
                            <VStack align="start" gap={1}>
                              <Text fontWeight="bold" color="white" fontSize="sm">
                                {preset.name}
                              </Text>
                              <Text color="gray.400" fontSize="xs">
                                {preset.description}
                              </Text>
                            </VStack>
                          </Box>
                        </MotionBox>
                      )}
                    </AnimatePresence>
                  </Box>
                )
              })}
            </HStack>
          </Box>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
