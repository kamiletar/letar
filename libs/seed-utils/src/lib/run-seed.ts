/**
 * Безопасный запуск `prisma/seed.ts`.
 *
 * НЕ звать безусловный `process.exit(0)` в `.finally()` после `main().catch()` — пока открыт
 * `pg.Pool`/Prisma-клиент, event loop жив, `.finally()` успевает отработать ПОСЛЕ `.catch()`
 * и перебивает код выхода 1 обратно на 0, маскируя любую ошибку сида как успех в деплой-логе.
 * `process.exitCode` только помечает код выхода, не завершает процесс — Node выходит сам после
 * `disconnect()`.
 *
 * Найден и исправлен независимо трижды (kami, domwellbes, studio, 2026-08-21) — вынесен сюда,
 * чтобы новые `seed.ts` не повторяли ту же ошибку.
 */
export async function runSeed(main: () => Promise<void>, disconnect: () => Promise<void>): Promise<void> {
  await main()
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => disconnect())
}
