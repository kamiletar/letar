'use client'

/**
 * Listbox для множественного выбора категорий прав
 *
 * Два варианта использования:
 * 1. Контролируемый (value/onChange) - для ручного state management
 * 2. TanStack Form (name) - интеграция с формой через FieldListbox
 *
 * @example Контролируемый
 * ```tsx
 * <ListboxLicenseCategories
 *   value={categories}
 *   onChange={setCategories}
 * />
 * ```
 *
 * @example С TanStack Form
 * ```tsx
 * <DrivingSchoolForm.Listbox.LicenseCategories name="licenseCategories" />
 * ```
 */

import { ALL_LICENSE_CATEGORIES, getCategoryDescription } from '@/lib/license-categories'
import { Box, Checkmark, createListCollection, Listbox, Text, useListboxItemContext, VStack } from '@chakra-ui/react'
import { FieldListbox, type ListboxOption } from '@letar/forms'
import { type ReactElement, useMemo } from 'react'

interface BaseProps {
  /** Заголовок */
  label?: string
  /** Подсказка */
  helperText?: string
  /** Отключить */
  disabled?: boolean
  /** Максимальная высота списка */
  maxHeight?: string
  /** Ограничить список только этими категориями (пустой массив = все) */
  allowedCategories?: string[]
}

interface ControlledProps extends BaseProps {
  /** Выбранные категории */
  value: string[]
  /** Callback при изменении */
  onChange: (value: string[]) => void
  /** Имя поля (для TanStack Form) - не используется в контролируемом режиме */
  name?: never
}

interface FormProps extends BaseProps {
  /** Имя поля для TanStack Form */
  name?: string
  /** Не используется в form режиме */
  value?: never
  /** Не используется в form режиме */
  onChange?: never
}

type ListboxLicenseCategoriesProps = ControlledProps | FormProps

/**
 * Checkmark для элемента списка
 */
function ListboxItemCheckmark() {
  const itemState = useListboxItemContext()
  return <Checkmark filled size="sm" checked={itemState.selected} disabled={itemState.disabled} />
}

/**
 * Коллекция категорий прав с описаниями
 * @param allowedCategories — если передан непустой массив, показывать только эти категории
 */
function useLicenseCategoriesCollection(allowedCategories?: string[]) {
  return useMemo(() => {
    const categories =
      allowedCategories && allowedCategories.length > 0
        ? ALL_LICENSE_CATEGORIES.filter((cat) => allowedCategories.includes(cat))
        : ALL_LICENSE_CATEGORIES

    return createListCollection({
      items: categories.map((cat) => ({
        value: cat,
        label: cat,
        description: getCategoryDescription(cat),
      })),
    })
  }, [allowedCategories])
}

/**
 * Listbox для множественного выбора категорий прав
 */
export function ListboxLicenseCategories(props: ListboxLicenseCategoriesProps): ReactElement {
  // Если есть value/onChange - контролируемый режим
  if ('value' in props && props.value !== undefined) {
    return <ListboxLicenseCategoriesControlled {...(props as ControlledProps)} />
  }

  // Иначе - режим TanStack Form через FieldListbox
  return <ListboxLicenseCategoriesForm {...(props as FormProps)} />
}

/**
 * Контролируемая версия с кастомным рендерингом (checkmarks + descriptions)
 */
function ListboxLicenseCategoriesControlled({
  value,
  onChange,
  label = 'Категории прав',
  helperText = 'Выберите все категории, по которым обучаете',
  disabled,
  maxHeight = '300px',
  allowedCategories,
}: ControlledProps): ReactElement {
  const collection = useLicenseCategoriesCollection(allowedCategories)

  return (
    <VStack align="stretch" gap={2}>
      <Listbox.Root
        collection={collection}
        value={value}
        onValueChange={(details) => onChange(details.value)}
        selectionMode="multiple"
        disabled={disabled}
      >
        {label && (
          <Listbox.Label fontWeight="medium" mb={1}>
            {label}
          </Listbox.Label>
        )}
        <Listbox.Content maxH={maxHeight}>
          {collection.items.map((item) => (
            <Listbox.Item item={item} key={item.value}>
              <ListboxItemCheckmark />
              <Box flex="1">
                <Listbox.ItemText fontWeight="medium">{item.label}</Listbox.ItemText>
                <Text fontSize="xs" color="fg.muted">
                  {item.description}
                </Text>
              </Box>
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      {helperText && (
        <Text fontSize="sm" color="fg.muted">
          {helperText}
        </Text>
      )}
    </VStack>
  )
}

/**
 * TanStack Form версия через FieldListbox
 */
function ListboxLicenseCategoriesForm({
  name,
  label = 'Категории прав',
  helperText = 'Выберите все категории, по которым обучаете',
  disabled,
  maxHeight = '300px',
  allowedCategories,
}: FormProps): ReactElement {
  const categories =
    allowedCategories && allowedCategories.length > 0
      ? ALL_LICENSE_CATEGORIES.filter((cat) => allowedCategories.includes(cat))
      : ALL_LICENSE_CATEGORIES

  const options: ListboxOption<string>[] = categories.map((cat) => ({
    value: cat,
    label: `${cat} — ${getCategoryDescription(cat)}`,
  }))

  return (
    <FieldListbox
      name={name}
      label={label}
      helperText={helperText}
      disabled={disabled}
      options={options}
      selectionMode="multiple"
      maxHeight={maxHeight}
    />
  )
}
