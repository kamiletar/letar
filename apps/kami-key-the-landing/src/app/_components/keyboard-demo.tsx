'use client'

import { Box, Container, Flex, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

/**
 * Маппинг одной клавиши:
 * label — то, что написано на клавише,
 * altgr — символ при AltGr,
 * shift — символ при AltGr+Shift (если есть),
 * name — человекочитаемое название
 */
interface KeyMapping {
  label: string
  altgr: string
  shift?: string
  name: string
  shiftName?: string
}

/** Маппинги для демо-клавиатуры */
const KEY_MAPPINGS: KeyMapping[] = [
  { label: '-', altgr: '\u2014', shift: '\u2013', name: 'длинное тире', shiftName: 'короткое тире' },
  { label: '=', altgr: '\u2260', shift: '\u2248', name: 'не равно', shiftName: 'приблизительно' },
  { label: '[', altgr: '\u00AB', shift: '\u2018', name: 'левая кавычка', shiftName: 'левая одиночная' },
  { label: ']', altgr: '\u00BB', shift: '\u2019', name: 'правая кавычка', shiftName: 'правая одиночная' },
  { label: 'e', altgr: '\u20AC', name: 'евро' },
  { label: 'r', altgr: '\u00AE', name: 'registered' },
  { label: 't', altgr: '\u2122', name: 'trademark' },
  { label: '.', altgr: '\u2026', name: 'многоточие' },
  { label: ',', altgr: '\u2190', shift: '\u21D0', name: 'стрелка влево', shiftName: 'двойная влево' },
  { label: '/', altgr: '\u2192', shift: '\u21D2', name: 'стрелка вправо', shiftName: 'двойная вправо' },
  { label: 'x', altgr: '\u00D7', name: 'умножение' },
  { label: 'c', altgr: '\u00A9', name: 'copyright' },
]

/**
 * Интерактивная демо-секция с визуализацией клавиатуры
 * При hover/клике на клавишу показывается результирующий символ
 */
export function KeyboardDemo() {
  const [hoveredKey, setHoveredKey] = useState<number | null>(null)
  const [pressedKey, setPressedKey] = useState<number | null>(null)
  const [shiftLayer, setShiftLayer] = useState(false)

  const handleKeyPress = useCallback((index: number) => {
    setPressedKey(index)
    setTimeout(() => setPressedKey(null), 300)
  }, [])

  return (
    <Box as="section" id="demo" py={{ base: 16, md: 24 }}>
      <Container maxW="5xl" px={{ base: 4, md: 8 }}>
        <VStack gap={{ base: 8, md: 12 }}>
          {/* Заголовок */}
          <VStack gap={3} textAlign="center">
            <Heading as="h2" className="gradient-text font-mono" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="700">
              Попробуйте сами
            </Heading>
            <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>
              Наведите на клавишу, чтобы увидеть результат
            </Text>
          </VStack>

          {/* Переключатель слоя */}
          <HStack gap={2}>
            <Box
              as="button"
              className={`kbd ${!shiftLayer ? 'active' : ''}`}
              px={4}
              onClick={() => setShiftLayer(false)}
              aria-pressed={!shiftLayer}
            >
              AltGr
            </Box>
            <Box
              as="button"
              className={`kbd ${shiftLayer ? 'active' : ''}`}
              px={4}
              onClick={() => setShiftLayer(true)}
              aria-pressed={shiftLayer}
            >
              AltGr+Shift
            </Box>
          </HStack>

          {/* Клавиатура */}
          <Flex
            flexWrap="wrap"
            gap={2}
            justify="center"
            maxW="600px"
            mx="auto"
            role="group"
            aria-label="Интерактивная клавиатура"
          >
            {KEY_MAPPINGS.map((key, index) => {
              const isHovered = hoveredKey === index
              const isPressed = pressedKey === index
              const symbol = shiftLayer && key.shift ? key.shift : key.altgr
              const name = shiftLayer && key.shiftName ? key.shiftName : key.name
              const hasShift = Boolean(key.shift)

              return (
                <Box
                  key={key.label}
                  position="relative"
                  onMouseEnter={() => setHoveredKey(index)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => handleKeyPress(index)}
                  cursor="pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Клавиша ${key.label}: ${name} (${symbol})`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleKeyPress(index)
                    }
                  }}
                >
                  {/* Сама клавиша */}
                  <Box
                    className={`kbd ${isHovered ? 'active' : ''} ${isPressed ? 'pressed' : ''}`}
                    w={{ base: '54px', md: '64px' }}
                    h={{ base: '54px', md: '64px' }}
                    fontSize={{ base: 'sm', md: 'md' }}
                    position="relative"
                    userSelect="none"
                  >
                    {/* Метка клавиши */}
                    <Text>{key.label}</Text>

                    {/* Символ результата в уголке */}
                    <Text
                      position="absolute"
                      top="4px"
                      right="6px"
                      fontSize={{ base: '17px', md: '20px' }}
                      color={isHovered ? '#39ff14' : 'rgba(57, 255, 20, 0.5)'}
                      transition="color 0.2s ease"
                      className="font-mono"
                      lineHeight="1"
                    >
                      {symbol}
                    </Text>

                    {/* Индикатор наличия shift-слоя */}
                    {hasShift && (
                      <Box
                        position="absolute"
                        bottom="3px"
                        right="5px"
                        w="4px"
                        h="4px"
                        borderRadius="full"
                        bg={shiftLayer ? 'brand.400' : 'gray.700'}
                        transition="background 0.2s ease"
                      />
                    )}
                  </Box>

                  {/* Всплывающий символ при hover */}
                  {isHovered && (
                    <Box
                      position="absolute"
                      top="-44px"
                      left="50%"
                      transform="translateX(-50%)"
                      className="glass"
                      borderRadius="md"
                      px={3}
                      py={1.5}
                      whiteSpace="nowrap"
                      zIndex={10}
                      textAlign="center"
                      boxShadow="0 0 20px rgba(57, 255, 20, 0.2)"
                    >
                      <Text className="font-mono" fontSize="lg" color="brand.400" fontWeight="700">
                        {symbol}
                      </Text>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Flex>

          {/* Таблица маппингов */}
          <Box className="glass" borderRadius="xl" p={{ base: 4, md: 6 }} w="100%" maxW="600px" mx="auto">
            <Text className="font-mono" fontSize="sm" color="brand.400" mb={3} fontWeight="600">
              {shiftLayer ? '// AltGr + Shift' : '// AltGr'}
            </Text>
            <Grid templateColumns="auto 1fr auto 1fr" gap={{ base: 2, md: 3 }} alignItems="center">
              {KEY_MAPPINGS.map((key) => {
                const symbol = shiftLayer && key.shift ? key.shift : key.altgr
                const name = shiftLayer && key.shiftName ? key.shiftName : key.name

                /* Если shift-слой активен, но у клавиши нет shift-маппинга — не показываем */
                if (shiftLayer && !key.shift) { return null }

                return (
                  <Box key={key.label} display="contents">
                    <Box className="kbd" fontSize="xs">
                      {key.label}
                    </Box>
                    <Text color="gray.500" fontSize="xs" className="font-mono">
                      {'\u2192'}
                    </Text>
                    <Text className="font-mono" fontSize="md" color="brand.400" fontWeight="600" textAlign="center">
                      {symbol}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {name}
                    </Text>
                  </Box>
                )
              })}
            </Grid>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
