'use client'

/**
 * Редактор перерывов инструктора
 *
 * @module custom-breaks-editor
 *
 * Структура модуля:
 * - custom-breaks-constants.ts — константы и типы
 * - use-custom-breaks.ts — хук управления состоянием
 * - break-form.tsx — форма добавления/редактирования
 * - break-item.tsx — карточка перерыва
 */

import { Box, Button, Flex, HStack, Stack, Text } from '@chakra-ui/react'
import { LuCoffee, LuPlus } from 'react-icons/lu'

import type { CustomBreakData } from '../_actions/custom-breaks.action'
import { useCustomBreaks } from '../_hooks/use-custom-breaks'
import { BreakForm } from './break-form'
import { BreakItem } from './break-item'
import { PastBreaksList } from './past-breaks-list'

interface CustomBreaksEditorProps {
  initialBreaks: CustomBreakData[]
}

/**
 * Редактор перерывов с формой и списком
 */
export function CustomBreaksEditor({ initialBreaks }: CustomBreaksEditorProps) {
  const {
    breaks,
    isAdding,
    editingBreakId,
    formData,
    isPending,
    isEditing,
    today,
    handleStartAdd,
    handleStartEdit,
    handleCancel,
    handleAdd,
    handleUpdate,
    handleDelete,
    setFormData,
  } = useCustomBreaks({ initialBreaks })

  return (
    <Box>
      {/* Заголовок */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack gap={2}>
          <LuCoffee />
          <Text fontWeight="bold">Перерывы</Text>
        </HStack>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={handleStartAdd}>
            <LuPlus />
            Добавить
          </Button>
        )}
      </Flex>

      <Stack gap={3}>
        {/* Форма добавления нового перерыва - вверху списка */}
        {isAdding && !isEditing && (
          <BreakForm
            formData={formData}
            setFormData={setFormData}
            isEditing={false}
            isPending={isPending}
            today={today}
            onCancel={handleCancel}
            onSubmit={handleAdd}
            showTypeSelector={true}
          />
        )}

        {/* Пустой список */}
        {breaks.length === 0 && !isAdding && (
          <Text color="fg.muted" fontSize="sm">
            Нет настроенных перерывов
          </Text>
        )}

        {/* Список существующих перерывов */}
        {breaks.map((breakItem) =>
          editingBreakId === breakItem.id ? (
            // Форма редактирования вместо карточки
            <BreakForm
              key={breakItem.id}
              formData={formData}
              setFormData={setFormData}
              isEditing={true}
              isPending={isPending}
              today={today}
              onCancel={handleCancel}
              onSubmit={handleUpdate}
              editingBreakIsRecurring={breakItem.isRecurring}
              showTypeSelector={false}
            />
          ) : (
            // Карточка перерыва
            <BreakItem
              key={breakItem.id}
              breakItem={breakItem}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              disabled={isPending || isAdding}
            />
          )
        )}

        {/* Прошедшие перерывы под спойлером */}
        <PastBreaksList />
      </Stack>
    </Box>
  )
}
