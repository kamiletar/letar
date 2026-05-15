'use client'

import { Box, Button, CloseButton, Dialog, Field, HStack, Input, Portal, Textarea, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuSave } from 'react-icons/lu'

/**
 * Данные нового товара
 */
export interface ProductFormData {
  name: string
  articleCode: string
  gtin: string
  composition?: string
  color?: string
  size?: string
}

interface ProductFormDialogProps {
  /** Диалог открыт */
  open: boolean
  /** Закрытие диалога */
  onClose: () => void
  /** Сохранение товара */
  onSave: (data: ProductFormData) => Promise<void>
  /** Предзаполненный GTIN */
  gtin?: string
}

/**
 * Модальная форма для ввода нового товара
 */
export function ProductFormDialog({ open, onClose, onSave, gtin = '' }: ProductFormDialogProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    articleCode: '',
    gtin,
    composition: '',
    color: '',
    size: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Обновление поля формы
  const updateField = useCallback((field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  // Сохранение
  const handleSave = useCallback(async () => {
    // Валидация
    if (!formData.name.trim()) {
      setError('Укажите название товара')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave({ ...formData, gtin })
      onClose()
      // Сброс формы
      setFormData({
        name: '',
        articleCode: '',
        gtin: '',
        composition: '',
        color: '',
        size: '',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }, [formData, gtin, onSave, onClose])

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Новый товар</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* GTIN (только чтение) */}
                <Field.Root>
                  <Field.Label>GTIN</Field.Label>
                  <Input value={gtin} readOnly fontFamily="mono" bg="gray.50" _dark={{ bg: 'gray.800' }} />
                </Field.Root>

                {/* Название товара */}
                <Field.Root required>
                  <Field.Label>Название товара *</Field.Label>
                  <Input
                    placeholder="Галстук мужской классический"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    autoFocus
                  />
                </Field.Root>

                {/* Артикул */}
                <Field.Root>
                  <Field.Label>Артикул</Field.Label>
                  <Input
                    placeholder="АРТ-12345"
                    value={formData.articleCode}
                    onChange={(e) => updateField('articleCode', e.target.value)}
                  />
                </Field.Root>

                {/* Состав */}
                <Field.Root>
                  <Field.Label>Состав</Field.Label>
                  <Textarea
                    placeholder="100% полиэстер"
                    value={formData.composition}
                    onChange={(e) => updateField('composition', e.target.value)}
                    rows={2}
                  />
                </Field.Root>

                <HStack gap={4}>
                  {/* Цвет */}
                  <Field.Root flex={1}>
                    <Field.Label>Цвет</Field.Label>
                    <Input
                      placeholder="Синий"
                      value={formData.color}
                      onChange={(e) => updateField('color', e.target.value)}
                    />
                  </Field.Root>

                  {/* Размер */}
                  <Field.Root flex={1}>
                    <Field.Label>Размер</Field.Label>
                    <Input
                      placeholder="XL"
                      value={formData.size}
                      onChange={(e) => updateField('size', e.target.value)}
                    />
                  </Field.Root>
                </HStack>

                {/* Ошибка */}
                {error && (
                  <Box p={2} bg="red.50" _dark={{ bg: 'red.900/20' }} borderRadius="md" color="red.600">
                    {error}
                  </Box>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="outline" onClick={onClose} disabled={isSaving}>
                  Отмена
                </Button>
                <Button colorPalette="green" onClick={handleSave} loading={isSaving}>
                  <LuSave />
                  Сохранить
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
