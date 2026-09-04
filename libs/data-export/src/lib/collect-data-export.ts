export type CollectorResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

export interface DataExportBundle<TCollectors extends Record<string, () => Promise<unknown>>> {
  generatedAt: Date
  data: { [K in keyof TCollectors]: CollectorResult<Awaited<ReturnType<TCollectors[K]>>> }
}

/**
 * Заповедь №30 студии — «Скачать мои данные» без письма в поддержку. Каждый ключ `collectors` —
 * независимый источник (профиль, заказы, комментарии и т.п.), который приложение само решает
 * собирать и как исключить чужие данные (второй участник сделки, чужие комментарии в ветке).
 * Сбой одного источника не должен обнулять весь экспорт — каждый результат помечен отдельно
 * `ok`/`error`, вызывающая сторона решает, показывать ли частичный экспорт или считать сбоем.
 */
export async function collectDataExport<TCollectors extends Record<string, () => Promise<unknown>>>(
  collectors: TCollectors,
): Promise<DataExportBundle<TCollectors>> {
  const entries = await Promise.all(
    Object.entries(collectors).map(async ([key, collect]) => {
      try {
        const value = await collect()
        return [key, { ok: true, value } satisfies CollectorResult<unknown>] as const
      } catch (error) {
        return [key, { ok: false, error } satisfies CollectorResult<unknown>] as const
      }
    }),
  )

  return {
    generatedAt: new Date(),
    data: Object.fromEntries(entries) as DataExportBundle<TCollectors>['data'],
  }
}
