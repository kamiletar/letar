import { provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import type { FieldDeps } from '@letar/forms-core/uikit'
import { beforeEach, describe, expect, it } from 'vitest'
import { FieldSelectDependentHostComponent as HostComponent } from '../testing/field-select-host.component'

function fieldRoot(fixture: ComponentFixture<HostComponent>, name: string) {
  return fixture.debugElement.query(By.css(`div.letar-field[data-field-name="${name}"]`))
}

function triggerFor(fixture: ComponentFixture<HostComponent>, name: string): HTMLButtonElement {
  return fieldRoot(fixture, name).query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
}

function openPopupFor(fixture: ComponentFixture<HostComponent>, name: string): void {
  triggerFor(fixture, name).click()
  fixture.detectChanges()
}

/**
 * Выбирает опцию по видимому тексту в попапе поля `name` — попап физически перенесён CDK Overlay
 * в другое место DOM (`DomPortal`), но `DebugElement`/`By.css` следуют дереву компонентов
 * Angular, а не буквальной вложенности узлов, поэтому поиск через `fieldRoot` работать не будет
 * для содержимого попапа: он ищет по всему документу, полагаясь на то, что на странице открыт
 * только один попап одновременно (тесты этого файла всегда закрывают предыдущий, открывая
 * следующий).
 */
function selectOptionInOpenPopup(fixture: ComponentFixture<HostComponent>, label: string): void {
  const option = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    .find((el) => (el.nativeElement as HTMLLIElement).textContent?.trim() === label)
  expect(option).toBeDefined()
  ;(option!.nativeElement as HTMLLIElement).click()
  fixture.detectChanges()
}

function hintFor(fixture: ComponentFixture<HostComponent>, name: string): string | null {
  const el = fieldRoot(fixture, name).query(By.css('.letar-field__select-depends-hint'))
  return el ? ((el.nativeElement as HTMLElement).textContent ?? '').trim() : null
}

function liveMessageFor(fixture: ComponentFixture<HostComponent>, name: string): string | null {
  const el = fieldRoot(fixture, name).query(By.css('[data-dependent-live]'))
  return el ? ((el.nativeElement as HTMLElement).textContent ?? '').trim() : null
}

function createFixture(extra: Partial<HostComponent> = {}): ComponentFixture<HostComponent> {
  const fixture = TestBed.createComponent(HostComponent)
  Object.assign(fixture.componentInstance, extra)
  fixture.detectChanges()
  return fixture
}

/**
 * Этап 3i паритета Select — `dependsOn` (§18): headless-эквивалент `libs/forms-vue/src/lib/fields/
 * field-select-dependent.spec.ts`. Правка родителя здесь идёт через реальный клик по его
 * собственному `letar-field-select` (`countryId`/`regionId`), а не через отдельный «сырой» инпут —
 * подробности выбора см. JSDoc `FieldSelectDependentHostComponent` (`field-select-host.component.ts`):
 * `FormRootService.registerField` подписывается на `valueChanges` каждого контрола при регистрации,
 * поэтому клик через UI будит `dependents.handleFieldChange` так же надёжно, как и прямой
 * `ctrl.setValue()`.
 */
describe('FieldSelectComponent (Этап 3i) — dependsOn', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('без dependsOn — поле не заблокировано, ни подсказки, ни live-региона нет', () => {
    const fixture = createFixture()
    expect(triggerFor(fixture, 'cityId').disabled).toBe(false)
    expect(hintFor(fixture, 'cityId')).toBeNull()
    expect(liveMessageFor(fixture, 'cityId')).toBeNull()
  })

  it('dependsOn на пустого родителя — поле заблокировано, подсказка «Сначала выберите «Страна»»', () => {
    const fixture = createFixture({ dependsOn: 'countryId' })
    expect(triggerFor(fixture, 'cityId').disabled).toBe(true)
    expect(hintFor(fixture, 'cityId')).toBe('Сначала выберите «Страна»')
  })

  it('aria-describedby триггера указывает на элемент подсказки', () => {
    const fixture = createFixture({ dependsOn: 'countryId' })
    const trigger = triggerFor(fixture, 'cityId')
    const describedBy = trigger.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const hintEl = fieldRoot(fixture, 'cityId').query(By.css(`#${describedBy}`))
    expect(hintEl).not.toBeNull()
    expect((hintEl!.nativeElement as HTMLElement).textContent?.trim()).toBe('Сначала выберите «Страна»')
  })

  it('placeholderWhenDisabled подменяет автоматический текст в триггере', () => {
    const fixture = createFixture({ dependsOn: 'countryId', placeholderWhenDisabled: 'Выберите страну выше' })
    expect(triggerFor(fixture, 'cityId').textContent?.trim()).toBe('Выберите страну выше')
  })

  it('родитель заполнен изначально (initialValue) — поле доступно, значение ребёнка не тронуто', () => {
    const fixture = createFixture({
      dependsOn: 'countryId',
      initialValue: { countryId: 'ru', regionId: '', cityId: 'msk' },
    })
    expect(triggerFor(fixture, 'cityId').disabled).toBe(false)
    expect(hintFor(fixture, 'cityId')).toBeNull()
    expect(triggerFor(fixture, 'cityId').textContent?.trim()).toBe('Москва')
  })

  it('реальная правка родителя очищает значение ребёнка и объявляет об этом через live-регион', () => {
    const fixture = createFixture({
      dependsOn: 'countryId',
      initialValue: { countryId: 'ru', regionId: '', cityId: 'msk' },
    })
    expect(triggerFor(fixture, 'cityId').textContent?.trim()).toBe('Москва')

    openPopupFor(fixture, 'countryId')
    selectOptionInOpenPopup(fixture, 'Германия')

    // Новая страна тоже непустая — поле не блокируется, только теряет прежнее значение с объявлением
    expect(triggerFor(fixture, 'cityId').disabled).toBe(false)
    expect(liveMessageFor(fixture, 'cityId')).toBe('Поле «Город» очищено: изменилось поле «Страна»')
  })

  it('ребёнок уже был пуст — правка родителя ничего не объявляет', () => {
    const fixture = createFixture({
      dependsOn: 'countryId',
      initialValue: { countryId: 'ru', regionId: '', cityId: '' },
    })
    openPopupFor(fixture, 'countryId')
    selectOptionInOpenPopup(fixture, 'Германия')
    expect(liveMessageFor(fixture, 'cityId')).toBe('')
  })

  it('родитель очищен обратно (клик по «Не указано») — ребёнок снова блокируется', () => {
    const fixture = createFixture({
      dependsOn: 'countryId',
      initialValue: { countryId: 'ru', regionId: '', cityId: 'msk' },
    })
    openPopupFor(fixture, 'countryId')
    selectOptionInOpenPopup(fixture, 'Не указано')
    expect(triggerFor(fixture, 'cityId').disabled).toBe(true)
    expect(hintFor(fixture, 'cityId')).toBe('Сначала выберите «Страна»')
  })

  it('clearOnParentChange: false — значение ребёнка переживает смену родителя', () => {
    const fixture = createFixture({
      dependsOn: 'countryId',
      clearOnParentChange: false,
      initialValue: { countryId: 'ru', regionId: '', cityId: 'msk' },
    })
    openPopupFor(fixture, 'countryId')
    selectOptionInOpenPopup(fixture, 'Германия')
    expect(triggerFor(fixture, 'cityId').textContent?.trim()).toBe('Москва')
  })

  it('disableWhenParentEmpty: false — поле доступно даже при пустом родителе', () => {
    const fixture = createFixture({ dependsOn: 'countryId', disableWhenParentEmpty: false })
    expect(triggerFor(fixture, 'cityId').disabled).toBe(false)
    expect(hintFor(fixture, 'cityId')).toBeNull()
  })

  it('несколько родителей + свой depsReady — подсказка перечисляет недостающих, разблокировка только когда все готовы', () => {
    const depsReady = (deps: FieldDeps) => Boolean(deps.countryId) && Boolean(deps.regionId)
    const fixture = createFixture({ dependsOn: ['countryId', 'regionId'], depsReady })
    expect(triggerFor(fixture, 'cityId').disabled).toBe(true)
    expect(hintFor(fixture, 'cityId')).toBe('Сначала выберите «Страна», «Регион»')

    openPopupFor(fixture, 'countryId')
    selectOptionInOpenPopup(fixture, 'Россия')
    // Свой depsReady не умеет сказать, КАКОЙ именно родитель ещё не готов (произвольная функция) —
    // подсказка остаётся полным списком, пока не готовы ВСЕ (та же семантика, что в `createFieldDeps`)
    expect(triggerFor(fixture, 'cityId').disabled).toBe(true)
    expect(hintFor(fixture, 'cityId')).toBe('Сначала выберите «Страна», «Регион»')

    openPopupFor(fixture, 'regionId')
    selectOptionInOpenPopup(fixture, 'Центральный')
    expect(triggerFor(fixture, 'cityId').disabled).toBe(false)
    expect(hintFor(fixture, 'cityId')).toBeNull()
  })

  it('клик по заблокированному триггеру не открывает попап', () => {
    const fixture = createFixture({ dependsOn: 'countryId' })
    openPopupFor(fixture, 'cityId')
    expect(fieldRoot(fixture, 'cityId').query(By.css('ul[role="listbox"]'))).toBeNull()
  })
})
