'use client'

import type { ListCollection } from '@chakra-ui/react'
import { Portal, Select } from '@chakra-ui/react'
import type { ComponentProps } from 'react'

// SelectRoot с HiddenSelect для работы с формами
// Generic тип T для поддержки типизированных коллекций
interface SelectRootProps<T extends { value: string; label?: string } = { value: string; label: string }> extends Omit<
  ComponentProps<typeof Select.Root>,
  'collection'
> {
  children: React.ReactNode
  collection: ListCollection<T>
}

export function SelectRoot<T extends { value: string; label?: string } = { value: string; label: string }>({
  children,
  ...props
}: SelectRootProps<T>) {
  return (
    <Select.Root {...props}>
      <Select.HiddenSelect />
      {children}
    </Select.Root>
  )
}

export const SelectTrigger = Select.Trigger
export const SelectValueText = Select.ValueText
export const SelectIndicator = Select.Indicator
export const SelectClearTrigger = Select.ClearTrigger
export const SelectControl = Select.Control

// SelectContent с Portal и Positioner
interface SelectContentProps extends ComponentProps<typeof Select.Content> {
  children: React.ReactNode
}

export function SelectContent({ children, ...props }: SelectContentProps) {
  return (
    <Portal>
      <Select.Positioner>
        <Select.Content {...props}>{children}</Select.Content>
      </Select.Positioner>
    </Portal>
  )
}

export const SelectItem = Select.Item
export const SelectItemText = Select.ItemText
export const SelectItemIndicator = Select.ItemIndicator
