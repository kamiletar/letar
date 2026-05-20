# TypeScript 5.x / 6 — Документация

> Версия: 5.7+ (6.x в разработке) | Docs: https://www.typescriptlang.org/docs
> В letar: `typescript` используется с `tsgo` для быстрой проверки типов

## tsconfig.json — типичная конфигурация letar

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Utility Types

```typescript
// Частичные / обязательные
type PartialUser = Partial<User> // все поля опциональны
type RequiredUser = Required<User> // все поля обязательны
type ReadonlyUser = Readonly<User> // все поля readonly

// Выбор / исключение полей
type UserPreview = Pick<User, 'id' | 'name' | 'email'>
type UserWithoutPassword = Omit<User, 'password' | 'salt'>

// Запись / словарь
type StatusMap = Record<string, 'active' | 'inactive'>
type IdMap<T> = Record<string, T>

// Извлечение из union
type AdminRole = Extract<UserRole, 'ADMIN' | 'SUPER_ADMIN'>
type NonAdminRole = Exclude<UserRole, 'ADMIN' | 'SUPER_ADMIN'>

// Из функций
type CreateUserInput = Parameters<typeof createUser>[0]
type UserData = ReturnType<typeof getUser>
type AsyncUserData = Awaited<ReturnType<typeof fetchUser>>

// Из промисов
type ResolvedData = Awaited<Promise<User>> // User

// NonNullable
type StrictId = NonNullable<string | null | undefined> // string
```

---

## Template Literal Types

```typescript
type EventName = `on${Capitalize<string>}`
type CSSProperty = `--${string}`
type Route = `/${string}`

// Паттерн letar
type AppName = 'driving-school' | 'premium-rosstil' | 'imot'
type EnvKey = `${Uppercase<AppName>}_DATABASE_URL`
// 'DRIVING-SCHOOL_DATABASE_URL' | ...

// Conditional types
type IsArray<T> = T extends any[] ? true : false
type Flatten<T> = T extends Array<infer Item> ? Item : T
```

---

## Infer — вывод типов

```typescript
// Из возвращаемого типа функции
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

// Из Promise
type Awaited<T> = T extends Promise<infer R> ? Awaited<R> : T

// Из массива
type ArrayElement<T> = T extends (infer E)[] ? E : never
type StringArrayEl = ArrayElement<string[]> // string

// Из параметров функции
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never
```

---

## Discriminated Unions

```typescript
// ✅ Discriminated union — TypeScript автоматически сузит тип
type Result<T> = { status: 'success'; data: T } | { status: 'error'; error: string } | { status: 'loading' }

function handleResult<T>(result: Result<T>) {
  switch (result.status) {
    case 'success':
      console.log(result.data) // тип T
      break
    case 'error':
      console.log(result.error) // string
      break
    case 'loading':
      // только loading поля
      break
  }
}

// Паттерн letar — Server Action response
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; field?: string }
```

---

## Generic Constraints

```typescript
// Ограничение типа
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// Ограничение с условием
function processItems<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

// Дефолтный тип
function createStore<T = Record<string, unknown>>(initial: T) {
  return { state: initial }
}

// Conditional generic
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T
```

---

## Type Guards

```typescript
// is — type predicate
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'email' in value
}

// asserts — assertion function
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value == null) throw new Error('Value is null or undefined')
}

// Использование
const maybeUser: unknown = fetchUser()
if (isUser(maybeUser)) {
  console.log(maybeUser.email) // тип User
}

assertDefined(user)
console.log(user.email) // не null/undefined после assert
```

---

## Mapped Types

```typescript
// Трансформация типа
type Nullable<T> = { [K in keyof T]: T[K] | null }
type Optional<T> = { [K in keyof T]?: T[K] }
type Stringify<T> = { [K in keyof T]: string }

// Фильтрация по типу значения
type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never
}[keyof T]

// Remap keys
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}

// Пример использования
interface User {
  name: string
  age: number
}
type UserGetters = Getters<User>
// { getName: () => string; getAge: () => number }
```

---

## satisfies (TS 4.9+)

```typescript
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} satisfies Record<string, string | number[]>

// Сохраняет конкретные типы (не обобщает до Record<string, ...>)
palette.red // number[] — не string | number[]
palette.green // string
palette.red.map((x) => x) // ✅ — знает что это массив
```

---

## const enum и const assertion

```typescript
// const assertion — сохраняет литеральные типы
const routes = ['/', '/about', '/contact'] as const
type Route = (typeof routes)[number] // '/' | '/about' | '/contact'

const config = {
  theme: 'dark',
  language: 'ru',
} as const
type Theme = typeof config.theme // 'dark' (не string)

// Tuple
const pair = [1, 'hello'] as const
type Pair = typeof pair // readonly [1, 'hello']
```

---

## Using (TS 5.2+) — управление ресурсами

```typescript
// Автоматическое освобождение ресурсов
class DatabaseConnection implements Disposable {
  [Symbol.dispose]() {
    this.close()
  }
  close() {
    /* закрыть соединение */
  }
}

async function withConnection() {
  await using conn = new DatabaseConnection()
  // conn автоматически закроется при выходе из блока
  return await conn.query('SELECT * FROM users')
}
```

---

## Паттерны в letar

```typescript
// Типизация ZenStack-моделей
import type { School, StudentProfile, User } from '@prisma/client'

// Omit системных полей при создании
type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>

// Вложенные типы из Prisma
type StudentWithProfile = User & {
  studentProfile: StudentProfile & {
    school: School
  }
}

// Параметры Server Actions
type PaginatedParams = {
  page?: number
  pageSize?: number
  orderBy?: 'asc' | 'desc'
}

// Тип для формы с Zod
import { z } from 'zod/v4'

const StudentSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  schoolId: z.string(),
})

type StudentFormData = z.infer<typeof StudentSchema>

// Хелпер для извлечения типа из Promise<Array<T>>
type UnwrapArray<T> = T extends Array<infer U> ? U : T
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
type StudentItem = UnwrapArray<UnwrapPromise<ReturnType<typeof getStudents>>>
```

---

## typecheck:tsgo — быстрая проверка типов

```bash
# В letar используется tsgo (TypeScript Go) — в 9-38x быстрее
nx typecheck:tsgo <app>        # проверка одного приложения
nx run-many -t typecheck:tsgo  # все приложения
```

---

## Ссылки

- Docs: https://www.typescriptlang.org/docs
- Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- Playground: https://www.typescriptlang.org/play
- Release notes: https://www.typescriptlang.org/docs/handbook/release-notes/overview.html
