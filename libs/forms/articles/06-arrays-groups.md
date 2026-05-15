# Вложенные формы в React: массивы, drag & drop и когда использовать таблицы

> **Уровень сложности:** Сложный

**TL;DR:**

- `Form.Group` создаёт контекст для вложенных объектов с автоматическими путями (`customer.address.city`) на любой глубине
- `Form.Group.List` управляет динамическими массивами (add/remove/sort) с drag & drop через один проп `sortable`
- `TableEditor` — готовое решение для табличных данных с inline-редактированием, computed-колонками и footer-агрегациями

**Кому полезно:**

- Junior: понять, как работать с вложенными данными в формах без ручного маппинга индексов
- Middle: освоить паттерн вложенных массивов (массив в массиве) и выбор между Group.List и TableEditor
- Senior: оценить архитектуру автоматических путей и интеграцию с @dnd-kit для drag & drop

---

> Шестая статья из цикла «@letar/forms — от боли к декларативным формам». Как работать с вложенными объектами, динамическими массивами и drag & drop сортировкой в формах.

---

## Проблема: плоские формы — это фантазия

В учебниках формы плоские: `name`, `email`, `age`. В реальности данные вложенные:

```typescript
interface Order {
  customer: {
    name: string
    phone: string
    address: {
      city: string
      street: string
      building: string
    }
  }
  items: Array<{
    product: string
    quantity: number
    price: number
  }>
  comment: string
}
```

Три уровня вложенности + массив. Попробуйте это сделать на React Hook Form или TanStack Form «из коробки» — и вы быстро утонете в `control`, `useFieldArray`, ручном маппинге индексов.

---

## Form.Group — вложенные объекты

```tsx
<Form schema={OrderSchema} initialValue={data} onSubmit={save}>
  {/* Вложенный объект customer */}
  <Form.Group name="customer">
    <Form.Field.String name="name" /> {/* → customer.name */}
    <Form.Field.Phone name="phone" /> {/* → customer.phone */}
    {/* Ещё глубже: customer.address */}
    <Form.Group name="address">
      <Form.Field.City name="city" /> {/* → customer.address.city */}
      <Form.Field.String name="street" /> {/* → customer.address.street */}
      <Form.Field.String name="building" />
      {/* → customer.address.building */}
    </Form.Group>
  </Form.Group>
  <Form.Field.Textarea name="comment" /> {/* → comment (корневой уровень) */}
  <Form.Button.Submit />
</Form>
```

`Form.Group` создаёт контекст с префиксом пути. Все `Form.Field.*` внутри автоматически получают полный путь. Вложенность неограниченная.

### Визуальная группировка

```tsx
<Form.Group name="address" card title="Адрес доставки">
  <Form.Field.City name="city" />
  <Form.Field.String name="street" />
</Form.Group>
```

`card` — оборачивает группу в карточку с заголовком. `title` — подпись группы. Можно комбинировать с `<Heading>`, `<Separator>` и любыми Chakra-компонентами.

---

## Form.Group.List — динамические массивы

```tsx
<Form schema={OrderSchema} initialValue={data} onSubmit={save}>
  <Form.Group name="customer">
    <Form.Field.String name="name" />
    <Form.Field.Phone name="phone" />
  </Form.Group>

  {/* Динамический массив items */}
  <Form.Group.List name="items">
    {/* Каждый элемент массива */}
    <HStack>
      <Form.Field.Combobox name="product" />
      <Form.Field.Number name="quantity" />
      <Form.Field.Currency name="price" />
      <Form.Group.List.Button.Remove />
    </HStack>

    {/* Кнопка добавления */}
    <Form.Group.List.Button.Add>+ Добавить товар</Form.Group.List.Button.Add>
  </Form.Group.List>

  <Form.Button.Submit />
</Form>
```

`Form.Group.List`:

- Рендерит children для **каждого** элемента массива
- Автоматически управляет индексами (`items[0].product`, `items[1].product`)
- `Button.Add` — добавляет пустой элемент из `defaultValue` Zod-схемы
- `Button.Remove` — удаляет текущий элемент

### Кастомизация шаблона элемента

```tsx
<Form.Group.List
  name="phones"
  min={1} // Минимум 1 элемент
  max={5} // Максимум 5
  addLabel="Добавить телефон" // Текст кнопки
  defaultItem={{ number: '', type: 'mobile' }} // Шаблон нового элемента
>
  <HStack>
    <Form.Field.Phone name="number" />
    <Form.Field.NativeSelect name="type" options={phoneTypes} />
    <Form.Group.List.Button.Remove />
  </HStack>
</Form.Group.List>
```

`min` и `max` — ограничения количества. `Button.Add` скрывается при достижении `max`, `Button.Remove` скрывается при достижении `min`.

---

## Drag & Drop сортировка

Для переупорядочивания элементов массива подключается `@dnd-kit`:

```tsx
<Form.Group.List name="sections" sortable>
  <HStack>
    <Form.Group.List.DragHandle /> {/* ≡ иконка для перетаскивания */}
    <Form.Field.String name="title" />
    <Form.Group.List.Button.Remove />
  </HStack>
</Form.Group.List>
```

`sortable` активирует drag & drop. `DragHandle` — визуальная ручка для перетаскивания. При перемещении элемента обновляются все индексы.

### Вертикальный и горизонтальный drag & drop

```tsx
{
  /* Вертикальный список (по умолчанию) */
}
;<Form.Group.List name="steps" sortable direction="vertical">
  ...
</Form.Group.List>

{
  /* Горизонтальный (например, карточки) */
}
;<Form.Group.List name="slides" sortable direction="horizontal">
  ...
</Form.Group.List>
```

---

## Вложенные массивы

Массив внутри массива — вполне реальный кейс (форма расписания, конструктор курса):

```tsx
const CourseSchema = z.object({
  title: z.string().meta({ ui: { title: 'Название курса' } }),
  modules: z.array(
    z.object({
      title: z.string().meta({ ui: { title: 'Модуль' } }),
      lessons: z.array(
        z.object({
          title: z.string().meta({ ui: { title: 'Урок' } }),
          duration: z.number().meta({ ui: { title: 'Длительность (мин)', fieldType: 'duration' } }),
        })
      ),
    })
  ),
})

<Form schema={CourseSchema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="title" />

  <Form.Group.List name="modules" sortable>
    <Box p={4} borderWidth={1} borderRadius="md">
      <HStack>
        <Form.Group.List.DragHandle />
        <Form.Field.String name="title" />
        <Form.Group.List.Button.Remove />
      </HStack>

      {/* Вложенный массив уроков */}
      <Form.Group.List name="lessons">
        <HStack>
          <Form.Field.String name="title" />
          <Form.Field.Duration name="duration" />
          <Form.Group.List.Button.Remove />
        </HStack>
        <Form.Group.List.Button.Add>+ Урок</Form.Group.List.Button.Add>
      </Form.Group.List>
    </Box>

    <Form.Group.List.Button.Add>+ Модуль</Form.Group.List.Button.Add>
  </Form.Group.List>

  <Form.Button.Submit />
</Form>
```

Пути генерируются автоматически: `modules[0].lessons[2].title`. Валидация, ошибки, значения — всё работает на любой глубине.

---

## Валидация массивов в Zod

```typescript
const OrderSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().min(1, 'Выберите товар'),
        quantity: z.number().min(1, 'Минимум 1'),
        price: z.number().min(0),
      })
    )
    .min(1, 'Добавьте хотя бы один товар') // Валидация длины массива
    .max(20, 'Максимум 20 позиций'),
})
```

Ошибки показываются:

- На уровне элемента: «Выберите товар» — у конкретного поля
- На уровне массива: «Добавьте хотя бы один товар» — над списком

---

## Пример из продакшена: форма заказа

```tsx
function OrderForm({ products }) {
  return (
    <Form schema={OrderSchema} initialValue={emptyOrder} onSubmit={submitOrder}>
      <VStack gap={6}>
        <Form.Group name="customer" card title="Покупатель">
          <HStack>
            <Form.Field.String name="name" />
            <Form.Field.Phone name="phone" />
          </HStack>
          <Form.Field.String name="email" />
        </Form.Group>

        <Form.Group name="delivery" card title="Доставка">
          <Form.Field.City name="city" />
          <Form.Field.Address name="address" />
          <Form.Field.Date name="preferredDate" />
        </Form.Group>

        <Box>
          <Heading size="sm" mb={2}>
            Товары
          </Heading>
          <Form.Group.List name="items" sortable min={1} max={20}>
            <HStack>
              <Form.Group.List.DragHandle />
              <Form.Field.Combobox name="productId" options={products} />
              <Form.Field.NumberInput name="quantity" min={1} />
              <Form.Group.List.Button.Remove />
            </HStack>
            <Form.Group.List.Button.Add>+ Добавить товар</Form.Group.List.Button.Add>
          </Form.Group.List>
        </Box>

        <Form.Field.Textarea name="comment" />

        <Form.Errors title="Исправьте ошибки:" />
        <Form.Button.Submit>Оформить заказ</Form.Button.Submit>
      </VStack>
    </Form>
  )
}
```

---

## Итоги

| Компонент                       | Что делает                            |
| ------------------------------- | ------------------------------------- |
| `Form.Group`                    | Вложенный объект (префикс пути)       |
| `Form.Group.List`               | Динамический массив (add/remove/sort) |
| `Form.Group.List.Button.Add`    | Добавление элемента                   |
| `Form.Group.List.Button.Remove` | Удаление элемента                     |
| `Form.Group.List.DragHandle`    | Ручка для drag & drop                 |

Ключевые принципы:

1. **Автоматические пути** — `customer.address.city` вычисляется из вложенности JSX
2. **Неограниченная глубина** — массивы в объектах в массивах
3. **Drag & drop** — одним пропом `sortable`
4. **Валидация** — и на элементах, и на длине массива

---

## Альтернатива: TableEditor для табличных данных

Если массив — это таблица (товары в заказе, строки сметы), `Form.Group.List` с ручной вёрсткой избыточен. `Form.Field.TableEditor` — готовое решение:

```tsx
<Form.Field.TableEditor
  name="items"
  columns={[
    { name: 'product', width: '40%' },
    { name: 'qty', width: '15%', align: 'right' },
    { name: 'price', width: '15%', align: 'right' },
    { name: 'total', computed: (row) => row.qty * row.price, label: 'Итого' },
  ]}
  addLabel="Добавить товар"
  sortable
  footer={[{ column: 'total', aggregate: 'sum', label: 'Итого:' }]}
/>
```

Что даёт `TableEditor` сверх `Form.Group.List`:

| Возможность           | Group.List | TableEditor               |
| --------------------- | ---------- | ------------------------- |
| Inline-редактирование | Вручную    | Из коробки                |
| Computed-колонки      | Вручную    | Из коробки                |
| Footer-агрегации      | Нет        | SUM, AVG, COUNT, MIN, MAX |
| DnD сортировка        | `sortable` | `sortable`                |
| Copy-paste из Excel   | Нет        | Из коробки                |
| Мобильный вид         | Вручную    | Авто (карточки)           |

**Правило:** если данные — линейная таблица (строки × колонки) → `TableEditor`. Если произвольная вёрстка (карточки, аккордеоны) → `Form.Group.List`.

Для продвинутых сценариев (сортировка, фильтрация, виртуализация 1000+ строк) есть `Form.Field.DataGrid` — подробнее в [статье 4: каталог полей](04-40-fields.md).

---

## Попробовать

- **Группы и массивы:** [forms-example.letar.best/examples/groups](https://forms-example.letar.best/examples/groups)
- **Исходный код:** [GitHub](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/groups/page.tsx)
- **Клонировать:** `git clone https://github.com/kamiletar/letar-forms-example && cd letar-forms-example && npm install && npm run dev`

В следующей статье — `Form.FromSchema`: как сгенерировать полную форму из одной строки кода.

---

_Это шестая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: Мультистеп и условный рендеринг](05-multistep-conditional.md) | [Следующая: FromSchema](07-from-schema.md)._
