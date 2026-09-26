import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { useDeclarativeForm } from '../context/form-context'
import { useFormDependentsRegistry } from '../context/form-dependents'
import { FormGroup } from '../context/form-group'
import { TestForm } from '../testing/test-form'
import { useDependentField, useFieldDeps } from './use-dependent-field'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form не выводится из TData
type AnyForm = any

/**
 * Живое поле формы: TanStack зовёт form-level листенер только у смонтированного `form.Field` — как в настоящей
 * форме, где родитель и ребёнок это отрисованные поля.
 */
function Mount({ names }: { names: string[] }) {
  const { form } = useDeclarativeForm()
  return (
    <>
      {names.map((name) => <form.Field key={name} name={name}>{() => null}</form.Field>)}
    </>
  )
}

function City(
  { path = 'cityId', dependsOn = 'countryId', clearOnParentChange, emptyValue }: {
    path?: string
    dependsOn?: string | string[]
    clearOnParentChange?: boolean
    emptyValue?: unknown
  },
) {
  const state = useDependentField({ fullPath: path, dependsOn, clearOnParentChange, emptyValue })
  return (
    <div>
      <span data-testid="key">{state.depsKey}</span>
      <span data-testid="ready">{String(state.ready)}</span>
      <span data-testid="blocked">{String(state.blocked)}</span>
      <span data-testid="missing">{state.missingParentLabels.join('|')}</span>
      <span data-testid="cleared">{state.cleared ? `${state.cleared.id}:${state.cleared.parentLabel}` : ''}</span>
    </div>
  )
}

function setup(defaults: Record<string, unknown>, ui: React.ReactElement) {
  let form!: AnyForm
  const utils = render(<TestForm defaultValues={defaults} onFormReady={(f) => (form = f)}>{ui}</TestForm>)
  return { form: () => form, ...utils }
}

describe('useFieldDeps / useDependentField (§18)', () => {
  it('DS3: родитель пуст — не готов и заблокирован; выбран — готов, значение ребёнка не тронуто', () => {
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City />
      </>,
    )
    expect(screen.getByTestId('ready')).toHaveTextContent('false')
    expect(screen.getByTestId('blocked')).toHaveTextContent('true')
    expect(screen.getByTestId('missing')).toHaveTextContent('countryId')
    act(() => form().setFieldValue('countryId', 'RU'))
    expect(screen.getByTestId('ready')).toHaveTextContent('true')
    expect(screen.getByTestId('blocked')).toHaveTextContent('false')
    expect(form().state.values.cityId).toBe('')
  })

  it('DS4: смена родителя правкой очищает ребёнка без isTouched и ошибок; пустой ребёнок — записи нет', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBe('')
    expect(screen.getByTestId('cleared')).toHaveTextContent('1:countryId')
    const meta = form().getFieldMeta('cityId')
    expect(meta?.isTouched ?? false).toBe(false)
    expect(meta?.errors ?? []).toHaveLength(0)
    // ребёнок уже пуст — очистка ничего не пишет и не объявляет повторно
    act(() => form().setFieldValue('countryId', 'FR'))
    expect(screen.getByTestId('cleared')).toHaveTextContent('1:countryId')
  })

  it('DS5: очистка родителя очищает ребёнка и блокирует его', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City />
      </>,
    )
    act(() => form().setFieldValue('countryId', ''))
    expect(form().state.values.cityId).toBe('')
    expect(screen.getByTestId('blocked')).toHaveTextContent('true')
  })

  it('DS6: цепочка страна → регион → город — обе очистки за одну правку', () => {
    const { form } = setup(
      { countryId: 'RU', regionId: 'r1', cityId: 'c1' },
      <>
        <Mount names={['countryId', 'regionId', 'cityId']} />
        <City path="regionId" dependsOn="countryId" />
        <City path="cityId" dependsOn="regionId" />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.regionId).toBe('')
    expect(form().state.values.cityId).toBe('')
  })

  it('DS7/DS8: reset(values) и новое значение через update() ребёнка не стирают', () => {
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City />
      </>,
    )
    act(() => form().reset({ countryId: 'RU', cityId: 'msk' }))
    expect(form().state.values.cityId).toBe('msk')
    act(() => form().reset({ countryId: 'DE', cityId: 'ber' }))
    expect(form().state.values.cityId).toBe('ber')
  })

  it('DS10: setFieldValue родителя внутри dependents.suppress ребёнка не очищает', () => {
    let registry!: ReturnType<typeof useFormDependentsRegistry>
    function Capture() {
      const current = useFormDependentsRegistry()
      useEffect(() => {
        registry = current
      }, [current])
      return null
    }
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City />
        <Capture />
      </>,
    )
    act(() => registry!.suppress(() => form().setFieldValue('countryId', 'DE')))
    expect(form().state.values.cityId).toBe('msk')
    // после подавления сравнение идёт с новым значением: правка DE → FR очищает
    act(() => form().setFieldValue('countryId', 'FR'))
    expect(form().state.values.cityId).toBe('')
  })

  it('clearOnParentChange={false} — очистки нет', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City clearOnParentChange={false} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBe('msk')
  })

  it('emptyValue: nullable-поле очищается в null', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId', 'cityId']} />
        <City emptyValue={null} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBeNull()
  })

  it('DS11: путь относителен группы, «/» — от корня; ключ deps без «/»', () => {
    function Probe({ dependsOn }: { dependsOn: string | string[] }) {
      const state = useFieldDeps(dependsOn)
      return <span data-testid="deps">{JSON.stringify(state.deps)}</span>
    }
    setup(
      { countryId: 'RU', items: [{ regionId: 'r7' }] },
      <FormGroup name="items">
        <FormGroup name="0">
          <Probe dependsOn={['regionId', '/countryId']} />
        </FormGroup>
      </FormGroup>,
    )
    expect(JSON.parse(screen.getByTestId('deps').textContent ?? '{}')).toEqual({ regionId: 'r7', countryId: 'RU' })
  })

  it('без dependsOn — пустые deps, готов, не заблокирован', () => {
    setup({ cityId: '' }, <City dependsOn={[]} />)
    expect(screen.getByTestId('ready')).toHaveTextContent('true')
    expect(screen.getByTestId('blocked')).toHaveTextContent('false')
  })

  it('размонтирование снимает регистрацию: правка родителя после этого не пишет в форму', () => {
    function Toggle({ show }: { show: boolean }) {
      return (
        <>
          <Mount names={['countryId', 'cityId']} />
          {show && <City />}
        </>
      )
    }
    let form!: AnyForm
    const tree = (show: boolean) => (
      <TestForm defaultValues={{ countryId: 'RU', cityId: 'msk' }} onFormReady={(f) => (form = f)}>
        <Toggle show={show} />
      </TestForm>
    )
    const { rerender } = render(tree(true))
    // Пока ребёнок смонтирован — очистка работает (без этого проверка ниже ничего бы не доказывала)
    act(() => form.setFieldValue('countryId', 'DE'))
    expect(form.state.values.cityId).toBe('')
    act(() => form.setFieldValue('cityId', 'ber'))
    rerender(tree(false))
    act(() => form.setFieldValue('countryId', 'FR'))
    expect(form.state.values.cityId).toBe('ber')
  })
})
