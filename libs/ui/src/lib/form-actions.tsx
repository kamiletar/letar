'use client'

import { Flex, type FlexProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface FormActionsProps extends Omit<FlexProps, 'children'> {
  /** Основное действие формы («Сохранить», «Создать») — стоит справа */
  children: ReactNode
  /** Дополнительное действие («Удалить», «Отмена») — прижато к левому краю */
  secondary?: ReactNode
}

/**
 * Футер формы: основное действие справа, дополнительное слева, отступ от карточки.
 *
 * Единый шаблон для всех форм — раскладка не зависит от того, есть ли вторичное действие
 * (основная кнопка всегда справа) и не размазана по формам вручную (`Flex gap={3}`, `Box mt={2}`,
 * `justify="space-between"` — до введения компонента у каждой формы был свой вариант, а у части
 * футер вообще прилипал к карточке без отступа).
 *
 * Порядок в DOM — основное, затем дополнительное: `Tab` и `Enter` сначала попадают на безопасное
 * действие, а не на «Удалить». Слева-направо их выстраивает `row-reverse`. На узком экране кнопки
 * встают в колонку на всю ширину, основная — сверху (под большой палец).
 *
 * ⚠️ Кнопки внутри должны быть одного `size` — компонент высоту не выравнивает.
 *
 * @example
 * ```tsx
 * <FormActions
 *   secondary={
 *     <TriggerConfirmDialog
 *       trigger={<Button colorPalette="error" variant="outline">Удалить</Button>}
 *       title="Удалить поставщика?"
 *       onConfirm={handleDelete}
 *     />
 *   }
 * >
 *   <AppForm.Button.Submit>Сохранить</AppForm.Button.Submit>
 * </FormActions>
 * ```
 */
export function FormActions({ children, secondary, ...rest }: FormActionsProps) {
  return (
    <Flex
      mt="6"
      gap="3"
      direction={{ base: 'column', md: 'row-reverse' }}
      align={{ base: 'stretch', md: 'center' }}
      justify="space-between"
      {...rest}
    >
      {children}
      {secondary}
    </Flex>
  )
}
