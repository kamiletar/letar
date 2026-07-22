'use client'

import { Box, Grid, IconButton, Input, Text, Tooltip } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuLink, LuLink2Off, LuRefreshCw } from 'react-icons/lu'
import { slugify } from '../utils/slugify'

interface SlugFieldProps<T extends Record<string, unknown>> {
  /** Имя поля с названием в форме */
  titleName: keyof T & string
  /** Имя поля со slug в форме */
  slugName: keyof T & string
  /** Label для поля названия */
  titleLabel?: string
  /** Label для поля slug */
  slugLabel?: string
  /** Placeholder для названия */
  titlePlaceholder?: string
  /** Placeholder для slug */
  slugPlaceholder?: string
  /** Режим редактирования (slug уже существует) */
  isEditing?: boolean
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Связанные поля Title и Slug с автогенерацией.
 *
 * Интегрируется с формой через useDeclarativeForm.
 *
 * - При вводе названия slug генерируется автоматически (пока связь активна)
 * - Можно отвязать slug и редактировать вручную
 * - Кнопка регенерации для пересоздания slug из текущего названия
 *
 * @example
 * ```tsx
 * <SlugField<CreateMandalaInput>
 *   titleName="name"
 *   slugName="slug"
 *   titleLabel="Название"
 *   isEditing={!!mandala}
 * />
 * ```
 */
export function SlugField<T extends Record<string, unknown>>({
  titleName,
  slugName,
  titleLabel = 'Название',
  slugLabel = 'Slug',
  titlePlaceholder = 'Введите название',
  slugPlaceholder = 'auto-generated-slug',
  isEditing = false,
  colorPalette = 'purple',
}: SlugFieldProps<T>) {
  const { form } = useDeclarativeForm()

  // Типизированные хелперы для работы с формой
  const setFieldValue = useCallback(
    <K extends keyof T & string>(name: K, value: T[K]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(form.setFieldValue as any)(name, value)
    },
    [form],
  )

  const getValues = useCallback(() => form.state.values as unknown as T, [form])

  // Локальное состояние для контролируемых инпутов
  const [titleValue, setTitleValue] = useState(() => String(getValues()[titleName] || ''))
  const [slugValue, setSlugValue] = useState(() => String(getValues()[slugName] || ''))

  // Связь активна: slug автоматически генерируется из названия
  const [isLinked, setIsLinked] = useState(() => {
    const initial = getValues()
    const title = String(initial[titleName] || '')
    const slug = String(initial[slugName] || '')
    // При создании — связь активна, при редактировании — проверяем совпадение
    if (!isEditing && !slug) {
      return true
    }
    if (title && slug && slugify(title) === slug) {
      return true
    }
    return false
  })

  const lastGeneratedSlug = useRef<string>('')

  // Синхронизация с формой при изменении title
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setTitleValue(value)
      setFieldValue(titleName, value as T[typeof titleName])

      // Автогенерация slug если связь активна
      if (isLinked) {
        const newSlug = slugify(value)
        lastGeneratedSlug.current = newSlug
        setSlugValue(newSlug)
        setFieldValue(slugName, newSlug as T[typeof slugName])
      }
    },
    [titleName, slugName, isLinked, setFieldValue],
  )

  // Синхронизация с формой при изменении slug
  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // При ручном вводе — отвязываем
      if (isLinked) {
        setIsLinked(false)
      }
      setSlugValue(value)
      setFieldValue(slugName, value as T[typeof slugName])
    },
    [slugName, isLinked, setFieldValue],
  )

  // Переключение связи
  const toggleLink = useCallback(() => {
    if (!isLinked && titleValue) {
      // При включении связи — регенерируем slug
      const newSlug = slugify(titleValue)
      lastGeneratedSlug.current = newSlug
      setSlugValue(newSlug)
      setFieldValue(slugName, newSlug as T[typeof slugName])
    }
    setIsLinked(!isLinked)
  }, [isLinked, titleValue, slugName, setFieldValue])

  // Регенерация slug
  const regenerateSlug = useCallback(() => {
    if (titleValue) {
      const newSlug = slugify(titleValue)
      lastGeneratedSlug.current = newSlug
      setSlugValue(newSlug)
      setFieldValue(slugName, newSlug as T[typeof slugName])
    }
  }, [titleValue, slugName, setFieldValue])

  // Синхронизация при сбросе формы (например, после успешной отправки)
  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values as T
      const formTitle = String(values[titleName] || '')
      const formSlug = String(values[slugName] || '')

      // Обновляем локальное состояние только если значения изменились извне
      if (formTitle !== titleValue) {
        setTitleValue(formTitle)
      }
      if (formSlug !== slugValue) {
        setSlugValue(formSlug)
      }
    })

    // TanStack Store v0.9+ возвращает объект { unsubscribe }, а не функцию
    return () => unsubscribe.unsubscribe()
  }, [form, titleName, slugName, titleValue, slugValue])

  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
      {/* Поле названия */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {titleLabel}{' '}
          <Text as="span" color="red.400">
            *
          </Text>
        </Text>
        <Input value={titleValue} onChange={handleTitleChange} placeholder={titlePlaceholder} />
      </Box>

      {/* Поле slug с кнопками управления */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {slugLabel}{' '}
          <Text as="span" color="red.400">
            *
          </Text>
        </Text>
        <Box position="relative">
          <Input
            value={slugValue}
            onChange={handleSlugChange}
            placeholder={slugPlaceholder}
            pr="80px"
            fontFamily="mono"
            fontSize="sm"
          />
          <Box position="absolute" right={1} top="50%" transform="translateY(-50%)" display="flex" gap={1}>
            {/* Кнопка связи */}
            <Tooltip.Root positioning={{ placement: 'top' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton
                  aria-label={isLinked ? 'Отвязать от названия' : 'Привязать к названию'}
                  size="xs"
                  variant={isLinked ? 'solid' : 'ghost'}
                  colorPalette={isLinked ? colorPalette : 'gray'}
                  onClick={toggleLink}
                >
                  {isLinked ? <LuLink size={14} /> : <LuLink2Off size={14} />}
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {isLinked ? 'Slug привязан к названию' : 'Slug редактируется вручную'}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>

            {/* Кнопка регенерации */}
            <Tooltip.Root positioning={{ placement: 'top' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton
                  aria-label="Сгенерировать из названия"
                  size="xs"
                  variant="ghost"
                  onClick={regenerateSlug}
                  disabled={!titleValue}
                >
                  <LuRefreshCw size={14} />
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>Сгенерировать из названия</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Box>
        </Box>
      </Box>
    </Grid>
  )
}
