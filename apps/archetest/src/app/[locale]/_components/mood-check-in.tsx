'use client'

import { Box, Button, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { Pressable, StickyActionBar } from '@letar/ui'

export interface MoodValue {
  /** 1 = негативная, 2 = нейтральная, 3 = позитивная */
  valence: number
  /** 1 = низкая, 2 = средняя, 3 = высокая */
  energy: number
}

interface MoodCheckInProps {
  onSubmit: (mood: MoodValue) => void
  onSkip: () => void
  isRu: boolean
}

/** Сетка 3×3 циркумплекса Рассела: строки — энергия (высокая → низкая), столбцы — валентность (нег → поз) */
const GRID: { valence: number; energy: number; emoji: string; label: string; labelEn: string }[] = [
  { valence: 1, energy: 3, emoji: '😠', label: 'Взвинчен', labelEn: 'Agitated' },
  { valence: 2, energy: 3, emoji: '😳', label: 'Взбудоражен', labelEn: 'Excited' },
  { valence: 3, energy: 3, emoji: '🤩', label: 'Воодушевлён', labelEn: 'Elated' },
  { valence: 1, energy: 2, emoji: '😟', label: 'Тревожен', labelEn: 'Anxious' },
  { valence: 2, energy: 2, emoji: '😐', label: 'Нейтрально', labelEn: 'Neutral' },
  { valence: 3, energy: 2, emoji: '🙂', label: 'Бодро', labelEn: 'Content' },
  { valence: 1, energy: 1, emoji: '😔', label: 'Подавлен', labelEn: 'Down' },
  { valence: 2, energy: 1, emoji: '😴', label: 'Устал', labelEn: 'Tired' },
  { valence: 3, energy: 1, emoji: '😌', label: 'Спокоен', labelEn: 'Calm' },
]

/**
 * Mood check-in перед сессией (этап 5.9.2): один экран ~10 сек, сетка эмодзи 3×3
 * по циркумплексу Рассела (валентность × энергия). Не влияет на скоринг черт —
 * даёт психологу «профиль в грусти vs профиль в ресурсе» и фундамент для будущей
 * карты стабильности (Фаза 3). Мягкая механика — пропуск доступен без friction.
 */
export function MoodCheckIn({ onSubmit, onSkip, isRu }: MoodCheckInProps) {
  return (
    <Container maxW="md" pt={16} pb={8}>
      <VStack gap={6} textAlign="center">
        <Heading size="xl">{isRu ? 'Как вы сейчас?' : 'How are you feeling?'}</Heading>
        <Text color="fg.muted" maxW="sm">
          {isRu
            ? 'Выберите ближайшее состояние. Это поможет отличить устойчивые черты характера от сиюминутного настроения.'
            : 'Pick the closest state. This helps separate stable traits from momentary mood.'}
        </Text>

        <SimpleGrid columns={3} gap={3} w="100%">
          {GRID.map((cell) => (
            <Pressable key={`${cell.valence}-${cell.energy}`} borderRadius="lg">
              <Box
                w="100%"
                minH="88px"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="border"
                bg="bg.subtle"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={1}
                cursor="pointer"
                _hover={{ bg: 'bg.muted' }}
                asChild
              >
                <button type="button" onClick={() => onSubmit({ valence: cell.valence, energy: cell.energy })}>
                  <Text fontSize="2xl">{cell.emoji}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isRu ? cell.label : cell.labelEn}
                  </Text>
                </button>
              </Box>
            </Pressable>
          ))}
        </SimpleGrid>
      </VStack>

      {/*
       * StickyActionBar, не обычная inline-кнопка — `padding-bottom` внизу Container не
       * помогает: он добавляет пространство ПОСЛЕ контента, а не поднимает то, что уже
       * отрендерено выше, поэтому на короткой странице (контент короче вьюпорта, скролла
       * нет) кнопка всё равно попадала бы в зону под fixed cookie-баннером. StickyActionBar
       * (`position: sticky; bottom: var(--letar-cookie-banner-height, 0px)`) корректно
       * приподнимается даже без скролла — sticky вычисляется по текущей позиции
       * относительно viewport, а не требует явного пользовательского скролла.
       * (archetest, safety-net.spec.ts/mood-check-in.spec.ts, 2026-07-29: клик по
       * «Пропустить» перехватывала ссылка «Подробнее в политике ПДн» из баннера).
       */}
      <StickyActionBar bg="bg" mx={{ base: -4, md: 0 }} contentProps={{ justify: 'center' }}>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {isRu ? 'Пропустить' : 'Skip'}
        </Button>
      </StickyActionBar>
    </Container>
  )
}
