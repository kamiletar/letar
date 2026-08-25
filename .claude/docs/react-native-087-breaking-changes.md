# React Native 0.85→0.87 — breaking changes при миграции

⚠️ Найдено в сессиях `animatrona-mobile-dev` и `animatrona-tv-dev` (agent-mail тред
`cascade-rn-087-migration`, 2026-08-19 и 2026-08-25) при миграции двух приложений подряд. Не
привязано к Animatrona — общая ловушка для любого будущего React Native приложения монорепо.

⚠️ Пункты 1-11 — компилируемые breaking changes самого RN. Пункты 12-13 ниже — **не ловятся
typecheck'ом вообще**, всплывают только на реальной сборке/запуске (`react-native bundle`,
`gradlew assembleDebug`) — обнаружены `animatrona-mobile-dev` при тесте на реальном устройстве
2026-08-25, перенесены в `animatrona-tv` в тот же день.

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

## 12. Android toolchain: RN 0.87 требует Gradle 9.4.1+ / AGP 9.2.1+ / Kotlin 2.2.0+

⚠️ Не ловится typecheck'ом — только реальной сборкой (`gradlew assembleDebug`). Симптом на
старом toolchain (Gradle 8.13, AGP 8.7.3, Kotlin 2.1.20) — сборка падает на несовместимости
AGP/Kotlin plugin API уже на этапе конфигурации.

Правки трёх файлов в `android/`:

```properties
# gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.4.1-bin.zip
```

```groovy
// android/build.gradle
kotlinVersion = "2.2.0"
// ...
classpath("com.android.tools.build:gradle:9.2.1")
```

```properties
# android/gradle.properties — обход AGP 9.0+ built-in Kotlin support
# конфликтует с явным org.jetbrains.kotlin.android плагином (нужен библиотекам вроде
# exoplayer-ass/exoplayer-sync) — ошибка "Cannot add extension with name 'kotlin'"
android.builtInKotlin=false
android.newDsl=false
```

`android.builtInKotlin`/`android.newDsl` — официальный, но временный откат-флаг AGP; уберут в
AGP 10. К тому моменту нужно будет снять явный `org.jetbrains.kotlin.android` со всех модулей,
которые его применяют, и перейти на built-in Kotlin support.

## 13. `metro.config.js`: строгий `require.resolve` для singleton-пакетов падает на deep imports

Паттерн «форсировать одну копию `react`/`react-native` (и других native-модулей) через
`resolveRequest`, чтобы bun-монорепо не плодило дубликаты» — рабочий на RN < 0.87, но версия с
`require.resolve(moduleName, { paths: [projectRoot] })` под 0.87 падает:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath
'./src/private/featureflags/ReactNativeFeatureFlags' is not defined by "exports" in
.../node_modules/react-native/package.json
```

Причина — `require.resolve` строго проверяет карту `exports` пакета, а RN 0.87 не экспортирует
все свои внутренние пути, на которые ссылаются транзитивные зависимости. Фикс — не резолвить
через Node напрямую, а подменить `originModulePath` контекста на путь внутри `node_modules`
приложения (файл может не существовать физически — важна только директория) и передать резолв
дальше штатному `context.resolveRequest`, который резолвит нестрого:

```javascript
resolveRequest: ;
;((context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName === 'react-native' /* и другие singleton-пакеты */) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'node_modules', '.singleton-anchor.js') },
      moduleName,
      platform,
    )
  }
  return context.resolveRequest(context, moduleName, platform)
})
```

Список перехватываемых пакетов — под фактические зависимости конкретного приложения
(`react-native-gesture-handler`, `-screens`, `-svg`, `-video`, `-safe-area-context`,
`@react-native-async-storage/async-storage` и т.п.), не общий шаблон один на всех.
