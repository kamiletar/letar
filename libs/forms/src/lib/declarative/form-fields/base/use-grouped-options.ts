'use client'

import { createListCollection } from '@chakra-ui/react'
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
  return typeof item.label === 'string' ? item.label : String(item.value)
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
  // Create collection with optional grouping
  const collection = useMemo(() => {
    const hasGroups = options.some((opt) => opt.group)

    return createListCollection({
      items: options,
      itemToString: getOptionLabel,
      itemToValue: (item) => item.value as string,
      isItemDisabled: (item: GroupableOption<T>) => item.disabled ?? false,
      ...(hasGroups && {
        groupBy: (item: GroupableOption<T>) => item.group ?? '',
      }),
    })
  }, [options])

  // Check for groups and create Map
  const groups = useMemo(() => {
    const hasGroups = options.some((opt) => opt.group)
    if (!hasGroups) {
      return null
    }

    const groupMap = new Map<string, GroupableOption<T>[]>()
    for (const opt of options) {
      const group = opt.group ?? ''
      const existing = groupMap.get(group) ?? []
      groupMap.set(group, [...existing, opt])
    }
    return groupMap
  }, [options])

  return { collection, groups }
}
