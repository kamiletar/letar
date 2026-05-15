# TESTING_PLAN.md — @letar/forms

План тестирования UI-библиотеки компонентов форм.

---

## Стратегия тестирования

### Уровни тестов

| Уровень     | Инструмент                     | Цель                                           |
| ----------- | ------------------------------ | ---------------------------------------------- |
| Unit        | Vitest + React Testing Library | Изолированное тестирование компонентов и хуков |
| Integration | Vitest + React Testing Library | Тестирование взаимодействия компонентов        |

### Принципы

1. **Тестирование поведения** — тестируем то, что видит пользователь, а не детали реализации
2. **Изоляция** — каждый тест независим от других
3. **Читаемость** — понятные названия тестов на русском языке
4. **Покрытие** — минимум 80% покрытия критических путей

---

## Unit тесты

### Контексты именования

#### `FormGroup` + `useFormGroup`

```typescript
// libs/forms/src/lib/form-group.spec.tsx

describe('FormGroup', () => {
  it('должен предоставить имя группы через контекст', () => {
    // Arrange
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx?.name}</span>
    }

    // Act
    render(
      <FormGroup name="user">
        <TestComponent />
      </FormGroup>,
    )

    // Assert
    expect(screen.getByTestId('name')).toHaveTextContent('user')
  })

  it('должен объединять вложенные имена через точку', () => {
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroup name="user">
        <FormGroup name="address">
          <TestComponent />
        </FormGroup>
      </FormGroup>,
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.address')
  })

  it('должен возвращать null вне контекста', () => {
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx === null ? 'null' : ctx.name}</span>
    }

    render(<TestComponent />)

    expect(screen.getByTestId('name')).toHaveTextContent('null')
  })
})
```

#### `FormField` + `useFormField`

```typescript
// libs/forms/src/lib/form-field.spec.tsx

describe('FormField', () => {
  it('должен предоставить имя поля через контекст', () => {
    const TestComponent = () => {
      const ctx = useFormField()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormField name="email">
        <TestComponent />
      </FormField>,
    )

    expect(screen.getByTestId('name')).toHaveTextContent('email')
  })

  it('должен объединять с именем группы', () => {
    const TestComponent = () => {
      const ctx = useFormField()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroup name="user">
        <FormField name="email">
          <TestComponent />
        </FormField>
      </FormGroup>,
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.email')
  })

  it('должен поддерживать render prop паттерн', () => {
    render(
      <FormField name="email">
        {({ name }) => <span data-testid="name">{name}</span>}
      </FormField>,
    )

    expect(screen.getByTestId('name')).toHaveTextContent('email')
  })
})
```

### TanStack Form интеграция

#### `TanStackFormField` + `useTanStackFormField`

```typescript
// libs/forms/src/lib/tanstack-form-field.spec.tsx

describe('TanStackFormField', () => {
  const mockField = {
    state: { value: 'test@example.com', meta: { errors: [] } },
    handleChange: vi.fn(),
    handleBlur: vi.fn(),
  } as unknown as AnyFieldApi

  it('должен предоставить field API через контекст', () => {
    const TestComponent = () => {
      const ctx = useTanStackFormField()
      return <span data-testid="value">{ctx?.field.state.value}</span>
    }

    render(
      <TanStackFormField name="email" field={mockField}>
        <TestComponent />
      </TanStackFormField>,
    )

    expect(screen.getByTestId('value')).toHaveTextContent('test@example.com')
  })

  it('должен объединять имя с FormGroup', () => {
    const TestComponent = () => {
      const ctx = useTanStackFormField()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroup name="user">
        <TanStackFormField name="email" field={mockField}>
          <TestComponent />
        </TanStackFormField>
      </FormGroup>,
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.email')
  })
})
```

#### `ChakraFormField`

```typescript
// libs/forms/src/lib/chakra-form-field.spec.tsx

describe('ChakraFormField', () => {
  const mockField = {
    state: { value: '', meta: { errors: [] } },
    handleChange: vi.fn(),
    handleBlur: vi.fn(),
  } as unknown as AnyFieldApi

  it('должен отображать label', () => {
    render(
      <TanStackFormField name="email" field={mockField}>
        <ChakraFormField label="Email">
          <input />
        </ChakraFormField>
      </TanStackFormField>,
    )

    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('должен отображать helperText', () => {
    render(
      <TanStackFormField name="email" field={mockField}>
        <ChakraFormField label="Email" helperText="Рабочий email">
          <input />
        </ChakraFormField>
      </TanStackFormField>,
    )

    expect(screen.getByText('Рабочий email')).toBeInTheDocument()
  })

  it('должен отображать ошибки из field API', () => {
    const fieldWithError = {
      ...mockField,
      state: { ...mockField.state, meta: { errors: ['Некорректный email'] } },
    }

    render(
      <TanStackFormField name="email" field={fieldWithError as AnyFieldApi}>
        <ChakraFormField label="Email">
          <input />
        </ChakraFormField>
      </TanStackFormField>,
    )

    expect(screen.getByText('Некорректный email')).toBeInTheDocument()
  })

  it('должен скрывать helperText при наличии ошибок', () => {
    const fieldWithError = {
      ...mockField,
      state: { ...mockField.state, meta: { errors: ['Ошибка'] } },
    }

    render(
      <TanStackFormField name="email" field={fieldWithError as AnyFieldApi}>
        <ChakraFormField label="Email" helperText="Подсказка">
          <input />
        </ChakraFormField>
      </TanStackFormField>,
    )

    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument()
    expect(screen.getByText('Ошибка')).toBeInTheDocument()
  })
})
```

### Массивы

#### `FormGroupList` + `FormGroupListItem`

```typescript
// libs/forms/src/lib/form-group-list.spec.tsx

describe('FormGroupList', () => {
  const createMockArrayField = (values: unknown[]) => ({
    state: { value: values },
    pushValue: vi.fn(),
    removeValue: vi.fn(),
    moveValue: vi.fn(),
    swapValues: vi.fn(),
    insertValue: vi.fn(),
    replaceValue: vi.fn(),
  } as unknown as AnyFieldApi)

  it('должен отображать emptyContent когда массив пуст', () => {
    const field = createMockArrayField([])

    render(
      <FormGroupList name="phones" field={field} emptyContent="Нет телефонов">
        {(items) => <div>{items.length}</div>}
      </FormGroupList>,
    )

    expect(screen.getByText('Нет телефонов')).toBeInTheDocument()
  })

  it('должен предоставить операции с массивом', () => {
    const field = createMockArrayField([{ number: '123' }])

    render(
      <FormGroupList name="phones" field={field}>
        {(items, { pushValue }) => <button onClick={() => pushValue({ number: '' })}>Добавить</button>}
      </FormGroupList>,
    )

    fireEvent.click(screen.getByText('Добавить'))

    expect(field.pushValue).toHaveBeenCalledWith({ number: '' })
  })

  it('должен создать FormGroup с именем массива', () => {
    const field = createMockArrayField([{ number: '123' }])

    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroupList name="phones" field={field}>
        {() => <TestComponent />}
      </FormGroupList>,
    )

    expect(screen.getByTestId('name')).toHaveTextContent('phones')
  })
})

describe('FormGroupListItem', () => {
  const createMockListContext = (length: number) => ({
    values: Array(length).fill(null),
    length,
    pushValue: vi.fn(),
    removeValue: vi.fn(),
    moveValue: vi.fn(),
    swapValues: vi.fn(),
    insertValue: vi.fn(),
    replaceValue: vi.fn(),
  })

  it('должен предоставить операции удаления', () => {
    const ctx = createMockListContext(3)

    render(
      <FormGroupListContext.Provider value={ctx}>
        <FormGroupListItem index={1}>
          {({ remove }) => <button onClick={remove}>Удалить</button>}
        </FormGroupListItem>
      </FormGroupListContext.Provider>,
    )

    fireEvent.click(screen.getByText('Удалить'))

    expect(ctx.removeValue).toHaveBeenCalledWith(1)
  })

  it('должен определять isFirst и isLast', () => {
    const ctx = createMockListContext(3)

    render(
      <FormGroupListContext.Provider value={ctx}>
        <FormGroupListItem index={0}>
          {({ isFirst, isLast }) => <span data-testid="flags">{`first:${isFirst},last:${isLast}`}</span>}
        </FormGroupListItem>
      </FormGroupListContext.Provider>,
    )

    expect(screen.getByTestId('flags')).toHaveTextContent('first:true,last:false')
  })

  it('должен выбросить ошибку вне FormGroupList', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(
        <FormGroupListItem index={0}>
          {() => <div />}
        </FormGroupListItem>,
      )
    }).toThrow('FormGroupListItem must be used inside FormGroupList')

    consoleError.mockRestore()
  })
})
```

### Новые фичи (v0.41.0+)

#### Form Middleware

```typescript
// libs/forms/src/lib/declarative/form-middleware.spec.tsx

describe('Form Middleware', () => {
  it('должен вызывать beforeSubmit перед отправкой', async () => {
    const beforeSubmit = jest.fn((data) => ({ ...data, transformed: true }))
    const onSubmit = vi.fn()

    render(
      <Form
        initialValue={{ name: 'test' }}
        onSubmit={onSubmit}
        middleware={{ beforeSubmit }}
      >
        <Form.Button.Submit>Отправить</Form.Button.Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(beforeSubmit).toHaveBeenCalledWith({ name: 'test' })
      expect(onSubmit).toHaveBeenCalledWith({ name: 'test', transformed: true })
    })
  })

  it('должен отменять отправку если beforeSubmit возвращает undefined', async () => {
    const beforeSubmit = jest.fn(() => undefined)
    const onSubmit = vi.fn()

    render(
      <Form
        initialValue={{ name: 'test' }}
        onSubmit={onSubmit}
        middleware={{ beforeSubmit }}
      >
        <Form.Button.Submit>Отправить</Form.Button.Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(beforeSubmit).toHaveBeenCalled()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('должен вызывать afterSuccess после успешной отправки', async () => {
    const afterSuccess = vi.fn()
    const onSubmit = vi.fn()

    render(
      <Form
        initialValue={{ name: 'test' }}
        onSubmit={onSubmit}
        middleware={{ afterSuccess }}
      >
        <Form.Button.Submit>Отправить</Form.Button.Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(afterSuccess).toHaveBeenCalledWith({ name: 'test' })
    })
  })

  it('должен вызывать onError при ошибке отправки', async () => {
    const error = new Error('Submit failed')
    const onError = vi.fn()
    const onSubmit = jest.fn(() => {
      throw error
    })

    render(
      <Form
        initialValue={{ name: 'test' }}
        onSubmit={onSubmit}
        middleware={{ onError }}
      >
        <Form.Button.Submit>Отправить</Form.Button.Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error)
    })
  })
})
```

#### Form.Field.Auto

```typescript
// libs/forms/src/lib/declarative/form-fields/auto/field-auto.spec.tsx

describe('Form.Field.Auto', () => {
  it('должен рендерить FieldString для z.string()', () => {
    const schema = z.object({
      name: z.string(),
    })

    render(
      <Form initialValue={{ name: '' }} schema={schema}>
        <Form.Field.Auto name="name" />
      </Form>,
    )

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('должен рендерить FieldNumber для z.number()', () => {
    const schema = z.object({
      age: z.number(),
    })

    render(
      <Form initialValue={{ age: 0 }} schema={schema}>
        <Form.Field.Auto name="age" />
      </Form>,
    )

    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('должен рендерить FieldCheckbox для z.boolean()', () => {
    const schema = z.object({
      agree: z.boolean(),
    })

    render(
      <Form initialValue={{ agree: false }} schema={schema}>
        <Form.Field.Auto name="agree" />
      </Form>,
    )

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('должен рендерить FieldNativeSelect для z.enum()', () => {
    const schema = z.object({
      role: z.enum(['admin', 'user', 'guest']),
    })

    render(
      <Form initialValue={{ role: 'user' }} schema={schema}>
        <Form.Field.Auto name="role" />
      </Form>,
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('должен генерировать label из camelCase имени', () => {
    const schema = z.object({
      firstName: z.string(),
    })

    render(
      <Form initialValue={{ firstName: '' }} schema={schema}>
        <Form.Field.Auto name="firstName" />
      </Form>,
    )

    expect(screen.getByText('First Name')).toBeInTheDocument()
  })
})
```

#### camelCaseToLabel

```typescript
// libs/forms/src/lib/declarative/form-fields/utils.spec.tsx

describe('camelCaseToLabel', () => {
  it('должен преобразовать camelCase в читаемый label', () => {
    expect(camelCaseToLabel('firstName')).toBe('First Name')
    expect(camelCaseToLabel('lastName')).toBe('Last Name')
    expect(camelCaseToLabel('email')).toBe('Email')
    expect(camelCaseToLabel('phoneNumber')).toBe('Phone Number')
    expect(camelCaseToLabel('isActive')).toBe('Is Active')
    expect(camelCaseToLabel('createdAt')).toBe('Created At')
  })

  it('должен обработать аббревиатуры', () => {
    expect(camelCaseToLabel('userID')).toBe('User ID')
    expect(camelCaseToLabel('apiURL')).toBe('Api URL')
  })
})
```

#### Form.Field.CascadingSelect

```typescript
// libs/forms/src/lib/declarative/form-fields/selection/field-cascading-select.spec.tsx

describe('Form.Field.CascadingSelect', () => {
  const countries = [
    { label: 'Россия', value: 'ru' },
    { label: 'США', value: 'us' },
  ]

  const citiesByCountry: Record<string, { label: string; value: string }[]> = {
    ru: [
      { label: 'Москва', value: 'moscow' },
      { label: 'Санкт-Петербург', value: 'spb' },
    ],
    us: [
      { label: 'Нью-Йорк', value: 'ny' },
      { label: 'Лос-Анджелес', value: 'la' },
    ],
  }

  it('должен загружать опции при изменении родительского поля', async () => {
    const loadOptions = jest.fn((country: string) => Promise.resolve(citiesByCountry[country] || []))

    render(
      <Form initialValue={{ country: '', city: '' }}>
        <Form.Field.Select name="country" label="Страна" options={countries} />
        <Form.Field.CascadingSelect
          name="city"
          label="Город"
          dependsOn="country"
          loadOptions={loadOptions}
        />
      </Form>,
    )

    // Выбираем страну
    fireEvent.change(screen.getByLabelText('Страна'), { target: { value: 'ru' } })

    await waitFor(() => {
      expect(loadOptions).toHaveBeenCalledWith('ru')
    })
  })

  it('должен быть отключен пока родительское поле пустое', () => {
    render(
      <Form initialValue={{ country: '', city: '' }}>
        <Form.Field.Select name="country" label="Страна" options={countries} />
        <Form.Field.CascadingSelect
          name="city"
          label="Город"
          dependsOn="country"
          loadOptions={() => Promise.resolve([])}
          disableWhenParentEmpty
        />
      </Form>,
    )

    expect(screen.getByLabelText('Город')).toBeDisabled()
  })

  it('должен очищать значение при изменении родительского поля', async () => {
    const loadOptions = jest.fn((country: string) => Promise.resolve(citiesByCountry[country] || []))

    render(
      <Form initialValue={{ country: 'ru', city: 'moscow' }}>
        <Form.Field.Select name="country" label="Страна" options={countries} />
        <Form.Field.CascadingSelect
          name="city"
          label="Город"
          dependsOn="country"
          loadOptions={loadOptions}
          clearOnParentChange
        />
      </Form>,
    )

    // Меняем страну
    fireEvent.change(screen.getByLabelText('Страна'), { target: { value: 'us' } })

    await waitFor(() => {
      expect(screen.getByLabelText('Город')).toHaveValue('')
    })
  })
})
```

#### Form.Builder

```typescript
// libs/forms/src/lib/declarative/form-builder/form-builder.spec.tsx

describe('Form.Builder', () => {
  it('должен рендерить поля из конфигурации', () => {
    const config = {
      fields: [
        { type: 'string' as const, name: 'firstName', label: 'Имя' },
        { type: 'string' as const, name: 'lastName', label: 'Фамилия' },
        { type: 'number' as const, name: 'age', label: 'Возраст' },
      ],
    }

    render(
      <Form.Builder
        config={config}
        initialValue={{ firstName: '', lastName: '', age: 0 }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
    expect(screen.getByLabelText('Фамилия')).toBeInTheDocument()
    expect(screen.getByLabelText('Возраст')).toBeInTheDocument()
  })

  it('должен рендерить секции с заголовками', () => {
    const config = {
      sections: [
        {
          title: 'Личные данные',
          fields: [
            { type: 'string' as const, name: 'name', label: 'Имя' },
          ],
        },
        {
          title: 'Контакты',
          fields: [
            { type: 'string' as const, name: 'email', label: 'Email' },
          ],
        },
      ],
    }

    render(
      <Form.Builder
        config={config}
        initialValue={{ name: '', email: '' }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Личные данные')).toBeInTheDocument()
    expect(screen.getByText('Контакты')).toBeInTheDocument()
  })

  it('должен поддерживать все типы полей', () => {
    const config = {
      fields: [
        { type: 'string' as const, name: 'text' },
        { type: 'textarea' as const, name: 'description' },
        { type: 'number' as const, name: 'count' },
        { type: 'checkbox' as const, name: 'agree' },
        { type: 'switch' as const, name: 'enabled' },
        {
          type: 'select' as const,
          name: 'role',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'User', value: 'user' },
          ],
        },
      ],
    }

    const initialValue = {
      text: '',
      description: '',
      count: 0,
      agree: false,
      enabled: false,
      role: 'user',
    }

    render(
      <Form.Builder
        config={config}
        initialValue={initialValue}
        onSubmit={vi.fn()}
      />,
    )

    // Все поля должны отрендериться
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('должен генерировать label из name если не указан', () => {
    const config = {
      fields: [
        { type: 'string' as const, name: 'firstName' },
      ],
    }

    render(
      <Form.Builder
        config={config}
        initialValue={{ firstName: '' }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('First Name')).toBeInTheDocument()
  })

  it('должен вызывать onSubmit с данными формы', async () => {
    const onSubmit = vi.fn()
    const config = {
      fields: [
        { type: 'string' as const, name: 'name', label: 'Имя' },
      ],
    }

    render(
      <Form.Builder
        config={config}
        initialValue={{ name: '' }}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
      />,
    )

    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'John' } })
    fireEvent.click(screen.getByText('Сохранить'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'John' })
    })
  })
})
```

---

## Integration тесты

### Полная форма с валидацией

```typescript
// libs/forms/src/lib/integration.spec.tsx

describe('Integration: Полная форма', () => {
  it('должен работать полный цикл формы', async () => {
    const onSubmit = vi.fn()

    function TestForm() {
      const form = useAppForm({
        defaultValues: { email: '', name: '' },
        onSubmit: async ({ value }) => onSubmit(value),
      })

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.Field name="email">
            {(field) => (
              <input
                data-testid="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>
          <form.Field name="name">
            {(field) => (
              <input
                data-testid="name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>
          <button type="submit">Submit</button>
        </form>
      )
    }

    render(<TestForm />)

    // Заполняем форму
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByTestId('name'), { target: { value: 'John' } })

    // Отправляем
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John',
      })
    })
  })
})
```

### Массив с добавлением/удалением

```typescript
describe('Integration: Массив полей', () => {
  it('должен добавлять и удалять элементы', async () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { phones: [{ number: '' }] },
      })

      return (
        <form>
          <form.Field name="phones" mode="array">
            {(phonesField) => (
              <FormGroupList name="phones" field={phonesField}>
                {(items, { pushValue }) => (
                  <>
                    {items.map((_, index) => (
                      <FormGroupListItem key={index} index={index}>
                        {({ remove }) => (
                          <div>
                            <form.Field name={`phones[${index}].number`}>
                              {(field) => (
                                <input
                                  data-testid={`phone-${index}`}
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                />
                              )}
                            </form.Field>
                            <button type="button" onClick={remove}>
                              Удалить {index}
                            </button>
                          </div>
                        )}
                      </FormGroupListItem>
                    ))}
                    <button type="button" onClick={() => pushValue({ number: '' })}>
                      Добавить
                    </button>
                  </>
                )}
              </FormGroupList>
            )}
          </form.Field>
        </form>
      )
    }

    render(<TestForm />)

    // Изначально 1 телефон
    expect(screen.getByTestId('phone-0')).toBeInTheDocument()

    // Добавляем второй
    fireEvent.click(screen.getByText('Добавить'))
    await waitFor(() => {
      expect(screen.getByTestId('phone-1')).toBeInTheDocument()
    })

    // Удаляем первый
    fireEvent.click(screen.getByText('Удалить 0'))
    await waitFor(() => {
      expect(screen.queryByTestId('phone-1')).not.toBeInTheDocument()
    })
  })
})
```

### Форма с Middleware

```typescript
describe('Integration: Форма с Middleware', () => {
  it('должен трансформировать данные через middleware и отправить', async () => {
    const onSubmit = vi.fn()
    const afterSuccess = vi.fn()

    render(
      <Form
        initialValue={{ name: 'john' }}
        onSubmit={onSubmit}
        middleware={{
          beforeSubmit: (data) => ({
            ...data,
            name: data.name.toUpperCase(),
          }),
          afterSuccess,
        }}
      >
        <Form.Field.String name="name" label="Имя" />
        <Form.Button.Submit>Отправить</Form.Button.Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'JOHN' })
      expect(afterSuccess).toHaveBeenCalledWith({ name: 'JOHN' })
    })
  })
})
```

---

## Статус тестов

### Фаза 1 — Базовые компоненты

| Модуль                    | Unit тесты | Integration тесты | Статус |
| ------------------------- | ---------- | ----------------- | ------ |
| `form-group.tsx`          | 3          | -                 | ⬜     |
| `form-field.tsx`          | 3          | -                 | ⬜     |
| `tanstack-form-field.tsx` | 2          | -                 | ⬜     |
| `chakra-form-field.tsx`   | 4          | -                 | ⬜     |
| `form-group-list.tsx`     | 5          | 1                 | ⬜     |
| `context.ts`              | 2          | -                 | ⬜     |
| `form-hook.ts`            | 1          | 1                 | ⬜     |

### Фаза 2 — Новые фичи (v0.41.0+)

| Модуль                       | Unit тесты | Integration тесты | Статус |
| ---------------------------- | ---------- | ----------------- | ------ |
| `form-middleware`            | 4          | 1                 | ⬜     |
| `field-auto.tsx`             | 5          | -                 | ⬜     |
| `camelCaseToLabel`           | 2          | -                 | ⬜     |
| `field-cascading-select.tsx` | 3          | -                 | ⬜     |
| `form-builder.tsx`           | 5          | -                 | ⬜     |

**Фаза 1:** 20 unit + 2 integration = 22 теста
**Фаза 2:** 19 unit + 1 integration = 20 тестов
**Всего:** 39 unit + 3 integration = 42 теста

---

## Команды

```bash
# Запуск всех тестов
nx test @letar/forms

# Запуск с покрытием
nx test @letar/forms --coverage

# Запуск в watch режиме
nx test @letar/forms --watch

# Запуск конкретного файла
nx test @letar/forms --testFile=form-group.spec.tsx
```

---

## Метрики покрытия

| Метрика                    | Цель | Текущее                                 |
| -------------------------- | ---- | --------------------------------------- |
| Тест-файлы                 | 80+  | 109 ✅                                  |
| Тест-кейсы (it блоки)      | 800+ | 1006 ✅                                 |
| describe блоки             | —    | 403                                     |
| Исходные файлы без тестов  | <50  | ~103 (из них ~60 UI-обёртки/re-exports) |
| Field покрытие (категории) | >90% | ~85% (datetime, boolean, number — 100%) |

---

## DX фичи v0.79-0.80 (Фаза 6)

### mapServerErrors

| Тест                              | Тип      | Статус           |
| --------------------------------- | -------- | ---------------- |
| Prisma P2002 одиночное поле       | Unit     | ✅               |
| Prisma P2002 составной constraint | Unit     | ✅               |
| Prisma P2002 кастомный fieldMap   | Unit     | ✅               |
| Prisma P2002 без meta.target      | Unit     | ✅               |
| Prisma P2003 field_name           | Unit     | ✅               |
| Prisma P2025 not found            | Unit     | ✅               |
| ZenStack rejected-by-policy       | Unit     | ✅               |
| ZenStack cannot-read-back         | Unit     | ✅               |
| ZenStack db-query + Prisma        | Unit     | ✅               |
| ZenStack not-found                | Unit     | ✅               |
| Zod flatten fieldErrors           | Unit     | ✅               |
| Zod flatten formErrors            | Unit     | ✅               |
| ActionResult string               | Unit     | ✅               |
| ActionResult nested               | Unit     | ✅               |
| Error объект                      | Unit     | ✅               |
| Error с .info ZenStack            | Unit     | ✅               |
| null/undefined fallback           | Unit     | ✅               |
| locale: en                        | Unit     | ✅               |
| кастомный defaultMessage          | Unit     | ✅               |
| format: prisma                    | Unit     | ✅               |
| **Bench: throughput**             | **Perf** | **10M+ ops/sec** |

### useFormHistory

| Тест                       | Тип  | Статус |
| -------------------------- | ---- | ------ |
| HistoryEntry структура     | Unit | ✅     |
| Mock store subscribe/unsub | Unit | ✅     |
| Mock setFieldValue         | Unit | ✅     |

### Form.Analytics

| Тест                          | Тип      | Статус           |
| ----------------------------- | -------- | ---------------- |
| Umami adapter name + track    | Unit     | ✅               |
| Umami track с globalThis      | Unit     | ✅               |
| YM adapter + reachGoal        | Unit     | ✅               |
| GA4 adapter + gtag event      | Unit     | ✅               |
| PostHog adapter + capture     | Unit     | ✅               |
| **Bench: adapter throughput** | **Perf** | **25M+ ops/sec** |

### FormReadOnlyView

| Тест                  | Тип    | Статус |
| --------------------- | ------ | ------ |
| Отображает все поля   | Render | ✅     |
| Кастомные labels      | Render | ✅     |
| exclude фильтрация    | Render | ✅     |
| include фильтрация    | Render | ✅     |
| Boolean Да/Нет        | Render | ✅     |
| null → "—"            | Render | ✅     |
| Кастомный formatter   | Render | ✅     |
| humanizeKey camelCase | Render | ✅     |
| compact режим         | Render | ✅     |

### FormSkeleton

| Тест                     | Тип    | Статус |
| ------------------------ | ------ | ------ |
| Рендер с числом полей    | Render | ✅     |
| Рендер с Zod-like schema | Render | ✅     |
| Рендер с default полей   | Render | ✅     |
| showSubmit=false         | Render | ✅     |

### FormComparison

| Тест                                      | Тип    | Статус |
| ----------------------------------------- | ------ | ------ |
| Отображает все поля                       | Render | ✅     |
| Было/Стало для изменённых                 | Render | ✅     |
| Не показывает Было/Стало для неизменённых | Render | ✅     |
| onlyChanged скрывает неизменённые         | Render | ✅     |
| exclude фильтрация                        | Render | ✅     |
| "Нет изменений" при одинаковых данных     | Render | ✅     |
| Кастомные labels                          | Render | ✅     |
| Boolean форматирование                    | Render | ✅     |

### E2E тесты (form-develop-app)

| Файл                       | Тестов | Статус |
| -------------------------- | ------ | ------ |
| server-errors-demo.spec.ts | 5      | ✅     |
| analytics-demo.spec.ts     | 4      | ✅     |
| undo-redo-demo.spec.ts     | 4      | ✅     |

### Итого DX фичи

| Тип       | Количество                                                        |
| --------- | ----------------------------------------------------------------- |
| Unit      | 24 (server-errors) + 3 (history) + 9 (analytics) = 36             |
| Render    | 9 (ReadOnly) + 5 (Skeleton) + 8 (Comparison) + 1 (DependsOn) = 23 |
| E2E       | 13                                                                |
| Bench     | 2 файла (16 бенчмарков)                                           |
| **Всего** | **72 + 16 bench**                                                 |

---

### Аудит v0.84.1 (2026-04-04)

| Тип         | Количество            |
| ----------- | --------------------- |
| Unit/Render | 1006                  |
| Bench       | 16                    |
| E2E         | 25 (form-develop-app) |
| **Всего**   | **1047**              |

**Критические пробелы (закрыты в v0.84.1):**

- `create-form.tsx` — фабрика createForm (ранее без тестов)
- `form-autosave.ts` — серверное автосохранение (ранее без тестов)
- `document/` — 7 документных полей UI-компонентов (ранее без тестов)

---

**Последнее обновление:** 2026-04-04 (v0.84.1, аудит качества)
