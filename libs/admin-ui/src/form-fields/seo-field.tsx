'use client'

import { Box, IconButton, Input, Stack, Text, Textarea, Tooltip } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuCopy, LuLink, LuLink2Off } from 'react-icons/lu'

interface SeoFieldProps<T extends Record<string, unknown>> {
  /** Имя поля с заголовком/названием (источник для metaTitle) */
  titleSourceName: keyof T & string
  /** Имя поля с описанием (источник для metaDescription) */
  descriptionSourceName: keyof T & string
  /** Имя поля metaTitle */
  metaTitleName: keyof T & string
  /** Имя поля metaDescription */
  metaDescriptionName: keyof T & string
  /** Label для metaTitle */
  metaTitleLabel?: string
  /** Label для metaDescription */
  metaDescriptionLabel?: string
  /** Placeholder для metaTitle */
  metaTitlePlaceholder?: string
  /** Placeholder для metaDescription */
  metaDescriptionPlaceholder?: string
  /** Режим редактирования (поля уже заполнены) */
  isEditing?: boolean
  /** Максимальная длина metaTitle (по умолчанию 60) */
  maxTitleLength?: number
  /** Максимальная длина metaDescription (по умолчанию 160) */
  maxDescriptionLength?: number
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Связанные SEO поля с автокопированием из основных полей.
 *
 * Интегрируется с формой через useDeclarativeForm.
 *
 * - Кнопка копирования позволяет скопировать значение из title в metaTitle
 * - Кнопка копирования позволяет скопировать значение из description в metaDescription
 * - Можно привязать поля для автоматического обновления
 * - Показывает счётчик символов для SEO оптимизации
 *
 * @example
 * ```tsx
 * <SeoField<CreateMandalaInput>
 *   titleSourceName="name"
 *   descriptionSourceName="description"
 *   metaTitleName="metaTitle"
 *   metaDescriptionName="metaDescription"
 *   isEditing={!!mandala}
 * />
 * ```
 */
export function SeoField<T extends Record<string, unknown>>({
  titleSourceName,
  descriptionSourceName,
  metaTitleName,
  metaDescriptionName,
  metaTitleLabel = 'Meta Title',
  metaDescriptionLabel = 'Meta Description',
  metaTitlePlaceholder = 'SEO заголовок',
  metaDescriptionPlaceholder = 'SEO описание',
  isEditing = false,
  maxTitleLength = 60,
  maxDescriptionLength = 160,
  colorPalette = 'purple',
}: SeoFieldProps<T>) {
  const { form } = useDeclarativeForm()

  // Типизированные хелперы для работы с формой
  const setFieldValue = useCallback(
    <K extends keyof T & string>(name: K, value: T[K]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(form.setFieldValue as any)(name, value)
    },
    [form]
  )

  const getValues = useCallback(() => form.state.values as unknown as T, [form])

  // Локальное состояние для контролируемых инпутов
  const [metaTitleValue, setMetaTitleValue] = useState(() => String(getValues()[metaTitleName] || ''))
  const [metaDescriptionValue, setMetaDescriptionValue] = useState(() => String(getValues()[metaDescriptionName] || ''))

  // Связь активна: поля автоматически обновляются из источника
  // Для новых записей включена по умолчанию, для редактирования — проверяем совпадение
  const [isTitleLinked, setIsTitleLinked] = useState(() => {
    if (!isEditing) {
      return true
    }
    const initial = getValues()
    const source = String(initial[titleSourceName] || '')
    const meta = String(initial[metaTitleName] || '')
    return source && meta && source === meta
  })

  const [isDescriptionLinked, setIsDescriptionLinked] = useState(() => {
    if (!isEditing) {
      return true
    }
    const initial = getValues()
    const source = String(initial[descriptionSourceName] || '')
    const meta = String(initial[metaDescriptionName] || '')
    // Для description проверяем начало (может быть обрезан)
    return source && meta && source.startsWith(meta.slice(0, 50))
  })

  const lastSourceTitle = useRef<string>('')
  const lastSourceDescription = useRef<string>('')

  // Копирование title в metaTitle
  const copyTitle = useCallback(() => {
    const values = getValues()
    const source = String(values[titleSourceName] || '')
    if (source) {
      const truncated = source.slice(0, maxTitleLength)
      setMetaTitleValue(truncated)
      setFieldValue(metaTitleName, truncated as T[typeof metaTitleName])
    }
  }, [titleSourceName, metaTitleName, maxTitleLength, getValues, setFieldValue])

  // Копирование description в metaDescription
  const copyDescription = useCallback(() => {
    const values = getValues()
    const source = String(values[descriptionSourceName] || '')
    if (source) {
      // Удаляем HTML теги и обрезаем до лимита
      const plainText = source.replace(/<[^>]*>/g, '').trim()
      const truncated = plainText.slice(0, maxDescriptionLength)
      setMetaDescriptionValue(truncated)
      setFieldValue(metaDescriptionName, truncated as T[typeof metaDescriptionName])
    }
  }, [descriptionSourceName, metaDescriptionName, maxDescriptionLength, getValues, setFieldValue])

  // Переключение связи title
  const toggleTitleLink = useCallback(() => {
    if (!isTitleLinked) {
      copyTitle()
    }
    setIsTitleLinked(!isTitleLinked)
  }, [isTitleLinked, copyTitle])

  // Переключение связи description
  const toggleDescriptionLink = useCallback(() => {
    if (!isDescriptionLinked) {
      copyDescription()
    }
    setIsDescriptionLinked(!isDescriptionLinked)
  }, [isDescriptionLinked, copyDescription])

  // Обработка изменения metaTitle
  const handleMetaTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (isTitleLinked) {
        setIsTitleLinked(false)
      }
      setMetaTitleValue(value)
      setFieldValue(metaTitleName, value as T[typeof metaTitleName])
    },
    [metaTitleName, isTitleLinked, setFieldValue]
  )

  // Обработка изменения metaDescription
  const handleMetaDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (isDescriptionLinked) {
        setIsDescriptionLinked(false)
      }
      setMetaDescriptionValue(value)
      setFieldValue(metaDescriptionName, value as T[typeof metaDescriptionName])
    },
    [metaDescriptionName, isDescriptionLinked, setFieldValue]
  )

  // Автоматическое обновление при связи
  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values as T
      const sourceTitle = String(values[titleSourceName] || '')
      const sourceDescription = String(values[descriptionSourceName] || '')

      // Автообновление metaTitle если связь активна
      if (isTitleLinked && sourceTitle !== lastSourceTitle.current) {
        lastSourceTitle.current = sourceTitle
        const truncated = sourceTitle.slice(0, maxTitleLength)
        setMetaTitleValue(truncated)
        setFieldValue(metaTitleName, truncated as T[typeof metaTitleName])
      }

      // Автообновление metaDescription если связь активна
      if (isDescriptionLinked && sourceDescription !== lastSourceDescription.current) {
        lastSourceDescription.current = sourceDescription
        const plainText = sourceDescription.replace(/<[^>]*>/g, '').trim()
        const truncated = plainText.slice(0, maxDescriptionLength)
        setMetaDescriptionValue(truncated)
        setFieldValue(metaDescriptionName, truncated as T[typeof metaDescriptionName])
      }

      // Синхронизация локального состояния при внешних изменениях
      const formMetaTitle = String(values[metaTitleName] || '')
      const formMetaDescription = String(values[metaDescriptionName] || '')

      if (!isTitleLinked && formMetaTitle !== metaTitleValue) {
        setMetaTitleValue(formMetaTitle)
      }
      if (!isDescriptionLinked && formMetaDescription !== metaDescriptionValue) {
        setMetaDescriptionValue(formMetaDescription)
      }
    })

    // TanStack Store v0.9+ возвращает объект { unsubscribe }, а не функцию
    return () => unsubscribe.unsubscribe()
  }, [
    form,
    titleSourceName,
    descriptionSourceName,
    metaTitleName,
    metaDescriptionName,
    isTitleLinked,
    isDescriptionLinked,
    maxTitleLength,
    maxDescriptionLength,
    metaTitleValue,
    metaDescriptionValue,
    setFieldValue,
  ])

  // Цвет счётчика в зависимости от длины
  const getTitleCountColor = () => {
    if (metaTitleValue.length > maxTitleLength) {
      return 'red.400'
    }
    if (metaTitleValue.length > maxTitleLength * 0.9) {
      return 'yellow.400'
    }
    return 'gray.500'
  }

  const getDescriptionCountColor = () => {
    if (metaDescriptionValue.length > maxDescriptionLength) {
      return 'red.400'
    }
    if (metaDescriptionValue.length > maxDescriptionLength * 0.9) {
      return 'yellow.400'
    }
    return 'gray.500'
  }

  return (
    <Stack gap={4}>
      {/* Meta Title */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {metaTitleLabel}
        </Text>
        <Box position="relative">
          <Input value={metaTitleValue} onChange={handleMetaTitleChange} placeholder={metaTitlePlaceholder} pr="80px" />
          <Box position="absolute" right={1} top="50%" transform="translateY(-50%)" display="flex" gap={1}>
            {/* Кнопка связи */}
            <Tooltip.Root positioning={{ placement: 'top' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton
                  aria-label={isTitleLinked ? 'Отвязать от названия' : 'Привязать к названию'}
                  size="xs"
                  variant={isTitleLinked ? 'solid' : 'ghost'}
                  colorPalette={isTitleLinked ? colorPalette : 'gray'}
                  onClick={toggleTitleLink}
                >
                  {isTitleLinked ? <LuLink size={14} /> : <LuLink2Off size={14} />}
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>{isTitleLinked ? 'Привязано к названию' : 'Редактируется вручную'}</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>

            {/* Кнопка копирования */}
            <Tooltip.Root positioning={{ placement: 'top' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton aria-label="Скопировать из названия" size="xs" variant="ghost" onClick={copyTitle}>
                  <LuCopy size={14} />
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>Скопировать из названия</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Box>
        </Box>
        <Text fontSize="xs" color={getTitleCountColor()} mt={1} textAlign="right">
          {metaTitleValue.length}/{maxTitleLength}
        </Text>
      </Box>

      {/* Meta Description */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {metaDescriptionLabel}
        </Text>
        <Box position="relative">
          <Textarea
            value={metaDescriptionValue}
            onChange={handleMetaDescriptionChange}
            placeholder={metaDescriptionPlaceholder}
            pr="80px"
            rows={2}
            resize="vertical"
          />
          <Box position="absolute" right={1} top={2} display="flex" gap={1}>
            {/* Кнопка связи */}
            <Tooltip.Root positioning={{ placement: 'top' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton
                  aria-label={isDescriptionLinked ? 'Отвязать от описания' : 'Привязать к описанию'}
                  size="xs"
                  variant={isDescriptionLinked ? 'solid' : 'ghost'}
                  colorPalette={isDescriptionLinked ? colorPalette : 'gray'}
                  onClick={toggleDescriptionLink}
                >
                  {isDescriptionLinked ? <LuLink size={14} /> : <LuLink2Off size={14} />}
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {isDescriptionLinked ? 'Привязано к описанию' : 'Редактируется вручную'}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>

            {/* Кнопка копирования */}
            <Tooltip.Root positioning={{ placement: 'top' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton aria-label="Скопировать из описания" size="xs" variant="ghost" onClick={copyDescription}>
                  <LuCopy size={14} />
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>Скопировать из описания</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Box>
        </Box>
        <Text fontSize="xs" color={getDescriptionCountColor()} mt={1} textAlign="right">
          {metaDescriptionValue.length}/{maxDescriptionLength}
        </Text>
      </Box>
    </Stack>
  )
}
