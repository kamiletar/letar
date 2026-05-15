'use client'

import { licenseCategoryLabels, transmissionTypeLabels } from '@/driving-school-form/labels'
import {
  Box,
  Button,
  Checkbox,
  CloseButton,
  Dialog,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'
import { useEffect, useState } from 'react'
import { LuCreditCard, LuSave } from 'react-icons/lu'
import type { StudentLicenseData } from '../_actions/license.action'

// Все доступные категории
const LICENSE_CATEGORIES: LicenseCategory[] = [
  'M',
  'A1',
  'A',
  'B1',
  'B',
  'C1',
  'C',
  'D1',
  'D',
  'BE',
  'CE',
  'C1E',
  'DE',
  'D1E',
  'Tm',
  'Tb',
]

// Категории с возможным ограничением на АКПП
const CATEGORIES_WITH_TRANSMISSION = ['B', 'B1', 'C', 'C1', 'D', 'D1']

interface LicenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'renew'
  license?: StudentLicenseData | null
  existingCategories?: LicenseCategory[]
  onSubmit: (data: {
    category: LicenseCategory
    transmissionRestriction?: TransmissionType
    obtainedAt: Date
    expiresAt: Date
  }) => Promise<void>
  isPending?: boolean
}

// Форматирование даты для input type="date"
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Добавить 10 лет к дате
function addTenYears(date: Date): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + 10)
  return result
}

export function LicenseFormDialog({
  open,
  onOpenChange,
  mode,
  license,
  existingCategories = [],
  onSubmit,
  isPending,
}: LicenseFormDialogProps) {
  const isRenew = mode === 'renew' && license

  // Состояние формы
  const [category, setCategory] = useState<LicenseCategory>('B')
  const [hasTransmissionRestriction, setHasTransmissionRestriction] = useState(false)
  const [obtainedAt, setObtainedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  // Синхронизация формы при открытии
  useEffect(() => {
    if (open) {
      if (isRenew && license) {
        setCategory(license.category)
        setHasTransmissionRestriction(license.transmissionRestriction === 'AUTOMATIC')
        setObtainedAt(formatDateForInput(new Date(license.obtainedAt)))
        setExpiresAt(formatDateForInput(new Date(license.expiresAt)))
      } else {
        // Режим добавления
        setCategory('B')
        setHasTransmissionRestriction(false)
        const today = new Date()
        setObtainedAt(formatDateForInput(today))
        setExpiresAt(formatDateForInput(addTenYears(today)))
      }
    }
  }, [open, isRenew, license])

  // Автоматическое обновление срока действия при изменении даты получения
  const handleObtainedAtChange = (value: string) => {
    setObtainedAt(value)
    if (value) {
      const obtained = new Date(value)
      setExpiresAt(formatDateForInput(addTenYears(obtained)))
    }
  }

  // Показывать ли опцию ограничения трансмиссии
  const showTransmissionOption = CATEGORIES_WITH_TRANSMISSION.includes(category)

  // Доступные категории (исключая уже добавленные, если режим добавления)
  const availableCategories = isRenew
    ? LICENSE_CATEGORIES // В режиме обновления показываем все
    : LICENSE_CATEGORIES.filter((cat) => !existingCategories.includes(cat))

  const handleOpenChange = (details: { open: boolean }) => {
    onOpenChange(details.open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      category,
      transmissionRestriction: showTransmissionOption && hasTransmissionRestriction ? 'AUTOMATIC' : undefined,
      obtainedAt: new Date(obtainedAt),
      expiresAt: new Date(expiresAt),
    })
  }

  // Валидация дат
  const isValid = obtainedAt && expiresAt && new Date(expiresAt) > new Date(obtainedAt)

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>
                <HStack gap={2}>
                  <LuCreditCard />
                  {isRenew ? 'Обновить права' : 'Добавить водительские права'}
                </HStack>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <form id="license-form" onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  {/* Категория */}
                  <Field.Root required>
                    <Field.Label>Категория</Field.Label>
                    {isRenew ? (
                      <Input value={licenseCategoryLabels[category] || category} disabled />
                    ) : (
                      <NativeSelect.Root disabled={isPending}>
                        <NativeSelect.Field
                          value={category}
                          onChange={(e) => setCategory(e.target.value as LicenseCategory)}
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {licenseCategoryLabels[cat] || cat}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    )}
                    {availableCategories.length === 0 && !isRenew && (
                      <Text fontSize="sm" color="orange.fg">
                        Все категории уже добавлены
                      </Text>
                    )}
                  </Field.Root>

                  {/* Ограничение трансмиссии */}
                  {showTransmissionOption && (
                    <Box p={3} bg="bg.muted" borderRadius="md">
                      <Checkbox.Root
                        checked={hasTransmissionRestriction}
                        onCheckedChange={(e) => setHasTransmissionRestriction(!!e.checked)}
                        disabled={isPending}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>Только {transmissionTypeLabels['AUTOMATIC']} (AT)</Checkbox.Label>
                      </Checkbox.Root>
                      <Text fontSize="xs" color="fg.muted" mt={1}>
                        Отметьте, если в правах стоит ограничение на управление только с автоматической КПП
                      </Text>
                    </Box>
                  )}

                  {/* Даты */}
                  <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                    <Field.Root required>
                      <Field.Label>Дата получения</Field.Label>
                      <Input
                        type="date"
                        value={obtainedAt}
                        onChange={(e) => handleObtainedAtChange(e.target.value)}
                        disabled={isPending}
                      />
                    </Field.Root>

                    <Field.Root required>
                      <Field.Label>Действуют до</Field.Label>
                      <Input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        min={obtainedAt}
                        disabled={isPending}
                      />
                    </Field.Root>
                  </Grid>

                  {/* Подсказка */}
                  {isRenew && (
                    <Box p={3} bg="blue.subtle" borderRadius="md">
                      <Text fontSize="sm" color="blue.fg">
                        После обновления дат статус верификации будет сброшен. Инструктор должен будет проверить
                        обновлённые права при следующем занятии.
                      </Text>
                    </Box>
                  )}
                </VStack>
              </form>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button
                type="submit"
                form="license-form"
                colorPalette="brand"
                loading={isPending}
                disabled={!isValid || (availableCategories.length === 0 && !isRenew)}
              >
                <LuSave />
                {isRenew ? 'Сохранить' : 'Добавить'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
