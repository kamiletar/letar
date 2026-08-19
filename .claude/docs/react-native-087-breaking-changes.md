# React Native 0.85→0.87 — breaking changes при миграции

⚠️ Найдено в сессиях `animatrona-mobile-dev` и `animatrona-tv-dev` (agent-mail тред
`cascade-rn-087-migration`, 2026-08-19) при миграции двух приложений подряд. Не привязано к
Animatrona — общая ловушка для любого будущего React Native приложения монорепо.

## 1. Codegen-типы переехали в публичный корень пакета

`react-native/Libraries/Types/CodegenTypes` и
`react-native/Libraries/Utilities/codegenNativeCommands` — приватные пути, доступные в старых
версиях, но уже начиная с 0.85 (не только 0.87) их надо заменять на публичный экспорт:

```typescript
// ❌ было
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'

// ✅ стало
import type { Int32 } from 'react-native'
import { codegenNativeCommands } from 'react-native'
```

## 2. `UIManager.getViewManagerConfig(...).Commands` потерял типизацию

Возвращаемый тип больше не гарантирует форму `Commands`. Явно приводить:

```typescript
const config = UIManager.getViewManagerConfig('MyNativeView') as { Commands: Record<string, number> }
```

## 3. `NativeEventEmitter.addListener` — новая сигнатура колбэка

Колбэк теперь типизирован как `(...args: readonly Object[]) => unknown`. Старые типизированные
колбэки (`(event: MyEventType) => void`) ломаются на сигнатуре. Приводить `args[0]` внутри тела:

```typescript
emitter.addListener('myEvent', (...args) => {
  const event = args[0] as MyEventType
  // ...
})
```

## 4. `StatusBar` потерял `backgroundColor`/`translucent` на Android

Android теперь всегда edge-to-edge — эти пропы больше не действуют, убирать без замены (либо
переходить на `react-native-edge-to-edge`/аналог, если нужен явный контроль).

## 5. Ref у `Animated.View` (Reanimated) больше не даёт `measureInWindow` через тип `View`

Прямой доступ к `measureInWindow` через стандартный тип `View` для рефа `Animated.View` не
проходит typecheck. Нужен узкий локальный интерфейс:

```typescript
interface MeasurableRef {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void
}
const ref = useAnimatedRef<Animated.View>()
;(ref.current as unknown as MeasurableRef)?.measureInWindow(...)
```

## 6. `@types/react-native` как отдельная devDependency — удалить

RN несёт собственные bundled-типы с 0.71+. Если `@types/react-native` всё ещё стоит явной
зависимостью — конфликтует с bundled-типами:

```
TS2719: type X is not assignable to type X: two different types with this name exist,
but they are unrelated.
```

Фикс — удалить пакет из `package.json`, полагаться на типы из самого `react-native`.

## 7. `PressableStateCallbackType`: `interface` → `type` — declaration merging тихо ломается

⚠️ Самая опасная находка — ломается **без ошибки компиляции**.

```typescript
// ❌ раньше работало через declaration merging (interface можно расширять)
declare module 'react-native' {
  interface PressableStateCallbackType {
    hovered: boolean
  }
}
// после 0.87 PressableStateCallbackType — это `type`, не `interface`.
// Declaration merging над `type` невозможен в TS в принципе — но тут нет ошибки,
// объявление просто игнорируется молча, поле `hovered` типом не подхватывается.
```

Фикс — локальный intersection-тип, с явной аннотацией в каждом месте использования, а не
глобальное расширение:

```typescript
type MyPressableState = PressableStateCallbackType & { hovered: boolean }

<Pressable>
  {(state: MyPressableState) => ...}
</Pressable>
```

## 8. `StyleSheet.absoluteFillObject` → `absoluteFill`

Переименовано. Старое имя ещё может резолвиться в рантайме за счёт кеша типов, но typecheck на
чистой установке падает.

## 9. `TextInput` ref-тип — `TextInputInstance`

Старый тип рефа `TextInput` заменён на `TextInputInstance`, если где-то был явный
`useRef<TextInput>(null)` — типизировать как `useRef<TextInputInstance>(null)`.

## 10. `FlatList.ListFooterComponent` не принимает `null`

Проп типизирован как `ComponentType | ReactElement | undefined` — раньше проходил и `null`.
Условный рендер `condition ? <Footer /> : null` в типе `ListFooterComponent` теперь ошибка,
заменять на `undefined`.

## 11. `StyleSheet.flatten([...])` может вернуть `null`

Если результат передаётся в проп `style?: ViewStyle` (не принимающий `null`), добавлять `?? undefined`:

```typescript
const flatStyle = StyleSheet.flatten([styleA, styleB]) ?? undefined
```
