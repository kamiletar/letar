'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  ALLERGY_OPTIONS,
  BODY_AREA_OPTIONS,
  BUDGET_OPTIONS,
  COLOR_OPTIONS,
  DRESS_CODE_OPTIONS,
  EVENT_OPTIONS,
  FABRIC_OPTIONS,
  FIT_ISSUE_OPTIONS,
  FIT_OPTIONS,
  HOBBY_OPTIONS,
  LENGTH_OPTIONS,
  PRINT_OPTIONS,
  SHOPPING_FREQUENCY_OPTIONS,
  SIZE_OPTIONS,
  TOTAL_STEPS,
  TRAVEL_OPTIONS,
  useStylistQuestionnaire,
  WARDROBE_ITEM_OPTIONS,
} from '@/hooks/use-stylist-questionnaire'
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  HStack,
  Icon,
  Input,
  Progress,
  Skeleton,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBriefcase,
  FaCheck,
  FaHeart,
  FaLightbulb,
  FaPalette,
  FaRedo,
  FaTshirt,
  FaUser,
} from 'react-icons/fa'

// Названия шагов
const STEP_NAMES = ['Образ жизни', 'Гардероб', 'Предпочтения', 'Особенности', 'Вдохновение']

const STEP_ICONS = [FaBriefcase, FaTshirt, FaPalette, FaUser, FaLightbulb]

/**
 * Компонент выбора нескольких опций
 */
function MultiSelect({
  options,
  selected,
  onChange,
  columns = 2,
}: {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  columns?: number
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <Box display="grid" gridTemplateColumns={`repeat(${columns}, 1fr)`} gap={2}>
      {options.map((option) => (
        <Checkbox.Root key={option} checked={selected.includes(option)} onCheckedChange={() => toggle(option)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">{option}</Checkbox.Label>
        </Checkbox.Root>
      ))}
    </Box>
  )
}

/**
 * Компонент выбора одной опции
 */
function SingleSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <HStack flexWrap="wrap" gap={2}>
      {options.map((option) => (
        <Button
          key={option}
          size="xs"
          variant={value === option ? 'solid' : 'outline'}
          colorPalette={value === option ? 'fg' : 'gray'}
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </HStack>
  )
}

/**
 * Анкета стилиста - многошаговая форма для персональных рекомендаций.
 */
export function StylistQuestionnaire() {
  const {
    questionnaire,
    isLoading,
    isStarted,
    isCompleted,
    currentStep,
    progress,
    startQuestionnaire,
    updateLifestyle,
    updateWardrobe,
    updatePreferences,
    updateConcerns,
    updateInspiration,
    nextStep,
    prevStep,
    completeQuestionnaire,
    resetQuestionnaire,
  } = useStylistQuestionnaire()

  const [isSaving, setIsSaving] = useState(false)

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={4}>
            <Skeleton height="20px" width="60%" />
            <Skeleton height="100px" width="100%" />
            <Skeleton height="40px" width="100%" />
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Начальный экран
  if (!isStarted) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon as={FaHeart} color="fg.muted" />
            <Text fontWeight="medium">Анкета стилиста</Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} py={4}>
            <Icon as={FaPalette} boxSize={12} color="fg.muted" />
            <Text fontWeight="medium" textAlign="center">
              Узнайте свой идеальный стиль
            </Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center" maxW="sm">
              Пройдите короткую анкету, чтобы получить персональные рекомендации по подбору гардероба. Ваши ответы
              сохраняются автоматически.
            </Text>
            <Button
              colorPalette="fg"
              onClick={async () => {
                setIsSaving(true)
                const result = await startQuestionnaire()
                setIsSaving(false)
                if (result.success) {
                  toaster.success({ title: 'Анкета начата!' })
                }
              }}
              loading={isSaving}
            >
              <Icon as={FaArrowRight} mr={2} />
              Начать анкету
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Завершённая анкета
  if (isCompleted) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon as={FaCheck} color="green.500" />
            <Text fontWeight="medium">Анкета заполнена</Text>
            <Badge colorPalette="green">100%</Badge>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} py={4}>
            <Icon as={FaHeart} boxSize={12} color="green.500" />
            <Text fontWeight="medium" textAlign="center">
              Спасибо за заполнение!
            </Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center" maxW="sm">
              Теперь мы сможем подбирать для вас наиболее подходящие товары и давать персональные рекомендации.
            </Text>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsSaving(true)
                const result = await resetQuestionnaire()
                setIsSaving(false)
                if (result.success) {
                  toaster.info({ title: 'Анкета сброшена' })
                }
              }}
              loading={isSaving}
            >
              <Icon as={FaRedo} mr={2} />
              Заполнить заново
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Рендер содержимого шага
  const renderStepContent = () => {
    if (!questionnaire) {
      return null
    }

    switch (currentStep) {
      case 1:
        // Образ жизни
        return (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Ваша профессия
              </Text>
              <Input
                placeholder="Например: маркетолог, врач, дизайнер..."
                value={questionnaire.lifestyle.occupation}
                onChange={(e) => updateLifestyle({ occupation: e.target.value })}
                size="sm"
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Дресс-код на работе
              </Text>
              <SingleSelect
                options={DRESS_CODE_OPTIONS}
                value={questionnaire.lifestyle.workDressCode}
                onChange={(value) => updateLifestyle({ workDressCode: value })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Ваши хобби и увлечения
              </Text>
              <MultiSelect
                options={HOBBY_OPTIONS}
                selected={questionnaire.lifestyle.hobbies}
                onChange={(hobbies) => updateLifestyle({ hobbies })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Какие мероприятия посещаете?
              </Text>
              <MultiSelect
                options={EVENT_OPTIONS}
                selected={questionnaire.lifestyle.socialEvents}
                onChange={(socialEvents) => updateLifestyle({ socialEvents })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Как часто путешествуете?
              </Text>
              <SingleSelect
                options={TRAVEL_OPTIONS}
                value={questionnaire.lifestyle.travelFrequency}
                onChange={(value) => updateLifestyle({ travelFrequency: value })}
              />
            </Box>
          </VStack>
        )

      case 2:
        // Гардероб
        return (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Ваш размер одежды
              </Text>
              <SingleSelect
                options={SIZE_OPTIONS}
                value={questionnaire.wardrobe.currentSize}
                onChange={(value) => updateWardrobe({ currentSize: value })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Любимые вещи в гардеробе
              </Text>
              <MultiSelect
                options={WARDROBE_ITEM_OPTIONS}
                selected={questionnaire.wardrobe.favoriteItems}
                onChange={(favoriteItems) => updateWardrobe({ favoriteItems })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Чего не хватает в гардеробе?
              </Text>
              <MultiSelect
                options={WARDROBE_ITEM_OPTIONS}
                selected={questionnaire.wardrobe.missingItems}
                onChange={(missingItems) => updateWardrobe({ missingItems })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Бюджет на одежду в месяц
              </Text>
              <SingleSelect
                options={BUDGET_OPTIONS}
                value={questionnaire.wardrobe.clothingBudget}
                onChange={(value) => updateWardrobe({ clothingBudget: value })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Как часто покупаете одежду?
              </Text>
              <SingleSelect
                options={SHOPPING_FREQUENCY_OPTIONS}
                value={questionnaire.wardrobe.shoppingFrequency}
                onChange={(value) => updateWardrobe({ shoppingFrequency: value })}
              />
            </Box>
          </VStack>
        )

      case 3:
        // Предпочтения
        return (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Любимые цвета
              </Text>
              <MultiSelect
                options={COLOR_OPTIONS}
                selected={questionnaire.preferences.colorPreferences}
                onChange={(colorPreferences) => updatePreferences({ colorPreferences })}
                columns={3}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Предпочитаемые ткани
              </Text>
              <MultiSelect
                options={FABRIC_OPTIONS}
                selected={questionnaire.preferences.fabricPreferences}
                onChange={(fabricPreferences) => updatePreferences({ fabricPreferences })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Любимые принты
              </Text>
              <MultiSelect
                options={PRINT_OPTIONS}
                selected={questionnaire.preferences.printPreferences}
                onChange={(printPreferences) => updatePreferences({ printPreferences })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Предпочитаемая посадка
              </Text>
              <SingleSelect
                options={FIT_OPTIONS}
                value={questionnaire.preferences.fitPreference}
                onChange={(value) => updatePreferences({ fitPreference: value })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Предпочитаемая длина
              </Text>
              <SingleSelect
                options={LENGTH_OPTIONS}
                value={questionnaire.preferences.lengthPreference}
                onChange={(value) => updatePreferences({ lengthPreference: value })}
              />
            </Box>
          </VStack>
        )

      case 4:
        // Проблемные зоны
        return (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Что хотите скрыть или подчеркнуть?
              </Text>
              <MultiSelect
                options={BODY_AREA_OPTIONS}
                selected={questionnaire.concerns.bodyAreas}
                onChange={(bodyAreas) => updateConcerns({ bodyAreas })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Проблемы с посадкой одежды
              </Text>
              <MultiSelect
                options={FIT_ISSUE_OPTIONS}
                selected={questionnaire.concerns.fitIssues}
                onChange={(fitIssues) => updateConcerns({ fitIssues })}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Аллергия на материалы
              </Text>
              <MultiSelect
                options={ALLERGY_OPTIONS}
                selected={questionnaire.concerns.allergies}
                onChange={(allergies) => updateConcerns({ allergies })}
                columns={1}
              />
            </Box>
          </VStack>
        )

      case 5:
        // Вдохновение
        return (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Иконы стиля (кого вдохновляет ваш стиль?)
              </Text>
              <Input
                placeholder="Введите имя и нажмите Enter"
                size="sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    updateInspiration({
                      styleIcons: [...questionnaire.inspiration.styleIcons, e.currentTarget.value],
                    })
                    e.currentTarget.value = ''
                  }
                }}
              />
              <HStack flexWrap="wrap" gap={1} mt={2}>
                {questionnaire.inspiration.styleIcons.map((icon, iconIndex) => (
                  <Badge
                    key={icon}
                    colorPalette="fg"
                    cursor="pointer"
                    onClick={() =>
                      updateInspiration({
                        styleIcons: questionnaire.inspiration.styleIcons.filter((_, i) => i !== iconIndex),
                      })
                    }
                  >
                    {icon} ×
                  </Badge>
                ))}
              </HStack>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Любимые Instagram аккаунты
              </Text>
              <Input
                placeholder="@username и нажмите Enter"
                size="sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    updateInspiration({
                      instagramAccounts: [...questionnaire.inspiration.instagramAccounts, e.currentTarget.value],
                    })
                    e.currentTarget.value = ''
                  }
                }}
              />
              <HStack flexWrap="wrap" gap={1} mt={2}>
                {questionnaire.inspiration.instagramAccounts.map((acc, accIndex) => (
                  <Badge
                    key={acc}
                    colorPalette="purple"
                    cursor="pointer"
                    onClick={() =>
                      updateInspiration({
                        instagramAccounts: questionnaire.inspiration.instagramAccounts.filter((_, i) => i !== accIndex),
                      })
                    }
                  >
                    {acc} ×
                  </Badge>
                ))}
              </HStack>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Доски Pinterest
              </Text>
              <Input
                placeholder="Ссылка на доску и нажмите Enter"
                size="sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    updateInspiration({
                      pinterestBoards: [...questionnaire.inspiration.pinterestBoards, e.currentTarget.value],
                    })
                    e.currentTarget.value = ''
                  }
                }}
              />
              <HStack flexWrap="wrap" gap={1} mt={2}>
                {questionnaire.inspiration.pinterestBoards.map((board, boardIndex) => (
                  <Badge
                    key={board}
                    colorPalette="red"
                    cursor="pointer"
                    onClick={() =>
                      updateInspiration({
                        pinterestBoards: questionnaire.inspiration.pinterestBoards.filter((_, i) => i !== boardIndex),
                      })
                    }
                  >
                    Доска {boardIndex + 1} ×
                  </Badge>
                ))}
              </HStack>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Дополнительные заметки о вашем стиле
              </Text>
              <Textarea
                placeholder="Расскажите о своём стиле, предпочтениях, пожеланиях..."
                size="sm"
                rows={3}
                value={questionnaire.inspiration.notes}
                onChange={(e) => updateInspiration({ notes: e.target.value })}
              />
            </Box>
          </VStack>
        )

      default:
        return null
    }
  }

  const StepIcon = STEP_ICONS[currentStep - 1] || FaUser

  return (
    <Card.Root>
      <Card.Header>
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between">
            <HStack gap={2}>
              <Icon as={StepIcon} color="fg.muted" />
              <Text fontWeight="medium">{STEP_NAMES[currentStep - 1]}</Text>
              <Badge colorPalette="fg" size="sm">
                Шаг {currentStep} из {TOTAL_STEPS}
              </Badge>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {progress}% заполнено
            </Text>
          </HStack>
          <Progress.Root value={progress} size="xs" colorPalette="fg">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </VStack>
      </Card.Header>
      <Card.Body>{renderStepContent()}</Card.Body>
      <Card.Footer>
        <HStack justify="space-between" width="100%">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setIsSaving(true)
              await prevStep()
              setIsSaving(false)
            }}
            disabled={currentStep === 1}
          >
            <Icon as={FaArrowLeft} mr={1} />
            Назад
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button
              colorPalette="fg"
              size="sm"
              onClick={async () => {
                setIsSaving(true)
                await nextStep()
                setIsSaving(false)
              }}
              loading={isSaving}
            >
              Далее
              <Icon as={FaArrowRight} ml={1} />
            </Button>
          ) : (
            <Button
              colorPalette="green"
              size="sm"
              onClick={async () => {
                setIsSaving(true)
                const result = await completeQuestionnaire()
                setIsSaving(false)
                if (result.success) {
                  toaster.success({ title: 'Анкета заполнена!', description: 'Спасибо за ваши ответы' })
                }
              }}
              loading={isSaving}
            >
              <Icon as={FaCheck} mr={1} />
              Завершить
            </Button>
          )}
        </HStack>
      </Card.Footer>
    </Card.Root>
  )
}
