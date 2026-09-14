'use client'

import { createListCollection } from '@chakra-ui/react'
import { getOptionLabel as getOptionLabelCore, groupOptions } from '@letar/forms-core/uikit'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { GroupableOption } from '../../types'

/**
 * Result of useGroupedOptions hook
 */
export interface GroupedOptionsResult<T = string> {
  /** Collection for Chakra components (Select, Combobox, Listbox) */
  collection: ReturnType<typeof createListCollection<GroupableOption<T>>>
  /** Map groups with options (null if no grouping) */
  groups: Map<string, GroupableOption<T>[]> | null
}

/**
 * Function to get label from an option
 * Used for itemToString in collection and text rendering
 *
 * @example
 * ```tsx
 * // In collection itemToString
 * createListCollection({ items, itemToString: getOptionLabel })
 *
 * // In rendering
 * <Select.ItemText>{getOptionLabel(option)}</Select.ItemText>
 * ```
 */
export function getOptionLabel<T>(item: { label?: string | ReactNode; value: T }): string {
  return getOptionLabelCore(item)
}

/**
 * Hook for creating a collection with optional grouping
 *
 * Encapsulates common logic:
 * - Creating Chakra ListCollection from options
 * - Determining group presence
 * - Grouping options into a Map for rendering
 *
 * @example Usage in Listbox
 * ```tsx
 * const { collection, groups } = useGroupedOptions(options)
 *
 * return (
 *   <Listbox.Root collection={collection}>
 *     {groups
 *       ? Array.from(groups.entries()).map(([name, opts]) => (
 *           <Listbox.ItemGroup key={name}>
 *             <Listbox.ItemGroupLabel>{name}</Listbox.ItemGroupLabel>
 *             {opts.map(opt => <Listbox.Item key={opt.value} item={opt} />)}
 *           </Listbox.ItemGroup>
 *         ))
 *       : options.map(opt => <Listbox.Item key={opt.value} item={opt} />)
 *     }
 *   </Listbox.Root>
 * )
 * ```
 */
export function useGroupedOptions<T = string>(options: GroupableOption<T>[]): GroupedOptionsResult<T> {
  // Grouping (the `group` Map itself) is framework-free logic shared with the Chakra Select
  // primitive (`uikit-chakra.tsx`) — see `@letar/forms-core/uikit` `groupOptions`. Only the
  // Ark UI `ListCollection` below is Chakra-specific and stays local to this hook.
  const groups = useMemo(() => groupOptions(options), [options])

  const collection = useMemo(
    () =>
      createListCollection({
        items: options,
        itemToString: getOptionLabel,
        itemToValue: (item) => item.value as string,
        isItemDisabled: (item: GroupableOption<T>) => item.disabled ?? false,
        ...(groups && {
          groupBy: (item: GroupableOption<T>) => item.group ?? '',
        }),
      }),
    [options, groups],
  )

  return { collection, groups }
}
