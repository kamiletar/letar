# Access Control Policies

ZenStack использует `@@allow()` и `@@deny()` для row-level безопасности.

## Базовый синтаксис

```zmodel
model Entity {
  @@allow('операция', условие)
  @@deny('операция', условие)
}
```

**Операции:** `create`, `read`, `update`, `delete`, `all`

## Функция auth()

`auth()` возвращает текущего пользователя из сессии:

```zmodel
// Доступ к своим данным
@@allow('read', auth() == this)
@@allow('read', auth().id == userId)

// Проверка роли (множественные роли!)
@@allow('all', has(auth().roles, ADMIN))
@@allow('all', has(auth().roles, OWNER))
```

## Множественные роли

**ВАЖНО:** Пользователь может иметь несколько ролей одновременно (массив `roles`).

```zmodel
model User {
  id    String     @id @default(cuid())
  roles UserRole[] // Массив ролей!

  @@allow('read', auth() == this)
  @@allow('all', has(auth().roles, ADMIN))
  @@allow('all', has(auth().roles, OWNER))
}

enum UserRole {
  STUDENT
  INSTRUCTOR
  SCHOOL_ADMIN
  OWNER
}
```

**Синтаксис проверки ролей:**

```zmodel
// ✅ Правильно — проверка наличия роли в массиве
@@allow('all', has(auth().roles, OWNER))
@@allow('read', has(auth().roles, INSTRUCTOR))

// ❌ Неправильно — старый синтаксис для одной роли
@@allow('all', auth().role == OWNER)  // НЕ РАБОТАЕТ!
```

## Типичные паттерны

### Пользователь — свои данные

```zmodel
model Order {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])

  // Пользователь видит/создаёт свои заказы
  @@allow('read', auth() == user)
  @@allow('create', auth() == user)

  // Админ может всё
  @@allow('all', has(auth().roles, ADMIN))
}
```

### Публичное чтение

```zmodel
model Product {
  id   String @id @default(cuid())
  name String

  // Все могут читать
  @@allow('read', true)

  // Только админ может изменять
  @@allow('all', has(auth().roles, ADMIN))
}
```

### Иерархия ролей

```zmodel
model SchoolData {
  schoolId String
  school   School @relation(...)

  // Инструктор школы
  @@allow('read', has(auth().roles, INSTRUCTOR) && auth().schoolId == schoolId)

  // Админ школы — полный доступ к школе
  @@allow('all', has(auth().roles, SCHOOL_ADMIN) && auth().schoolId == schoolId)

  // Owner — полный доступ ко всему
  @@allow('all', has(auth().roles, OWNER))
}
```

### Deny перекрывает Allow

```zmodel
model User {
  isDeleted Boolean @default(false)

  // Разрешаем чтение
  @@allow('read', true)

  // Но запрещаем удалённых
  @@deny('read', isDeleted == true)
}
```

## Использование Enhanced клиента

```typescript
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
const db = getEnhancedPrisma(session?.user) // Enhanced клиент

// Автоматически фильтруется по политикам
const orders = await db.order.findMany()
```

## Отладка политик

Если запрос возвращает пустой результат или ошибку доступа:

1. Проверь `session.user` — есть ли `roles`?
2. Используй `getEnhancedPrisma(session.user)`, а не raw Prisma
3. Проверь политики в `schema.zmodel`
4. Убедись в правильности `has()` для массива ролей

---

## Мультитенантность (Organizations)

Два подхода для изоляции данных по организациям.

### Подход 1: Через реляции (рекомендуемый)

```zmodel
model Project {
  organizationId String
  organization   Organization @relation(...)

  // Участники организации могут читать
  @@allow('read', organization.members?[userId == auth().id])

  // Только owner/manager могут изменять
  @@allow('update,delete', organization.members?[userId == auth().id && role in ['owner', 'manager']])
}
```

### Подход 2: Через контекст (быстрый)

```zmodel
model Project {
  organizationId String

  // Deny-first изоляция
  @@deny('all', auth() == null)
  @@deny('all', auth().organizationId != organizationId)

  // Роли через контекст
  @@allow('all', auth().organizationRole == 'owner')
  @@allow('read', auth().organizationRole == 'member')
}
```

### Защита критичных полей

```zmodel
model Project {
  // Эти поля нельзя изменить после создания
  ownerId        String @allow('update', false)
  organizationId String @allow('update', false)
}
```

### check() для делегирования

```zmodel
model TodoItem {
  listId String
  list   TodoList @relation(...)

  // Если можешь читать список — можешь читать элементы
  @@allow('read', check(list, 'read'))

  // Если можешь изменять список — можешь изменять элементы
  @@allow('create,update,delete', check(list, 'update'))
}
```

> **Подробнее:** [zenstack-better-auth.md](zenstack-better-auth.md)
> **Эталон:** `apps/driving-school/schema.zmodel`

---

## Field-level Access Control (v3.2.0+)

Новые атрибуты `@allow` и `@deny` на уровне **ПОЛЯ** (не модели!).

### Отличие от model-level

| Уровень | Синтаксис                | Операции                          |
| ------- | ------------------------ | --------------------------------- |
| Модель  | `@@allow()` / `@@deny()` | create, read, update, delete, all |
| Поле    | `@allow()` / `@deny()`   | read, update                      |

**Важно:** `create` и `delete` доступны только на уровне модели, т.к. они оперируют записью целиком.

### Базовый синтаксис

```zmodel
model User {
  id       String @id @default(cuid())
  name     String

  // Только владелец или админ могут видеть email
  email    String @allow('read', auth() == this || has(auth().roles, ADMIN))

  // Гости не видят телефон
  phone    String? @deny('read', has(auth().roles, GUEST))

  // Пароль не читается никем (только запись)
  password String @deny('read', true)

  // Нельзя изменить владельца записи
  ownerId  String @allow('update', false)
}
```

### Защита чувствительных полей

```zmodel
model User {
  // Публичные поля — без ограничений
  name      String
  avatar    String?

  // Приватные поля — только владелец
  email     String @allow('read', auth() == this)
  phone     String? @allow('read', auth() == this)
  birthdate DateTime? @allow('read', auth() == this)

  // Финансовые данные — владелец + финансовый отдел
  salary    Decimal? @allow('read', auth() == this || has(auth().roles, FINANCE))

  // Системные поля — только админы
  internalNotes String? @allow('read', has(auth().roles, ADMIN))
}
```

### Защита от изменения критичных полей

```zmodel
model Order {
  id         String @id @default(cuid())

  // Эти поля нельзя изменить после создания
  customerId String @allow('update', false)
  orderNumber String @allow('update', false)
  createdAt  DateTime @default(now()) @allow('update', false)

  // Статус может менять только админ
  status     OrderStatus @allow('update', has(auth().roles, ADMIN))

  // Остальные поля можно менять
  notes      String?
}
```

### Мультитенантность — скрытие данных между организациями

```zmodel
model Member {
  id             String @id @default(cuid())
  organizationId String
  userId         String

  // Зарплата видна только внутри своей организации + HR
  salary         Decimal? @allow('read',
    auth().organizationId == organizationId || has(auth().roles, HR)
  )

  // Персональные заметки видны только самому сотруднику
  personalNotes  String? @allow('read', auth().id == userId)

  // Оценка производительности — только менеджеры организации
  performanceScore Int? @allow('read',
    auth().organizationId == organizationId && has(auth().roles, MANAGER)
  )
}
```

### Комбинация с model-level политиками

```zmodel
model Document {
  id        String @id @default(cuid())
  title     String
  content   String

  // Конфиденциальный контент — дополнительная проверка
  secretData String? @allow('read', has(auth().roles, CONFIDENTIAL_ACCESS))

  authorId  String
  author    User @relation(...)

  // Model-level: базовый доступ
  @@allow('read', true)  // Все могут читать документ
  @@allow('update', auth().id == authorId)  // Автор может редактировать

  // Field-level @allow на secretData дополнительно фильтрует это поле
}
```

### Поведение при отказе в доступе

При запросе поля без доступа:

- **read**: поле возвращается как `null` (не ошибка!)
- **update**: операция отклоняется с ошибкой

```typescript
// Пользователь без роли ADMIN запрашивает User
const user = await db.user.findUnique({
  where: { id: '123' },
  select: { name: true, email: true, internalNotes: true },
})

// Результат:
// {
//   name: 'John',
//   email: 'john@example.com',  // Если auth() == this
//   internalNotes: null         // Нет доступа → null
// }
```

### Чеклист безопасности

- [ ] Пароли и секреты: `@deny('read', true)`
- [ ] PII данные (email, phone): `@allow('read', auth() == this)`
- [ ] Финансовые данные: ограничить по ролям
- [ ] Критичные поля: `@allow('update', false)`
- [ ] Мультитенант: проверять `organizationId`

---

> **Версия:** ZenStack 3.2.0+
> **Разработано:** ZenStack Team
