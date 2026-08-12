# @letar/ui

Shared UI компоненты для приложений Letar.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { ConfirmDialog, RatingStars, TopLoader } from '@letar/ui'
```

## Компоненты

### TopLoader

Индикатор загрузки страницы в стиле YouTube.

```tsx
import { TopLoader } from '@letar/ui'
<TopLoader />
```

### ConfirmDialog

Диалог подтверждения действия.

```tsx
import { ConfirmDialog } from '@letar/ui'
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Удалить запись?"
  description="Это действие нельзя отменить"
  onConfirm={handleDelete}
/>
```

### RatingStars / RatingDisplay

Компоненты для отображения рейтинга.

```tsx
import { RatingDisplay, RatingStars } from '@letar/ui'

// Интерактивные звёзды
<RatingStars value={rating} onChange={setRating} />

// Только отображение
<RatingDisplay value={4.5} />
```

### StatusBadge

Универсальный статус-бейдж с конфигурируемыми цветами и лейблами — одна карта конфигурации
на все значения enum'а статуса, не свитч в каждом месте использования.

```tsx
import { StatusBadge, type StatusConfig } from '@letar/ui'

const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  PENDING: { label: 'Ожидает', colorPalette: 'yellow' },
  CONFIRMED: { label: 'Подтверждён', colorPalette: 'blue' },
  COMPLETED: { label: 'Завершён', colorPalette: 'green' },
  CANCELLED: { label: 'Отменён', colorPalette: 'red' },
}

<StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
```

### QuantityStepper

Степпер количества «− N +» для корзины. Поля свободного ввода намеренно нет — набор кликами
не даёт написать опечатку вроде «11» вместо «1»; значение всегда целое и зажато в `[min, max]`.

```tsx
import { QuantityStepper } from '@letar/ui'
<QuantityStepper value={qty} onChange={setQty} min={1} max={99} ariaLabel="Количество товара" />
```

### Tooltip

Обёртка над Chakra `Tooltip` с портализацией по умолчанию, стрелкой и `disabled`-состоянием
(когда `disabled` — рендерит только `children`, без триггера тултипа).

```tsx
import { Tooltip } from '@letar/ui'
<Tooltip content="Скопировать в буфер">
  <IconButton aria-label="Копировать"><LuCopy /></IconButton>
</Tooltip>
```

### AppEmptyState

Пустое состояние для списков и результатов поиска — обёртка над Chakra `EmptyState` с иконкой
(по умолчанию `LuInbox`), заголовком, описанием и опциональной кнопкой действия (`onAction` или
`actionHref`).

```tsx
import { AppEmptyState } from '@letar/ui'
<AppEmptyState title="Нет записей" description="Добавьте первую запись" actionLabel="Добавить" onAction={openModal} />
```

### ExternalLink

Иконка-ссылка на внешний ресурс (соцсети, email, GitHub) — квадратная кнопка с ripple-эффектом
(`Pressable`), открывает в новой вкладке с `rel="noopener noreferrer"`.

```tsx
import { ExternalLink } from '@letar/ui'
<ExternalLink href="https://vk.com/example" aria-label="ВКонтакте" size="lg">
  <FaVk />
</ExternalLink>
```

### CoverImage

Клиентская граница `AspectRatio` + `Image`/иконка-фолбэк для карточек товаров/объектов, у
которых обложка может отсутствовать (`imageUrl: null` → рендерится `icon`, не сломанная
картинка). Уже объявляет `'use client'` — Server Component-родитель может рендерить её
напрямую без собственной обёртки (`AspectRatio`/`Image` в Chakra v3 клиентские, при пересечении
Server→Client границы `Children.only` внутри `AspectRatio` иначе падает).

```tsx
import { CoverImage } from '@letar/ui'
<CoverImage imageUrl={house.coverUrl} alt={house.title} icon={<LuHome />} ratio={4 / 3} />
```

### DeleteAccountZone

Секция «Опасная зона» с подтверждаемым удалением аккаунта (152-ФЗ ст. 21) — обёртка над
`TriggerConfirmDialog` с готовым текстом предупреждения.

```tsx
import { DeleteAccountZone } from '@letar/ui'
<DeleteAccountZone onDelete={deleteAccountAction} redirectUrl="/sign-in" />
```

### PasswordInput / PasswordStrengthMeter

Поле пароля с кнопкой видимости (`LuEye`/`LuEyeOff`, `mousedown`-safe — не сбивает фокус
инпута) и опциональный индикатор надёжности пароля рядом.

```tsx
import { PasswordInput, PasswordStrengthMeter } from '@letar/ui'
<PasswordInput placeholder="Пароль" {...field.getInputProps()} />
<PasswordStrengthMeter value={password} />
```

### Pressable / PressableButton

Box- и Button-обёртки с position-aware ripple на десктопе (эффект расходится от точки клика
мышью) и CSS spring-анимацией на тач-устройствах. `PressableButton` — готовая кнопка;
`Pressable` — обёртка для произвольного контента (например `Button asChild` с `Link` внутри,
где сам `asChild`-паттерн не даёт использовать `PressableButton` напрямую). Требуют
`pressableConfig` в `defineConfig()` приложения (ключевые кадры `ripple-expand`/`pressable-spring`).

```tsx
import { Pressable, PressableButton } from '@letar/ui'

<PressableButton colorPalette="brand" onClick={handleClick}>Сохранить</PressableButton>

<Pressable borderRadius="md" display="inline-flex">
  <Button asChild><Link href="/about">О нас</Link></Button>
</Pressable>
```

### CookieBanner / CookieSettingsButton

Баннер cookie-согласий (152-ФЗ) с тремя категориями (необходимые/аналитика/маркетинг),
`localStorage` + опциональный POST на `consentApiUrl` для лога согласия в БД.
`CookieSettingsButton` — кнопка в подвале для повторного открытия баннера (шлёт `CustomEvent`,
баннер сам подписан). Namespace localStorage/событий строится через `createConsentConfig`
(см. ниже) — на нём же завязан `useAnalyticsConsent`/`AnalyticsGate`.

```tsx
import { CookieBanner, CookieSettingsButton } from '@letar/ui'
<CookieBanner appKey="my-app" privacyUrl="/privacy" />
// в подвале:
<CookieSettingsButton appKey="my-app" />
```

⚠️ У `CookieBanner` и `StickyActionBar` общая CSS-переменная высоты — если оба на экране
одновременно (`position: fixed/sticky; bottom: 0`), `StickyActionBar` сам приподнимается над
баннером, координация уже встроена.

### createConsentConfig / readConsentState

Не React-компоненты — утилиты для namespace cookie-согласий, которыми пользуются
`CookieBanner`/`CookieSettingsButton`/`useAnalyticsConsent` внутри себя. Нужны напрямую только
для нестандартных случаев (например server-side чтение согласия для SSR-гейта).

```tsx
import { createConsentConfig, readConsentState } from '@letar/ui'
const config = createConsentConfig('my-app') // storageKey, event-имена, policyVersion
const state = readConsentState(config.storageKey) // CookieConsentState | null, только на клиенте
```

### BuildVersion / StudioCredit

Утилитарные строки для подвала сайта. `BuildVersion` — версия сборки (не рендерится, если
`version` не передан — удобно для условного вывода из `package.json`/env). `StudioCredit` —
ссылка «Сделано в studio.letar.best» с UTM-меткой источника для трекинга переходов в Umami
студии.

```tsx
import { BuildVersion, StudioCredit } from '@letar/ui'
import pkg from '../../package.json'

<BuildVersion version={pkg.version} />
<StudioCredit app="kami" />
```

### Header

Compound-компонент для адаптивного хедера: логотип, навигация, действия, мобильное меню.
Sticky + blur-фон по умолчанию.

```tsx
import { Header } from '@letar/ui'

const navItems = [
  { href: '/', label: 'Главная', exact: true },
  { href: '/catalog', label: 'Каталог' },
]

<Header blurBackdrop sticky>
  <Header.Logo>My Brand</Header.Logo>
  <Header.Nav items={navItems} />
  <Header.Spacer />
  <Header.Actions>
    <UserMenu {...userMenuProps} />
  </Header.Actions>
  <Header.MobileActions>
    <Header.MobileMenu items={navItems} />
  </Header.MobileActions>
</Header>
```

### UserMenu / MobileAuthSection

Меню пользователя: кнопка «Войти», когда сессии нет; dropdown с профилем, доп. пунктами,
ссылкой на аккаунт в Ключнице и выходом — когда есть. `MobileAuthSection` — та же логика,
но как список пунктов для мобильного drawer (`Header.MobileMenu`/`footerSlot`), не dropdown.

```tsx
import { UserMenu } from '@letar/ui'
<UserMenu
  session={session}
  onSignIn={() => authClient.signIn.social({ provider: 'letar-auth' })}
  onSignOut={() => authClient.signOut()}
  profileHref="/profile"
/>
```

### LightboxViewer

Низкоуровневый лайтбокс (`yet-another-react-lightbox` + Zoom + Fullscreen) для случаев, когда
не подходит готовый `PhotoGallery` (например свой триггер открытия вместо сетки превью).

```tsx
import { LightboxViewer } from '@letar/ui'
<LightboxViewer
  open={isOpen}
  index={currentIndex}
  close={() => setIsOpen(false)}
  slides={[{ src: '/image1.jpg', alt: 'Изображение 1' }]}
/>
```

### StatCard / RoleStat

Карточки статистики для дашбордов.

```tsx
import { RoleStat, StatCard } from '@letar/ui'

<StatCard title="Пользователи" value={1234} />
<RoleStat role="ADMIN" count={5} />
```

### OptimizedAvatar

Оптимизированный аватар с lazy loading.

```tsx
import { OptimizedAvatar } from '@letar/ui'
<OptimizedAvatar src="/avatar.jpg" name="Иван" />
```

### ReviewCard

Карточка отзыва.

```tsx
import { ReviewCard } from '@letar/ui'
<ReviewCard review={{ text: 'Отличный сервис!', rating: 5 }} author={{ name: 'Анна', avatar: '/anna.jpg' }} />
```

### StickyActionBar

Липкая панель основного действия внизу экрана. Решает системную проблему: основная
CTA («Начать», «Отправить», «Продолжить») уходит под фолд на длинных интро/формах и не
видна без скролла. `position: sticky; bottom: 0` держит её всегда на виду; учитывает
`safe-area-inset-bottom` (home-indicator iOS).

⚠️ Размещай как **последний ребёнок** прокручиваемого контейнера. Sticky ломается, если
у любого предка задан `overflow` (кроме `visible`).

```tsx
import { StickyActionBar, useScrollGate } from '@letar/ui' // Простой случай — всегда видимая CTA
<StickyActionBar>
  <Button colorPalette="brand" size="lg" onClick={onStart}>Начать</Button>
</StickyActionBar>

// С гейтом «прочитай до конца»
const { sentinelRef, reachedEnd } = useScrollGate({ enabled: !consentGiven })
<>
  <LongContent />
  <Box ref={sentinelRef} aria-hidden h="1px" />
  <StickyActionBar>
    <Button disabled={!reachedEnd} onClick={onStart}>Начать</Button>
  </StickyActionBar>
</>
```

### AdminEditOverlay

Иконка-карандаш поверх карточки, ведущая в раздел редактирования (например `/admin/[slug]`).
Для inline admin-controls на публичных страницах — рендерится только если `isAdmin()` вернул
`true` на сервере (см. [auth.md](/.claude/docs/auth.md#inline-admin-controls-на-публичных-страницах-server-side)).

⚠️ Если карточка уже обёрнута в `Link`/`NextLink` — клади `AdminEditOverlay` как sibling
внутри `Box position="relative"`, не внутрь анкора (вложенные `<a>` невалидны).

```tsx
import { AdminEditOverlay } from '@letar/ui'
<Box position="relative">
  {isAdmin && <AdminEditOverlay href={`/admin/${slug}`} colorPalette="brand" />}
  <Link asChild>
    <NextLink href={`/item/${slug}`}>...карточка...</NextLink>
  </Link>
</Box>
```

### PhotoGallery

Сетка превью с лайтбоксом (yet-another-react-lightbox + Zoom + Fullscreen). Превью грузятся через
`next/image` с дефолтным `quality`, а полноразмерное фото в лайтбоксе — через `/_next/image` с
`lightboxQuality` (по умолчанию **85**).

⚠️ **Next.js 16 по умолчанию разрешает только `quality: 75`.** Если твой `next.config` не
переопределяет `images.qualities`, `/_next/image` вернёт **400** при открытии лайтбокса (превью на
дефолтных 75 при этом продолжат грузиться нормально — баг незаметен в сетке, только при клике на
фото). Обязательно добавь в `next.config.mjs` потребителя:

```js
const nextConfig = {
  images: { qualities: [75, 85] }, // 75 — дефолт превью, 85 — lightboxQuality
}
```

(наступили на этот баг в `aprel8008` — см. `apps/aprel8008/CHANGELOG.md` 2026-07-21).

```tsx
import { PhotoGallery } from '@letar/ui'
<PhotoGallery photos={photos.map((p) => ({ src: `/api/files/${p.path}`, alt: p.alt }))} />
```

### ImageMagnifier

Изображение с лупой: под курсором участок показывается в натуральном разрешении 1:1, вокруг — то же
изображение, ужатое до контейнера. Нужен там, где мелкая деталь физически теряется при уменьшении и
её надо показать, не обманывая зрителя монтажом — пиксели берутся из того же файла.

Мышь ведёт лупу, клик закрепляет; тап ставит лупу в точку (скролл не блокируется); стрелки двигают,
Enter/Space закрепляет. При появлении в зоне видимости лупа один раз проезжает сама (`autoDemo`),
`prefers-reduced-motion` уважается.

```tsx
import { ImageMagnifier } from '@letar/ui'
<ImageMagnifier
  src="/demo/poster-fragment.webp"
  placeholderSrc="/demo/poster-fragment-far.webp"
  naturalWidth={3200}
  naturalHeight={2200}
  alt="Фрагмент постера: вблизи проступают слова"
  hint="Наведите — как будто подошли ближе"
/>
```

⚠️ **`src` грузится с `unoptimized`** — через `/_next/image` пришла бы масштабированная копия, и
координаты лупы разъехались бы. Файл отдаётся как есть, поэтому класть в `public/` надо уже
подготовленный кроп, а не исходник на десятки мегабайт.

Полный файл грузится лениво, и до его загрузки лупа не работает — до этого момента виден только
`placeholderSrc`. Ставить `priority` через `next/image` тут не стоит: файл тяжёлый, а секция обычно
не первый экран.

`lensSize` — верхняя граница: реальный диаметр ужимается до долей контейнера, иначе на узком экране
лупа закрывает весь кадр и сравнивать «мелко/крупно» не с чем.

### SortablePhotoGrid (`@letar/admin-ui`)

Сетка фото с drag&drop-сортировкой (`@dnd-kit`, мышь/тач/клавиатура) и опциональной кнопкой
«Сделать главной» — первое фото в порядке считается cover. Загрузку файлов держит вызывающий
компонент, эта сетка только сортирует/удаляет/помечает главное через переданные server actions.

```tsx
import { SortablePhotoGrid } from '@letar/admin-ui'
<SortablePhotoGrid
  items={photos.map((p) => ({ id: p.id, imageUrl: `/api/files/${p.path}` }))}
  onReorder={(orderedIds) => reorderPhotosAction(estateSlug, orderedIds)}
  onSetCover={(id) => setCoverPhotoAction(id)}
  onDelete={(id) => deletePhotoAction(id)}
  onChanged={() => router.refresh()}
/>
```

### FaqAccordion

Список вопрос-ответ на базе Chakra `Accordion` — вынесен после того, как одна и та же
разметка (`Accordion.Item`/`ItemTrigger`/`ItemIndicator`/`ItemContent`) независимо
появилась в aboi, driving-school и animatrona-landing.

```tsx
import { FaqAccordion } from '@letar/ui'
<FaqAccordion
  items={[{ question: 'Как это работает?', answer: 'Вот так.' }]}
  variant="enclosed" // любой проп Accordion.Root проходит насквозь
  icon={<LuCircleHelp />} // опционально, одна иконка на все пункты
  defaultOpenFirst // опционально, раскрыть первый вопрос сразу
/>
```

Обёртку секции (заголовок, motion-анимация, `Dialog`) компонент не берёт на себя —
это остаётся на стороне приложения. Если пункту нужна точечная стилизация (бордер,
фон, `_open`-состояние) — прокинь `itemProps`. Для сильно кастомных случаев (glass-тема
и hover в animatrona-landing, CSS-анимация появления по скроллу в kami) общий компонент
не подошёл бы без раздувания пропсов — там оставлены собственные реализации.

### FileTrigger

Триггер выбора файла без запрещённого правилами Chakra UI v3 (`.claude/rules/components.md`)
пропа `as="label"` и без риска вложить `<input>` в `<label>` (двойной клик/toggle — см.
антипаттерн там же): скрытый `<input type="file">` рендерится компонентом как сосед
`children`, а не их потомок, поэтому неправильную вложенность физически не написать.
Вынесен после того, как один и тот же ручной паттерн (`useId()` + `Button asChild` +
соседний `<input>`) независимо появился в mandala, driving-school и label-printer-desktop.

`children` — render-prop, сам решает, во что обернуть `<label htmlFor={htmlFor}>`
(`Button asChild`, `Text asChild`, обычный `<label>`) — компонент не навязывает конкретный
Chakra-элемент. `onChange` принимает тот же `React.ChangeEvent<HTMLInputElement>`, что и
обычный `<input type="file" onChange={...}>`, поэтому существующие обработчики (например
`useImageUpload().handleFileSelect`) подключаются без изменений.

```tsx
import { FileTrigger } from '@letar/ui'
<FileTrigger accept="image/*" multiple onChange={handleFileSelect}>
  {({ htmlFor }) => (
    <Button asChild size="sm" variant="outline">
      <label htmlFor={htmlFor}>
        <LuPlus />
        Добавить изображения
      </label>
    </Button>
  )}
</FileTrigger>
```

### CopyToClipboardButton

Тонкая кнопка-обёртка над `useCopyToClipboard`. Вынесена после того, как один и тот же ручной
паттерн (`useState(copied)` + `navigator.clipboard.writeText` + `setTimeout` сброса подписи,
без единой реализации fallback на `execCommand`) независимо появился в domwellbes,
driving-school, aboi, mandala, archetest и aprel8008.

`text` принимает и строку, и функцию — функция нужна там, где значение нельзя вычислить во
время рендера (например `window.location.href` в клиентском компоненте: вычисление в рендере
даёт hydration mismatch, вычисление по клику — нет).

```tsx
import { CopyToClipboardButton } from '@letar/ui'
<CopyToClipboardButton text={() => window.location.href} label="Скопировать ссылку" />
```

## Хуки

### useServiceWorker

Хук для работы с Service Worker.

```tsx
import { useServiceWorker } from '@letar/ui'

const { registration, updateAvailable, update } = useServiceWorker()
```

### useScrollGate

Гейт «прочитай до конца перед действием». Наблюдает за маркером-`sentinel` в конце
контента через IntersectionObserver: как только маркер показался — `reachedEnd`
становится `true` навсегда. Если контент короче экрана — гейт открывается сразу.
`enabled: false` отключает гейт (например, когда согласие уже дано). См. пример в
[StickyActionBar](#stickyactionbar).

```tsx
import { useScrollGate } from '@letar/ui'

const { sentinelRef, reachedEnd } = useScrollGate({ enabled: true })
```

### useAnalyticsConsent / AnalyticsGate

Consent-aware гейтинг аналитики (152-ФЗ, `.claude/docs/personal-data.md §5`). Читает состояние
согласия из localStorage (namespace общий с `CookieBanner`/`createConsentConfig`) и реактивно
обновляется по событию `{appKey}:consent-change`. `AnalyticsGate` — Client Component-обёртка для
использования прямо в Server Component layout, без отдельного `analytics-consent.tsx` на каждое
приложение:

```tsx
// Server Component layout.tsx
import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate, CookieBanner } from '@letar/ui'

;<AnalyticsGate appKey="my-app">
  <UmamiScript />
</AnalyticsGate>
<CookieBanner appKey="my-app" />
```

`AnalyticsGate` принимает несколько `children` — удобно для приложений с двумя счётчиками
(например, Umami + Yandex Metrika), не требует по обёртке на каждый. Хук `useAnalyticsConsent`
экспортируется отдельно для нестандартных случаев (напр. когда компонент аналитики сам принимает
`hasConsent` пропом, как `@letar/yandex-metrika`).

### useCopyToClipboard

Копирование текста в буфер обмена с fallback на `execCommand('copy')` через временный
`<textarea>` — `navigator.clipboard.writeText` требует секьюрный контекст и фокус документа и
падает, например, сразу после клика, снявшего фокус с вкладки.

```tsx
import { useCopyToClipboard } from '@letar/ui'

const { copied, copy } = useCopyToClipboard()
// <Button onClick={() => copy(url)}>{copied ? 'Скопировано' : 'Копировать'}</Button>
```

## Команды

```bash
nx build ui
nx test ui
nx lint ui
```
