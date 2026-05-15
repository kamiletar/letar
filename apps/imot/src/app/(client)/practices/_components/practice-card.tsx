/* oxlint-disable no-array-index-key */
'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, Link, Text, Textarea, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import {
  LuActivity,
  LuBrain,
  LuCircle,
  LuCircleCheck,
  LuClock,
  LuHeart,
  LuMusic,
  LuRepeat,
  LuSparkles,
  LuUser,
  LuVideo,
} from 'react-icons/lu'
import { togglePracticeCompletion, updatePracticeNotes } from '../_actions/practice.actions'

type Practice = {
  id: string
  title: string
  description: string
  level: string
  instructions: string
  frequency?: string | null
  duration?: string | null
  materials?: string | null
  videoUrl?: string | null
  audioUrl?: string | null
  isCompleted: boolean
  completedAt?: Date | null
  clientNotes?: string | null
  notes?: string | null
  createdAt: Date
}

interface PracticeCardProps {
  practice: Practice
}

// Цвета и иконки для уровней
const levelConfig: Record<
  string,
  { color: string; icon: React.ComponentType<{ size?: number; color?: string }>; name: string }
> = {
  numerology: { color: '#FF6B6B', icon: LuSparkles, name: 'Нумерология' },
  neuropsych: { color: '#4ECDC4', icon: LuBrain, name: 'Нейропсихология' },
  energy: { color: '#FFE66D', icon: LuActivity, name: 'Энергетика' },
  body: { color: '#95E1D3', icon: LuHeart, name: 'Тело' },
  style: { color: '#F38181', icon: LuUser, name: 'Стиль' },
  integration: { color: '#667eea', icon: LuSparkles, name: 'Интеграция' },
}

/**
 * Карточка практики для клиента
 * Интерактивная карточка с возможностью отметки выполнения и ведения дневника
 */
export function PracticeCard({ practice }: PracticeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(practice.clientNotes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const levelInfo = levelConfig[practice.level] || levelConfig.integration
  const Icon = levelInfo.icon

  // Парсинг материалов
  let materials: string[] = []
  try {
    if (practice.materials) {
      materials = JSON.parse(practice.materials)
    }
  } catch (error) {
    console.error('Ошибка парсинга материалов:', error)
  }

  const handleToggleCompletion = async () => {
    setIsSubmitting(true)
    try {
      await togglePracticeCompletion(practice.id)
      toaster.success({
        title: practice.isCompleted ? 'Практика возвращена в активные' : 'Практика отмечена как завершенная',
      })
    } catch {
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось обновить статус практики',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveNotes = async () => {
    setIsSubmitting(true)
    try {
      await updatePracticeNotes(practice.id, notes)
      setIsEditingNotes(false)
      toaster.success({
        title: 'Заметки сохранены',
      })
    } catch {
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось сохранить заметки',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      p={6}
      borderWidth="2px"
      borderColor={practice.isCompleted ? 'border' : levelInfo.color}
      borderRadius="lg"
      bg={practice.isCompleted ? 'bg.muted' : `${levelInfo.color}08`}
      opacity={practice.isCompleted ? 0.8 : 1}
    >
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack gap={2}>
              <Icon size={20} color={levelInfo.color} />
              <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                {levelInfo.name}
              </Text>
            </HStack>
            {practice.isCompleted && (
              <HStack gap={1} fontSize="xs" color="#00A878">
                <LuCircleCheck size={16} />
                <Text>Завершено</Text>
              </HStack>
            )}
          </HStack>
          <Text fontSize="xl" fontWeight="bold" color={levelInfo.color}>
            {practice.title}
          </Text>
          <Text color="fg.muted" mt={1}>
            {practice.description}
          </Text>
        </Box>

        {/* Метаданные */}
        <HStack gap={4} fontSize="sm" color="fg.muted">
          {practice.frequency && (
            <HStack gap={1}>
              <LuRepeat size={16} />
              <Text>{practice.frequency}</Text>
            </HStack>
          )}
          {practice.duration && (
            <HStack gap={1}>
              <LuClock size={16} />
              <Text>{practice.duration}</Text>
            </HStack>
          )}
        </HStack>

        {/* Инструкции (свернуто/развернуто) */}
        <Box>
          <Text fontSize="sm" whiteSpace="pre-wrap" lineClamp={isExpanded ? undefined : 3}>
            {practice.instructions}
          </Text>
          {practice.instructions.length > 150 && (
            <Button variant="ghost" size="sm" mt={2} onClick={() => setIsExpanded(!isExpanded)} colorPalette="fg">
              {isExpanded ? 'Свернуть' : 'Показать полностью'}
            </Button>
          )}
        </Box>

        {/* Материалы */}
        {(materials.length > 0 || practice.videoUrl || practice.audioUrl) && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Материалы
            </Text>
            <VStack gap={2} align="stretch">
              {practice.videoUrl && (
                <Link
                  href={practice.videoUrl}
                  target="_blank"
                  color={levelInfo.color}
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <LuVideo size={16} />
                  Видео
                </Link>
              )}
              {practice.audioUrl && (
                <Link
                  href={practice.audioUrl}
                  target="_blank"
                  color={levelInfo.color}
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <LuMusic size={16} />
                  Аудио
                </Link>
              )}
              {/* oxlint-disable-next-line no-array-index-key */}
              {materials.map((material, index) => (
                <Link key={index} href={material} target="_blank" color={levelInfo.color} fontSize="sm">
                  {material}
                </Link>
              ))}
            </VStack>
          </Box>
        )}

        {/* Дневник практики */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
            Мой дневник
          </Text>
          {isEditingNotes ? (
            <VStack gap={2} align="stretch">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ваши заметки о выполнении практики..."
                rows={4}
              />
              <HStack>
                <Button size="sm" colorPalette="fg" onClick={handleSaveNotes} loading={isSubmitting}>
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingNotes(false)
                    setNotes(practice.clientNotes || '')
                  }}
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
              </HStack>
            </VStack>
          ) : (
            <Box>
              {practice.clientNotes ? (
                <Box
                  p={3}
                  bg="bg"
                  borderRadius="md"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                  onClick={() => setIsEditingNotes(true)}
                  cursor="pointer"
                  _hover={{ bg: 'bg.muted' }}
                >
                  {practice.clientNotes}
                </Box>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                  Добавить заметку
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Кнопка отметки выполнения */}
        <Button
          colorPalette={practice.isCompleted ? 'gray' : 'fg'}
          onClick={handleToggleCompletion}
          loading={isSubmitting}
          width="full"
        >
          {practice.isCompleted ? (
            <>
              <LuCircle /> Вернуть в активные
            </>
          ) : (
            <>
              <LuCircleCheck /> Отметить как выполненную
            </>
          )}
        </Button>

        {/* Дата завершения */}
        {practice.isCompleted && practice.completedAt && (
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            Завершено {new Date(practice.completedAt).toLocaleDateString('ru-RU')}
          </Text>
        )}
      </VStack>
    </Box>
  )
}
