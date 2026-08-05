'use client'

import { Box, Grid, IconButton, Input, Text, Tooltip } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { useCallback, useState } from 'react'
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

  // Читаем текущее значение поля формы напрямую (без дублирующего локального
  // состояния) — form.state.values всегда актуален на момент вызова
  const getCurrentTitle = useCallback(() => String((form.state.values as T)[titleName] || ''), [form, titleName])
  const getCurrentSlug = useCallback(() => String((form.state.values as T)[slugName] || ''), [form, slugName])

  const setFieldValue = useCallback(
    <K extends keyof T & string>(name: K, value: T[K]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(form.setFieldValue as any)(name, value)
    },
    [form],
  )

  // Связь активна: slug автоматически генерируется из названия
  const [isLinked, setIsLinked] = useState(() => {
    const title = getCurrentTitle()
    const slug = getCurrentSlug()
    // При создании — связь активна, при редактировании — проверяем совпадение
    if (!isEditing && !slug) {
      return true
    }
    if (title && slug && slugify(title) === slug) {
      return true
    }
    return false
  })

  // Переключение связи
  const toggleLink = useCallback(() => {
    const title = getCurrentTitle()
    if (!isLinked && title) {
      // При включении связи — регенерируем slug
      setFieldValue(slugName, slugify(title) as T[typeof slugName])
    }
    setIsLinked(!isLinked)
  }, [isLinked, getCurrentTitle, setFieldValue, slugName])

  // Регенерация slug
  const regenerateSlug = useCallback(() => {
    const title = getCurrentTitle()
    if (title) {
      setFieldValue(slugName, slugify(title) as T[typeof slugName])
    }
  }, [getCurrentTitle, setFieldValue, slugName])

  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
      {/* Поле названия — зарегистрировано через form.Field, как и все остальные поля формы */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {titleLabel}{' '}
          <Text as="span" color="red.400">
            *
          </Text>
        </Text>
        <form.Field name={titleName}>
          {(field: { state: { value: string }; handleChange: (value: string) => void }) => (
            <Input
              value={field.state.value ?? ''}
              onChange={(e) => {
                const value = e.target.value
                field.handleChange(value)
                if (isLinked) {
                  setFieldValue(slugName, slugify(value) as T[typeof slugName])
                }
              }}
              placeholder={titlePlaceholder}
            />
          )}
        </form.Field>
      </Box>

      {/* Поле slug с кнопками управления — тоже через form.Field */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {slugLabel}{' '}
          <Text as="span" color="red.400">
            *
          </Text>
        </Text>
        <Box position="relative">
          <form.Field name={slugName}>
            {(field: { state: { value: string }; handleChange: (value: string) => void }) => (
              <Input
                value={field.state.value ?? ''}
                onChange={(e) => {
                  // При ручном вводе — отвязываем
                  if (isLinked) {
                    setIsLinked(false)
                  }
                  field.handleChange(e.target.value)
                }}
                placeholder={slugPlaceholder}
                pr="80px"
                fontFamily="mono"
                fontSize="sm"
              />
            )}
          </form.Field>
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
                <IconButton aria-label="Сгенерировать из названия" size="xs" variant="ghost" onClick={regenerateSlug}>
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
