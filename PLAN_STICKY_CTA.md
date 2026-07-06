# PLAN — Липкая CTA (StickyActionBar + useScrollGate) — тираж по монорепо

> Кросс-приложенческая UI-задача, не привязанная к auth-роадмапу в корневом `PLAN.md`. Ссылка на неё
> добавлена туда как указатель для следующей сессии.

## Зачем

На длинных интро/формах основная CTA-кнопка («Начать», «Отправить», «Оформить») уходит под фолд на
мобильном — пользователь не видит, что действие вообще есть. Решение уже реализовано и обкатано:
`StickyActionBar` + `useScrollGate` в `@letar/ui@0.7.0` (`libs/ui/src/lib/sticky-action-bar.tsx`,
`libs/ui/src/lib/use-scroll-gate.ts`), эталон — `apps/archetest` (`express-container.tsx`,
`quiz-intro.tsx`, коммит `4cec46f`). Паттерн задокументирован в
[`.claude/docs/ui-components.md`](.claude/docs/ui-components.md), раздел
«⭐ Основная CTA не должна уходить под фолд».

Эта задача — тираж паттерна на остальные приложения монорепо.

## Ключевое наблюдение

Почти все найденные формы используют общий декларативный API `@letar/forms`:
`<XForm.Button.Submit>` (`libs/forms/src/lib/declarative/form-buttons/button-submit.tsx`) и
`<XForm.Steps.Navigation>` (`libs/forms/src/lib/declarative/form-steps/form-steps-navigation.tsx`).
Оба рендерят голый `<Button>`/`<ButtonGroup>` без обёртки — их можно обернуть в `StickyActionBar`
**на уровне страницы конкретного приложения**, не трогая `libs/forms` и без делегации через
`FormsCoord` (`.claude/rules/form-delegation.md` касается только изменений самой библиотеки форм).

## Рецепт

```tsx
import { StickyActionBar, useScrollGate } from '@letar/ui'

const { sentinelRef, reachedEnd } = useScrollGate({ enabled: !consentGiven })

<Container pt={16} pb={0}>
  <VStack gap={8} pb={8}>
    {/* …контент…, чекбокс согласия если есть… */}
    <Box ref={sentinelRef} aria-hidden h="1px" w="100%" />
  </VStack>
  <StickyActionBar mx={{ base: -4, md: 0 }}>
    <XForm.Button.Submit disabled={!reachedEnd} w={{ base: '100%', sm: 'auto' }} minW={{ sm: '14rem' }}>
      Отправить
    </XForm.Button.Submit>
  </StickyActionBar>
</Container>
```

Правила: `StickyActionBar` — последний ребёнок скролл-контейнера (сиблинг контентного `VStack`, не
внутри него); `pt={16} pb={0}` на контейнере, `pb={8}` на контентном `VStack`; `mx={{ base: -4, md: 0 }}`
на баре для bleed к краям на мобильном; `useScrollGate` — только если экран требует обязательного
прочтения (согласие/условия — гейт совпадает с чекбоксом, если он уже есть).

## Чек-лист по приложениям

### Приоритет 1 — транзакционные формы (деньги/лиды, точно длинные)

- [ ] **aboi** — `apps/aboi/src/app/[locale]/(shop)/checkout/_components/checkout-form.tsx` — wizard
      (`AboiForm.Steps`, 3 шага), обернуть `<AboiForm.Steps.Navigation>` + `<AboiForm.Errors>`; на шаге
      «Оплата» есть чекбоксы согласия → `useScrollGate` + сентинел в конце шага 3. **Submodule** —
      `git checkout main` перед правкой.
- [ ] **aboi** — `apps/aboi/src/app/[locale]/(shop)/gift/_components/gift-form.tsx` — простой случай,
      `<AboiForm.Button.Submit>` в конце `Stack`, есть чекбокс согласия → гейт скроллом.
- [ ] **mandala** — `apps/mandala/src/app/[locale]/(main)/checkout/_components/checkout-form.tsx` —
      двухколоночный layout (`Stack direction={{base:'column', lg:'row'}}`), кнопка сейчас в
      `Card.Footer` правой колонки. **Вынести** `Button.Submit` из `Card.Footer` в `StickyActionBar` на
      уровне всего компонента, чтобы не зависеть от колонки на мобильном.
- [ ] **svoichuzhie** — `apps/svoichuzhie/src/app/merch/checkout/_components/checkout-form.tsx` — одна
      колонка, `Container > Stack`, кнопка в конце — прямое применение рецепта.
- [ ] **dsperevod** — `apps/dsperevod/src/app/(marketing)/zakaz/order-form.tsx` — длинная форма заказа
      (17+ полей) — прямое применение.
- [ ] **dsperevod** — `apps/dsperevod/src/app/_components/hero-quote-form.tsx` — форма быстрого расчёта
      в hero, короче, но ~12 элементов под фолдом на мобильном.
- [ ] **kami** — `apps/kami/src/app/[locale]/consulting/_components/consulting-form.tsx` —
      `Card.Root > Card.Body (Stack) + Card.Footer`, кнопка в `Card.Footer`. Вынести в `StickyActionBar`
      вне `Card.Root` (проверить в preview, не ломается ли sticky внутри `Card` — если ломается, вынести
      кнопку из Card целиком).

### Приоритет 2 — wizard-форма (не транзакционная, но длинная)

- [ ] **kami** — `apps/kami/src/app/[locale]/hire/_components/hire-form.tsx` — 7-шаговый wizard,
      навигация в локальном `CustomNavigation` (~строки 102–121), рендерит
      `<KamiForm.Steps.Navigation>` внутри `VStack`. Обернуть именно `<KamiForm.Steps.Navigation>` в
      `StickyActionBar`; блок ошибки (`error`) оставить в скроллящемся контенте, не в баре.

**Осознанно не берём:** `driving-school` (`sign-up`/`sign-in`) и другие auth-формы aboi/driving-school —
короткие (email+password+2 чекбокса), фолд-риск низкий.

### Приоритет 3 — лендинги (не формы; кнопка — CTA на длинной странице, не «сабмит»)

Здесь буквальный `StickyActionBar` не всегда подходит 1-в-1 — решение по каждому принимать после
preview на 375px:

- [ ] **animatrona-landing** — `apps/animatrona-landing/src/app/_components/hero-section.tsx` — кнопка
      обычно ещё в первом экране (риск низкий). Проверить в preview; если под фолдом — обернуть только
      для мобильной ширины.
- [ ] **animatrona-landing** — `apps/animatrona-landing/src/app/_components/downloads-section.tsx` —
      grid карточек-платформ, у каждой своя кнопка. `StickyActionBar` семантически не подходит (нет
      одного главного CTA) — **скорее всего оставить как есть**, только проверить, что кнопки в
      карточках не обрезаны.
- [ ] **kami-key-the-landing** — `apps/kami-key-the-landing/src/app/_components/downloads-section.tsx` —
      одна карточка, один primary CTA («Скачать .exe», сейчас disabled). Кандидат на рецепт, только
      если секция — единственный контент страницы; если секция среди прочих — `StickyActionBar`
      неуместен (заслонит остальной контент).
- [ ] **aprel8008** — `apps/aprel8008/src/app/page.tsx` — кнопка «Написать Татьяне →» — якорная ссылка
      на секцию «Контакты» посреди длинной страницы, после неё ещё есть контент. `StickyActionBar` даст
      неверную семантику (он «приклеивается» до конца скролла). **Рекомендация: не применять** этот
      паттерн сюда; если нужно поднять заметность — отдельная лёгкая sticky-навигация «к контактам», не
      через `StickyActionBar` в текущем виде. Уточнить с пользователем перед реализацией.

## Порядок выполнения на каждое приложение

1. Submodule (aboi, driving-school) → `cd apps/<app> && git checkout main && git pull origin main`
   перед правкой (см. `.claude/rules/git.md`).
2. Внести изменение по рецепту; проверить, что между `StickyActionBar` и скролл-контейнером страницы
   нет предков с `overflow` ≠ `visible`.
3. Проверить в preview на 375px: CTA видна без скролла, нет горизонтального скролла.
4. Поднять патч-версию в `package.json` приложения:
   - aboi 0.24.1 → 0.24.2
   - mandala 0.39.7 → 0.39.8
   - svoichuzhie 0.10.19 → 0.10.20
   - dsperevod 0.5.4 → 0.5.5
   - kami 0.31.0 → 0.31.1
   - animatrona-landing / kami-key-the-landing / aprel8008 — только если реально изменены
5. Обновить `CHANGELOG.md` приложения (создать секцию, если её нет).
6. Коммит:
   - submodule (aboi, driving-school) — сначала коммит+push внутри submodule, затем
     `git add apps/<app> && git commit` в letar для фиксации SHA.
   - обычное приложение — `git add apps/<app>/ && git commit -m "feat(<app>): sticky CTA — StickyActionBar/useScrollGate"`.
7. Без деплоя — только коммиты. Деплой (если понадобится) — исключительно через запрос `BlackCove` по
   `.claude/rules/deploy-coordination.md`, и только по отдельному явному запросу пользователя.
8. Перед коммитом: `nx lint <app> && nx typecheck:tsgo <app>`.

## Верификация (per экран, через `preview_*`)

1. `preview_start` нужного приложения.
2. `preview_resize` на `375x812` (mobile preset).
3. `preview_snapshot`/`preview_screenshot` — CTA видна во вьюпорте без скролла.
4. Скролл контента (`preview_eval`) — `StickyActionBar` остаётся приклеенной; для гейтящихся экранов
   кнопка активируется только после того как `sentinelRef` попал во вьюпорт (или после чекбокса).
5. `preview_console_logs` — нет ошибок гидратации/рендера.
6. `preview_resize` desktop — `mx={{ base: -4, md: 0 }}` не ломает layout, кнопка компактная по центру.

## Статус

⏳ Только план, реализация не начата (сессия планирования — 2026-07-06).
