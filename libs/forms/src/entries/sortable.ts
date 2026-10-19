/**
 * `@letar/forms/sortable` — список массива с перетаскиванием элементов. Нужны `@dnd-kit/core`, `@dnd-kit/sortable`,
 * `@dnd-kit/utilities`.
 *
 * `SortableGroupList` — тот же `Form.Group.List`, только сортировка включена всегда (пропа `sortable` нет).
 *
 * @example
 * ```tsx
 * import { SortableGroupList } from '@letar/forms/sortable'
 *
 * <SortableGroupList name="items">
 *   <SortableGroupList.Button.DragHandle />
 *   <AppForm.Field.String name="title" />
 * </SortableGroupList>
 * ```
 */
export { SortableGroupList, type SortableGroupListProps } from '../lib/declarative/form-group/sortable-group-list'
