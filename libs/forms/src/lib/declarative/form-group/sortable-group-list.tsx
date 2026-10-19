'use client'

import type { ReactElement } from 'react'
import type { FormGroupListDeclarativeProps } from '../types'
import { ListButtonAdd, ListButtonRemove } from './form-group-list-buttons'
import { FormGroupListBase } from './form-group-list-declarative'
import { DragHandle, SortableItem, SortableWrapper } from './form-group-list-sortable'

/** Пропсы `SortableGroupList`: те же, что у `Form.Group.List`, кроме `sortable` (сортировка включена всегда) */
export type SortableGroupListProps = Omit<FormGroupListDeclarativeProps, 'sortable'>

function SortableGroupListRoot(props: SortableGroupListProps): ReactElement {
  return <FormGroupListBase {...props} ListWrapper={SortableWrapper} ItemWrapper={SortableItem} />
}

/**
 * Список массива с перетаскиванием элементов (`@dnd-kit/*`): тот же `Form.Group.List`, но с обёртками dnd-kit.
 * Подключается отдельным импортом, поэтому `@dnd-kit/*` нужны только тем приложениям, где такой список есть.
 *
 * Внутри строки доступны `SortableGroupList.Button.Add`, `.Remove` и `.DragHandle` (ручка перетаскивания).
 *
 * @example
 * ```tsx
 * import { SortableGroupList } from '@letar/forms/sortable'
 *
 * <AppForm initialValue={data} onSubmit={save}>
 *   <SortableGroupList name="items">
 *     <HStack>
 *       <SortableGroupList.Button.DragHandle />
 *       <AppForm.Field.String name="title" />
 *       <SortableGroupList.Button.Remove />
 *     </HStack>
 *   </SortableGroupList>
 * </AppForm>
 * ```
 */
export const SortableGroupList = Object.assign(SortableGroupListRoot, {
  Button: {
    Add: ListButtonAdd,
    Remove: ListButtonRemove,
    DragHandle,
  },
})
