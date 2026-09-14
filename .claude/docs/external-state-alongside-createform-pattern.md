# Внешний `useState` рядом с `createForm`-инстансом

Приём для значений, которые физически находятся на той же странице, что и форма на
`createForm()`-инстансе приложения (`<AppForm>` + `Field.*`), но живут **вне** её Zod-схемы как
обычный React `useState`. Найден независимо в трёх местах за одну сессию (2026-09-14, перенос
форм `dsperevod` на `@letar/forms`) — конвергентная эволюция без списывания одного места с
другого, что и делает приём устоявшимся, а не случайным workaround:

1. `apps/archetest/src/app/[locale]/_components/professional-lead-form.tsx` —
   `consentPdn` (`useState<boolean>`), кнопка `disabled={!consentPdn}`.
2. `apps/dsperevod/src/app/(marketing)/zakaz/order-form.tsx` — три поля согласия
   (`consentPd`/`consentThirdParty`/`consentMarketing`) через `ConsentCheckboxes`, плюс отдельно
   `fileUrl`/`fileName`/`uploading` для immediate-upload вложения.
3. `apps/dsperevod/src/app/_components/hero-quote-form.tsx` — тот же паттерн `ConsentCheckboxes`
   без файла.

## Когда применять

Два разных триггера, у обоих общее — значение **не про валидацию бизнес-данных формы**:

**1. Юридическое согласие (152-ФЗ), не поле данных.** Чекбокс согласия на обработку ПДн — это
гейт кнопки сабмита, а не значение, которое валидируется Zod-схемой и уезжает в бизнес-модель
как есть. Он не имеет смысла как «невалидное значение поля» — он либо есть, либо сабмит
недоступен. `ConsentCheckboxes`/одиночный `Checkbox.Root` живёт рядом со схемой, `onCheckedChange`
пишет в `useState`, кнопка — `disabled={!consent}`, а флаг согласия уходит в server action
отдельным аргументом при вызове (не через `form.state.values`).

**2. Значение с собственным жизненным циклом, не совпадающим с submit формы.** Immediate-upload
файла (`fileUrl`/`fileName`/`uploading` в `order-form.tsx`) грузится в `/api/uploads` сразу по
`onChange`/`onBlur` инпута — до того, как пользователь нажал кнопку отправки самой формы, и
независимо от того, нажмёт ли он её вообще. У поля формы в `@letar/forms` нет своего async-flow
загрузки со статусом `uploading` — это либо готовое значение (`fileUrl`), либо процесс, идущий
параллельно вводу остальных полей. Внешний `useState` здесь — то место, где живёт статус
`uploading`/готовый URL, а в саму форму значение попадает уже как обычный `fileUrl: string`.

## Когда НЕ применять

**Не универсальная отмазка от Zod-схемы.** Обычное поле бизнес-данных (имя, телефон, сумма,
комментарий, любое значение, которое требует валидации и уезжает как есть в модель) — в схему,
через `Field.*`. Соблазн вынести поле в `useState` «чтобы не трогать схему» — типичный первый шаг
к обходу `@letar/forms` целиком, что запрещено правилом `.claude/rules/forms.md` («NEVER
используй нативный `<form>` + `useActionState` вместо `@letar/forms`»). Признак, что случай не
тот: значение **должно** валидироваться (обязательность, формат, диапазон) — тогда это поле
схемы, а не внешний state, даже если оно «просто чекбокс» (сравни: чекбокс «согласен с офертой»
без вариативности значения — кандидат на этот паттерн; чекбокс «выбрать доставку курьером»,
меняющий состав формы, — обычное булево поле схемы).

## Из чего состоит

```tsx
'use client'

export function OrderForm() {
  const [consentPd, setConsentPd] = useState(false)
  const [consentThirdParty, setConsentThirdParty] = useState(false)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  return (
    <DsperevdForm
      initialValue={defaults}
      onSubmit={async (value) => {
        await submitOrderAction({ ...value, consentPd, consentThirdParty, fileUrl })
      }}
    >
      <DsperevdForm.Field.String name="name" label="Имя" />
      {/* ... остальные поля бизнес-данных — в схеме ... */}

      <Input type="file" onChange={handleImmediateUpload /* пишет в fileUrl/uploading */} />
      <ConsentCheckboxes
        consentPd={consentPd}
        onConsentPdChange={setConsentPd}
        consentThirdParty={consentThirdParty}
        onConsentThirdPartyChange={setConsentThirdParty}
      />

      <DsperevdForm.Button.Submit disabled={!consentPd || uploading}>
        Отправить
      </DsperevdForm.Button.Submit>
    </DsperevdForm>
  )
}
```

- Внешний state объявляется **на том же уровне**, что и `<AppForm>` — не глубже, иначе его не
  дотянуть до `onSubmit` и до `disabled` кнопки одновременно.
- В `onSubmit` внешние значения примешиваются к `value` формы явным спредом/полями — server
  action получает единый плоский объект, не задумываясь, откуда какое поле взялось.
- `disabled` кнопки сабмита — единственное место, где внешний state встречается со
  схема-валидацией формы (`!consentPd`, `uploading`) — форма про это ничего не знает.

## ⚠️ Опечатка: `SubmitButtonProps.width`, не `w`

`DsperevdForm.Button.Submit` (`SubmitButtonProps`,
[button-types.ts](/libs/forms/src/lib/declarative/types/button-types.ts)) принимает `width`, а не
`w` — короткий Chakra-алиас, к которому рука привыкает на любом другом `<Box>`/`<Button>` этого же
файла. `typecheck:tsgo` ловит опечатку как `TS2322` (лишнее свойство не проходит по
`SubmitButtonProps`), но **только если его реально прогнать** — на глаз в JSX `w="100%"` рядом с
остальными Chakra-пропсами выглядит совершенно естественно, и это не абстрактный риск: в той же
сессии (2026-09-14) опечатка была найдена и исправлена **во второй раз** в 4 файлах dsperevod
(`sign-in`, `sign-up`, `reset-password`, `forgot-password`) — файлы содержали её ещё до начала
сессии.

```tsx
// ❌ TS2322 — 'w' does not exist in type 'SubmitButtonProps'
<AppForm.Button.Submit w="100%">Отправить</AppForm.Button.Submit>

// ✅
<AppForm.Button.Submit width="100%">Отправить</AppForm.Button.Submit>
```

`SubmitButtonProps` — узкий кастомный интерфейс, не проброшенный `ButtonProps` Chakra целиком
(см. остальные поля файла: `colorPalette`, `size`, `variant` — тоже урезанные литералы, не полный
набор Chakra-значений). Проверять кнопки сабмита `nx typecheck:tsgo <app>` до коммита — это не
опечатка, которую заметно чтением диффа.
