'use client'

import { useId } from 'react'

/**
 * Пропсы компонента FileTrigger.
 */
export interface FileTriggerProps {
  /**
   * `onChange` нативного `<input type="file">` — тот же сигнатурный контракт, что и у
   * существующих обработчиков в кодовой базе (`useImageUpload().handleFileSelect` и т.п.),
   * поэтому переход на `FileTrigger` не требует менять бизнес-логику выбора файла.
   */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Accept-фильтр нативного input (например `.csv,.txt,.pdf` или `image/*`) */
  accept?: string
  /** Разрешить множественный выбор */
  multiple?: boolean
  /** Отключить триггер и скрытый input */
  disabled?: boolean
  /**
   * Render-prop: получает `htmlFor` для связи с input и обязан вернуть элемент,
   * содержащий `<label htmlFor={htmlFor}>` — см. пример в JSDoc компонента.
   */
  children: (props: { htmlFor: string }) => React.ReactNode
}

/**
 * Триггер выбора файла без нативного `as="label"` (запрещён правилами Chakra UI v3,
 * см. `.claude/rules/components.md`) и без риска вложить `<input>` в `<label>` —
 * скрытый input рендерится самим компонентом как сосед `children`, а не их потомок,
 * поэтому антипаттерн «двойной клик/toggle» структурно невозможен.
 *
 * `children` — render-prop: сам решает, во что обернуть `<label htmlFor={htmlFor}>`
 * (`Button asChild`, `Text asChild`, обычный `<label>` и т.д.) — компонент не навязывает
 * конкретный Chakra-элемент.
 *
 * @example
 * ```tsx
 * <FileTrigger accept=".csv,.txt,.pdf" multiple onChange={handleFileSelect}>
 *   {({ htmlFor }) => (
 *     <Button asChild size="sm" variant="outline" colorPalette="purple">
 *       <label htmlFor={htmlFor}>
 *         <LuPlus />
 *         Выбрать файлы
 *       </label>
 *     </Button>
 *   )}
 * </FileTrigger>
 * ```
 */
export function FileTrigger({ onChange, accept, multiple, disabled, children }: FileTriggerProps) {
  const inputId = useId()

  return (
    <>
      {children({ htmlFor: inputId })}
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        style={{ display: 'none' }}
      />
    </>
  )
}
