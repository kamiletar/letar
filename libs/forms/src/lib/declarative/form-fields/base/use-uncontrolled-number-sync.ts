'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * `NumberInput.Root` (Chakra/Ark поверх `@zag-js/number-input`) в полностью контролируемом
 * режиме (проп `value` задан всегда) синхронизирует внутреннее состояние машины через
 * `useBindable` из `@zag-js/react`: пока `value` — контролируемый проп, `context.get("value")`
 * всегда отдаёт именно его, а не то, что реально успело появиться в DOM после клавиши. Запись в
 * DOM (`syncInputElement`) отложена на `requestAnimationFrame`, поэтому при быстром вводе
 * (несколько `Backspace` подряд, как в отчёте бага) React ещё не закоммитил новый проп — и raf
 * перезаписывает поле устаревшим, неотформатированным значением. С группировкой разрядов
 * (`Field.Currency`/`Field.Percentage`) это выглядит как «маска ломается» или «поле сбрасывается»
 * прямо во время редактирования. `Field.Number` тот же механизм не проявлял заметно только
 * потому, что у него `useGrouping: false` и raw-строка почти совпадает с отображаемой.
 *
 * Обход — держать `NumberInput.Root` неконтролируемым (`defaultValue`, без `value`): тогда
 * `useBindable` хранит значение в собственном React `useState`, синхронизированном с DOM без
 * порочного круга через внешний проп. Внешнее значение поля (`field.state.value`) пробрасывается
 * обратно в `NumberInput.Root` только когда оно изменилось НЕ из-за его же `onValueChange`
 * (сброс формы, программный `setFieldValue`, `initialValue` из другого источника) — через
 * remount по `key`, а не через контролируемый `value`.
 *
 * ⚠️ Различать «наше» и «внешнее» изменение простым boolean-флагом (`isInternalUpdate`)
 * недостаточно: `NumberInput.Root` вызывает `onValueChange` и на blur (реформатирование строки
 * без изменения числа) — событие срабатывает, флаг взводится, но поскольку числовое значение не
 * изменилось, React не перерисовывает компонент и эффект, который должен снять флаг, не
 * запускается. Флаг остаётся «взведённым» и ошибочно гасит СЛЕДУЮЩИЙ, уже настоящий внешний
 * сброс. Поэтому вместо флага храним последнее значение, которое отправили наружу сами
 * (`lastSelfValue`), и сравниваем с ним пришедшее `externalValue` — а не полагаемся на то, что
 * между «взвести» и «снять» гарантированно произойдёт ровно один рендер.
 */
export function useUncontrolledNumberSync(externalValue: number | undefined): {
  resetKey: number
  markInternalChange: (value: number | undefined) => void
} {
  const [resetKey, setResetKey] = useState(0)
  const lastSelfValue = useRef(externalValue)
  const prevValue = useRef(externalValue)

  useEffect(() => {
    if (externalValue === lastSelfValue.current) {
      prevValue.current = externalValue
      return
    }
    if (externalValue !== prevValue.current) {
      prevValue.current = externalValue
      setResetKey((key) => key + 1)
    }
  }, [externalValue])

  return {
    resetKey,
    markInternalChange: (value) => {
      lastSelfValue.current = value
    },
  }
}
