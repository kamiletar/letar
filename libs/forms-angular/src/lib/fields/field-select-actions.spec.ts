import { provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FieldSelectActionsHostComponent as HostComponent,
  fieldSelectCreateOptions,
  fieldSelectEditOptions,
} from '../testing/field-select-host.component'
import type { FieldSelectOption } from './field-select.component'

/** Промис с отдельно доступным `resolve` — проверка `pending` между вызовом и ответом сервера */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function trigger(fixture: ComponentFixture<HostComponent>): HTMLButtonElement {
  return fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
}

function openPopup(fixture: ComponentFixture<HostComponent>): void {
  trigger(fixture).click()
  fixture.detectChanges()
}

function findOptionByText(fixture: ComponentFixture<HostComponent>, text: string): HTMLLIElement | undefined {
  return fixture.debugElement.queryAll(By.css('li[role="option"]'))
    .map((el) => el.nativeElement as HTMLLIElement)
    .find((el) => el.textContent?.includes(text))
}

function editButtons(fixture: ComponentFixture<HostComponent>): HTMLButtonElement[] {
  return fixture.debugElement.queryAll(By.css('button[data-part="edit-button"]'))
    .map((el) => el.nativeElement as HTMLButtonElement)
}

/** Карандаш пункта списка (внутри `[role="option"]`) */
function itemEditButtons(fixture: ComponentFixture<HostComponent>): HTMLButtonElement[] {
  return editButtons(fixture).filter((el) => el.closest('[role="option"]'))
}

/** Карандаш выбранного значения — сосед триггера, не внутри `[role="listbox"]` */
function valueEditButton(fixture: ComponentFixture<HostComponent>): HTMLButtonElement | undefined {
  return editButtons(fixture).find((el) => !el.closest('[role="listbox"]'))
}

function createFixture(
  options: FieldSelectOption[],
  extra: Partial<HostComponent> = {},
  initial = '',
): ComponentFixture<HostComponent> {
  const fixture = TestBed.createComponent(HostComponent)
  fixture.componentInstance.options = options
  fixture.componentInstance.initial = initial
  Object.assign(fixture.componentInstance, extra)
  fixture.detectChanges()
  return fixture
}

/**
 * Этап 3h паритета Select: `onCreate`/`onUpdate`/`pending` через `createSelectionActionsState`
 * (готовая фабрика, бизнес-логика не меняется — только её UI-подключение в кастомном listbox
 * Этапа 3g). Зеркалит `libs/forms-vue/src/lib/fields/field-select-actions.spec.ts`, адаптированный
 * под Angular TestBed/DOM API — без `searchable`/`dependsOn` (Этап 3i, вне объёма).
 */
describe('FieldSelectComponent (Этап 3h) — onCreate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('без onCreate пункта «+ Добавить…» нет', () => {
    const fixture = createFixture(fieldSelectCreateOptions)
    openPopup(fixture)
    expect(findOptionByText(fixture, 'Добавить')).toBeUndefined()
  })

  it('с onCreate в конце списка есть «+ Добавить…»', () => {
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate: vi.fn() })
    openPopup(fixture)
    expect(findOptionByText(fixture, '+ Добавить…')).toBeDefined()
  })

  it('выбор пункта вызывает onCreate, созданная опция выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Solid', value: 'solid' })
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate })
    openPopup(fixture)
    findOptionByText(fixture, '+ Добавить…')!.click()
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()

    expect(onCreate).toHaveBeenCalledWith('', expect.anything())

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('solid')
  })

  it('onCreate вернул null — значение не меняется', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate }, 'react')
    openPopup(fixture)
    findOptionByText(fixture, '+ Добавить…')!.click()
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(trigger(fixture).textContent?.trim()).toBe('React')
  })

  it('createItem: false прячет служебный пункт, даже если onCreate задан', () => {
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate: vi.fn(), createItem: false })
    openPopup(fixture)
    expect(findOptionByText(fixture, 'Добавить')).toBeUndefined()
  })
})

describe('FieldSelectComponent (Этап 3h) — onUpdate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('без onUpdate карандашей нет', () => {
    const fixture = createFixture(fieldSelectEditOptions, {}, 'a')
    openPopup(fixture)
    expect(editButtons(fixture)).toHaveLength(0)
  })

  it('карандаш у каждой редактируемой опции; editable:false скрывает', () => {
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate: vi.fn() }, 'a')
    openPopup(fixture)
    // Кровля, Фасад — редактируемы; Системная — editable:false, карандаша нет
    expect(itemEditButtons(fixture)).toHaveLength(2)
  })

  it('в пункте карандаш вне Tab-порядка и скрыт от AT', () => {
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate: vi.fn() }, 'a')
    openPopup(fixture)
    const pencil = itemEditButtons(fixture)[0]!
    expect(pencil.getAttribute('tabindex')).toBe('-1')
    expect(pencil.getAttribute('aria-hidden')).toBe('true')
  })

  it('карандаш у значения — сосед триггера, список закрыт', () => {
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate: vi.fn() }, 'a')
    const pencil = valueEditButton(fixture)
    expect(pencil).toBeDefined()
    expect(fixture.debugElement.query(By.css('ul[role="listbox"]'))).toBeNull()
  })

  it('у системной опции (editable:false) карандаша у значения нет', () => {
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate: vi.fn() }, 's')
    expect(valueEditButton(fixture)).toBeUndefined()
  })

  it('клик по карандашу пункта вызывает onUpdate с опцией и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate }, 'a')
    openPopup(fixture)
    // Порядок карандашей — как опций (Кровля, Фасад): берём Фасад (индекс 1), чтобы клик по
    // чужому пункту доказательно не выбрал его — форма ниже должна остаться со значением 'a'
    const pencil = itemEditButtons(fixture)[1]!
    pencil.click()
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: 'Фасад', value: 'b' }), expect.anything())

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('a')
  })

  it('тот же value: подпись обновляется, форма не dirty (значение поля не меняется)', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate }, 'a')
    valueEditButton(fixture)!.click()
    fixture.detectChanges()

    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(trigger(fixture).textContent?.trim()).toBe('Кровля (новая)')
    })

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('a')
  })

  it('другой value: выбранное значение заменяется на новое', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate }, 'a')
    valueEditButton(fixture)!.click()
    fixture.detectChanges()

    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(trigger(fixture).textContent?.trim()).toBe('Кровля v2')
    })

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('a2')
  })

  it('карандаш выключен, пока onUpdate ждёт ответа; повторный клик игнорируется; после ответа снова активен', async () => {
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate }, 'a')

    valueEditButton(fixture)!.click()
    fixture.detectChanges()
    await Promise.resolve()
    expect(valueEditButton(fixture)!.disabled).toBe(true)

    // Повторный клик при pending — второго вызова onUpdate не будет (фабрика сама игнорирует)
    valueEditButton(fixture)!.click()
    fixture.detectChanges()
    await Promise.resolve()
    expect(onUpdate).toHaveBeenCalledTimes(1)

    pending.resolve(null)
    await Promise.resolve()
    await Promise.resolve()
    fixture.detectChanges()
    expect(valueEditButton(fixture)!.disabled).toBe(false)
  })

  it('свой optionTemplate с edit-слотом — карандаш встроен в свою разметку', () => {
    TestBed.overrideComponent(HostComponent, {
      set: {
        template: `
          <letar-app-form [schema]="schema" [initialValue]="{ value: initial }" (formSubmit)="lastSubmit = $event">
            <letar-field-select name="value" [options]="options" placeholder="Выберите" [onUpdate]="onUpdate">
              <ng-template #optionTemplate let-option let-edit="edit">
                <span data-testid="custom-row">{{ option.label }}</span>
                @if (edit) {
                  <button type="button" data-part="edit-button" (click)="edit.run()"></button>
                }
              </ng-template>
            </letar-field-select>
          </letar-app-form>
        `,
      },
    })
    const fixture = createFixture(fieldSelectEditOptions, { onUpdate: vi.fn().mockResolvedValue(null) }, 'a')
    openPopup(fixture)

    const rows = fixture.debugElement.queryAll(By.css('[data-testid="custom-row"]'))
    expect(rows).toHaveLength(3)
    // Только Кровля/Фасад редактируемы — карандаш внутри кастомного optionTemplate только у них
    expect(itemEditButtons(fixture)).toHaveLength(2)
  })
})

describe('FieldSelectComponent (Этап 3h) — оптимистичный режим и отказ', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  type Ctx = { optimistic: (p: { label: string }) => void }
  type Created = { label: string; value: string } | null

  const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
    vi.fn(async (_search: string, ctx: Ctx) => {
      ctx.optimistic({ label: 'Solid' })
      return server.promise
    })

  it('подпись новой записи в триггере сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate: optimisticCreate(server) })
    openPopup(fixture)
    findOptionByText(fixture, '+ Добавить…')!.click()
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()

    expect(trigger(fixture).textContent?.trim()).toBe('Solid')

    server.resolve({ label: 'Solid', value: 'solid' })
    await Promise.resolve()
    await Promise.resolve()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('solid')
    expect(trigger(fixture).textContent?.trim()).toBe('Solid')
  })

  it('отказ — откат к прежнему значению и встроенное сообщение', async () => {
    const server = deferred<Created>()
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate: optimisticCreate(server) }, 'react')
    openPopup(fixture)
    findOptionByText(fixture, '+ Добавить…')!.click()
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()
    expect(trigger(fixture).textContent?.trim()).toBe('Solid')

    server.resolve(null)

    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(fixture.debugElement.query(By.css('[data-settle-error]'))).not.toBeNull()
    })

    const message = fixture.debugElement.query(By.css('[data-settle-error]'))
    expect((message.nativeElement as HTMLElement).textContent).toContain('Не удалось сохранить «Solid»')
    expect(trigger(fixture).textContent?.trim()).toBe('React')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('react')
  })

  it('с onSettleError встроенного сообщения нет, причина передана приложению', async () => {
    const server = deferred<Created>()
    const onSettleError = vi.fn()
    const fixture = createFixture(fieldSelectCreateOptions, { onCreate: optimisticCreate(server), onSettleError })
    openPopup(fixture)
    findOptionByText(fixture, '+ Добавить…')!.click()
    fixture.detectChanges()
    await Promise.resolve()

    server.resolve(null)
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(onSettleError).toHaveBeenCalled()
    })

    expect(onSettleError).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'create',
        reason: 'declined',
        preview: expect.objectContaining({ label: 'Solid' }),
      }),
    )
    expect(fixture.debugElement.query(By.css('[data-settle-error]'))).toBeNull()
  })

  it('pending-опция приложения приглушена (aria-busy/data-pending), не выбирается', async () => {
    const fixture = createFixture(
      [{ value: 'react', label: 'React' }, { value: 'tmp', label: 'Новая', pending: true }],
      {},
      'react',
    )
    openPopup(fixture)
    const pendingItem = findOptionByText(fixture, 'Новая')!
    expect(pendingItem.getAttribute('aria-busy')).toBe('true')
    expect(pendingItem.getAttribute('data-pending')).toBe('true')

    pendingItem.click()
    fixture.detectChanges()
    await Promise.resolve()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['value']).toBe('react')
  })
})
