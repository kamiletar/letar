/**
 * In-memory подмена `prisma.verification` / `prisma.user` для тестов PIN-потоков mandala.
 *
 * Схема mandala (в отличие от driving-school) не разносит PIN/ссылку/auto-login токен по
 * отдельным записям с полем `type` — всё живёт в ОДНОЙ строке на identifier=email, с
 * pin/pinExpires/pinAttempts прямо на ней (см. `schema.zmodel` → model Verification).
 *
 * Каждая операция уступает очередь микрозадач перед выполнением — так параллельные вызовы
 * (`Promise.all`) реально перемежаются, и тесты ловят гонки check-then-act. `update()` делает
 * это ровно один раз (yield → синхронное чтение текущего значения → синхронная запись) — это
 * симулирует атомарность `UPDATE ... SET x = x + 1` на уровне строки Postgres: между чтением
 * и записью внутри ОДНОГО вызова `update()` никакой другой вызов вклиниться не может.
 */

export interface VerificationRow {
  id: string
  identifier: string
  value: string
  expiresAt: Date
  pin: string | null
  pinExpires: Date | null
  pinAttempts: number
  createdAt: Date
}

export interface UserRow {
  id: string
  email: string
  emailVerified: boolean
  name?: string | null
}

type Where = Record<string, unknown>

const yieldTurn = () => Promise.resolve().then(() => undefined)

function matches(row: object, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const val = (row as Record<string, unknown>)[key]
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as { lt?: Date; gt?: Date }
      if (c.lt) {
        return (val as Date) < c.lt
      }
      if (c.gt) {
        return (val as Date) > c.gt
      }
    }
    return val === cond
  })
}

function createFakePrisma() {
  const verifications: VerificationRow[] = []
  const users: UserRow[] = []
  let seq = 0

  const verification = {
    async findFirst({ where, orderBy }: { where: Where; orderBy?: { expiresAt: 'asc' | 'desc' } }) {
      await yieldTurn()
      const found = verifications.filter((r) => matches(r, where))
      if (orderBy) {
        found.sort((a, b) => (a.expiresAt.getTime() - b.expiresAt.getTime()) * (orderBy.expiresAt === 'desc' ? -1 : 1))
      }
      return found[0] ? { ...found[0] } : null
    },
    async findUnique({ where }: { where: Where }) {
      await yieldTurn()
      const found = verifications.find((r) => matches(r, where))
      return found ? { ...found } : null
    },
    async create(
      { data }: { data: Partial<VerificationRow> & { identifier: string; value: string; expiresAt: Date } },
    ) {
      await yieldTurn()
      if (verifications.some((r) => r.value === data.value)) {
        throw Object.assign(new Error('Unique constraint failed on value'), { dbErrorCode: '23505' })
      }
      const row: VerificationRow = {
        id: `v${++seq}`,
        pin: null,
        pinExpires: null,
        pinAttempts: 0,
        createdAt: new Date(),
        ...data,
      }
      verifications.push(row)
      return { ...row }
    },
    /**
     * Единственная операция без промежуточного yield между чтением и записью — так
     * симулируется атомарность `UPDATE ... SET pinAttempts = pinAttempts + 1` на уровне
     * строки Postgres. `data.pinAttempts` в форме `{ increment: n }` — как настоящий Prisma.
     */
    async update(
      { where, data }: {
        where: Where
        data: Partial<Omit<VerificationRow, 'pinAttempts'>> & { pinAttempts?: { increment: number } | number }
      },
    ) {
      await yieldTurn()
      const row = verifications.find((r) => matches(r, where))
      if (!row) {
        throw new Error('Record to update not found')
      }
      const { pinAttempts, ...rest } = data
      if (pinAttempts !== undefined) {
        row.pinAttempts = typeof pinAttempts === 'number' ? pinAttempts : row.pinAttempts + pinAttempts.increment
      }
      Object.assign(row, rest)
      return { ...row }
    },
    async updateMany({ where, data }: { where: Where; data: Partial<VerificationRow> }) {
      await yieldTurn()
      const found = verifications.filter((r) => matches(r, where))
      for (const row of found) {
        Object.assign(row, data)
      }
      return { count: found.length }
    },
    async deleteMany({ where }: { where: Where }) {
      await yieldTurn()
      let count = 0
      for (let i = verifications.length - 1; i >= 0; i--) {
        if (matches(verifications[i], where)) {
          verifications.splice(i, 1)
          count++
        }
      }
      return { count }
    },
    async delete({ where }: { where: Where }) {
      await yieldTurn()
      const index = verifications.findIndex((r) => matches(r, where))
      if (index === -1) {
        throw new Error('Record to delete does not exist')
      }
      const [row] = verifications.splice(index, 1)
      return row
    },
  }

  const user = {
    async findUnique({ where }: { where: Where }) {
      await yieldTurn()
      const found = users.find((u) => matches(u, where))
      return found ? { ...found } : null
    },
    async update({ where, data }: { where: Where; data: Partial<UserRow> }) {
      await yieldTurn()
      const found = users.find((u) => matches(u, where))
      if (!found) {
        throw new Error('Record to update not found')
      }
      Object.assign(found, data)
      return { ...found }
    },
  }

  return {
    prisma: {
      verification,
      user,
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    },
    verifications,
    users,
    addVerification(
      row: Partial<VerificationRow> & { identifier: string; value: string; expiresInMs: number },
    ) {
      const { expiresInMs, ...rest } = row
      verifications.push({
        id: `v${++seq}`,
        pin: null,
        pinExpires: null,
        pinAttempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiresInMs),
        ...rest,
      })
    },
    reset() {
      verifications.length = 0
      users.length = 0
    },
  }
}

/** Singleton: и `vi.mock('@/lib/db')`, и сам тест импортируют один и тот же экземпляр */
export const fakeDb = createFakePrisma()
