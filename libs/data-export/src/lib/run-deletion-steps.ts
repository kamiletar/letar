export interface DeletionStep {
  name: string
  /** Обезличивает или физически удаляет — решает приложение по своим юридическим срокам хранения. */
  run: () => Promise<void>
}

export type DeletionStepOutcome = { name: string; ok: true } | { name: string; ok: false; error: unknown }

/**
 * Заповедь №30 — «Удалить аккаунт» одной кнопкой, но не каскадный `DELETE User`: заказы, счета,
 * платежи по 152-ФЗ обязаны пережить аккаунт (бухучёт — 5 лет), там нужно обезличивание, а не
 * удаление. Приложение описывает это списком шагов, каждый сам решает свою природу.
 * Шаги выполняются последовательно (не параллельно) — типичный порядок «отвязать связи → затем
 * обезличить/удалить владельца» требует, чтобы более ранние шаги завершились раньше поздних.
 * Сбой одного шага не прерывает остальные — вызывающая сторона видит полный список исходов и
 * решает, что доделать вручную/повторить.
 */
export async function runDeletionSteps(steps: readonly DeletionStep[]): Promise<DeletionStepOutcome[]> {
  const outcomes: DeletionStepOutcome[] = []

  for (const step of steps) {
    try {
      await step.run()
      outcomes.push({ name: step.name, ok: true })
    } catch (error) {
      outcomes.push({ name: step.name, ok: false, error })
    }
  }

  return outcomes
}
