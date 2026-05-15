# Accessibility Audit Reference

## WCAG 2.1 AA Критерии

### Perceivable (Воспринимаемость)

#### 1.1 Text Alternatives

```tsx
// ✅ Правильно — alt для изображений
<Image src={src} alt="Описание изображения" />

// ✅ Правильно — aria-label для иконок
<IconButton aria-label="Удалить" icon={<DeleteIcon />} />

// ❌ Неправильно — пустой alt для значимого изображения
<Image src={src} alt="" />
```

#### 1.4 Distinguishable

**Цветовой контраст:**

| Элемент                                   | Минимальный контраст |
| ----------------------------------------- | -------------------- |
| Обычный текст                             | 4.5:1                |
| Крупный текст (≥18px bold, ≥24px regular) | 3:1                  |
| UI компоненты и графика                   | 3:1                  |

```tsx
// Проверка через Chakra tokens
<Text color="gray.700">Текст на белом фоне</Text>  // ✅ Контраст ОК
<Text color="gray.400">Текст на белом фоне</Text>  // ❌ Контраст слабый
```

### Operable (Управляемость)

#### 2.1 Keyboard Accessible

```tsx
// ✅ Правильно — все интерактивные элементы доступны с клавиатуры
<Button onClick={handleClick}>Действие</Button>

// ✅ Правильно — кастомный элемент с keyboard support
<Box
  as="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Кастомная кнопка
</Box>

// ❌ Неправильно — div с onClick без keyboard support
<Box onClick={handleClick}>Кликабельный div</Box>
```

#### 2.4 Navigable

**Focus management:**

```tsx
// ✅ Правильно — visible focus
<Button _focus={{ outline: '2px solid', outlineColor: 'blue.500' }}>
  Кнопка
</Button>

// ✅ Правильно — skip link
<Link href="#main-content" position="absolute" left="-9999px" _focus={{ left: 0 }}>
  Перейти к контенту
</Link>

// ❌ Неправильно — скрытый focus
<Button _focus={{ outline: 'none' }}>Кнопка</Button>
```

### Understandable (Понятность)

#### 3.3 Input Assistance

```tsx
// ✅ Правильно — labels для форм
<Field.Root>
  <Field.Label>Email</Field.Label>
  <Input type="email" />
  <Field.ErrorMessage>Некорректный email</Field.ErrorMessage>
</Field.Root>

// ✅ Правильно — aria-describedby для подсказок
<Input aria-describedby="email-hint" />
<Text id="email-hint" fontSize="sm">Формат: example@domain.com</Text>
```

### Robust (Надёжность)

#### 4.1 Compatible

```tsx
// ✅ Правильно — semantic HTML
<nav>
  <ul>
    <li><Link href="/">Главная</Link></li>
  </ul>
</nav>

// ❌ Неправильно — div soup
<Box>
  <Box>
    <Box onClick={...}>Главная</Box>
  </Box>
</Box>
```

---

## ARIA Patterns

### Roles

```tsx
// Navigation landmark
<Box as="nav" role="navigation" aria-label="Главное меню">

// Alert для уведомлений
<Alert role="alert" aria-live="polite">
  Сообщение сохранено
</Alert>

// Dialog для модальных окон
<Dialog.Content role="dialog" aria-modal="true" aria-labelledby="dialog-title">
```

### States

```tsx
// Expanded state
<Button aria-expanded={isOpen} aria-controls="dropdown-menu">
  Меню
</Button>

// Selected state
<Tab aria-selected={isActive}>Вкладка</Tab>

// Disabled state
<Button aria-disabled={isDisabled} disabled={isDisabled}>
  Кнопка
</Button>

// Busy state
<Button aria-busy={isLoading}>
  {isLoading ? <Spinner /> : 'Сохранить'}
</Button>
```

### Live Regions

```tsx
// Статус сообщения (вежливое уведомление)
<Box aria-live="polite" aria-atomic="true">
  {statusMessage}
</Box>

// Срочное уведомление
<Box role="alert" aria-live="assertive">
  {errorMessage}
</Box>
```

---

## Keyboard Navigation

### Focus Order

```tsx
// ✅ Правильно — логичный порядок через DOM
<VStack>
  <Input />      {/* tabIndex: 0 (auto) */}
  <Input />      {/* tabIndex: 0 (auto) */}
  <Button />     {/* tabIndex: 0 (auto) */}
</VStack>

// ❌ Неправильно — кастомный tabIndex нарушает порядок
<VStack>
  <Input tabIndex={2} />
  <Input tabIndex={1} />
  <Button tabIndex={3} />
</VStack>
```

### Focus Trap

```tsx
// Модальные окна должны ловить focus
import { FocusTrap } from '@chakra-ui/react'
;<Dialog.Content>
  <FocusTrap>
    <Dialog.Header />
    <Dialog.Body>
      <Input autoFocus /> {/* Первый фокус */}
    </Dialog.Body>
    <Dialog.Footer>
      <Button>Отмена</Button>
      <Button>Сохранить</Button>
    </Dialog.Footer>
  </FocusTrap>
</Dialog.Content>
```

### Keyboard Shortcuts

```tsx
// Escape для закрытия
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handleEscape)
  return () => document.removeEventListener('keydown', handleEscape)
}, [onClose])
```

---

## Screen Reader Support

### Визуально скрытый текст

```tsx
import { VisuallyHidden } from '@chakra-ui/react'

// Для screen readers
<IconButton aria-label="Удалить">
  <DeleteIcon />
</IconButton>

// Дополнительный контекст
<Button>
  Подробнее
  <VisuallyHidden> о товаре {productName}</VisuallyHidden>
</Button>
```

### Announce динамических изменений

```tsx
// Уведомление об изменениях
const [announcement, setAnnouncement] = useState('')

// При добавлении в корзину
setAnnouncement(`${productName} добавлен в корзину`)

<VisuallyHidden aria-live="polite" aria-atomic="true">
  {announcement}
</VisuallyHidden>
```

---

## Чеклист Accessibility Аудита

### Критичные (MUST)

- [ ] Все изображения имеют alt текст
- [ ] Цветовой контраст ≥ 4.5:1 для текста
- [ ] Все интерактивные элементы доступны с клавиатуры
- [ ] Focus visible на всех интерактивных элементах
- [ ] Формы имеют связанные labels
- [ ] Ошибки форм объявляются screen readers

### Важные (SHOULD)

- [ ] Используются semantic HTML элементы
- [ ] ARIA landmarks для навигации
- [ ] Skip links для длинных страниц
- [ ] Focus trap в модальных окнах
- [ ] aria-live для динамического контента

### Рекомендуемые (COULD)

- [ ] Поддержка reduced motion
- [ ] High contrast mode
- [ ] Масштабирование до 200% без потери функциональности
