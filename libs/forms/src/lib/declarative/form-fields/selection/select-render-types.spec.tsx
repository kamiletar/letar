import { describe, expect, it } from 'vitest'
import { Form } from '../../'

interface City {
  id: number
  name: string
}

// Compile-only: проверяется tsgo (typecheck), рантайм-ассерт формальный
describe('типы Select/Combobox: TData выводится из options', () => {
  it('data в renderOption/renderValue/getGroup типизирована', () => {
    const cities: City[] = [{ id: 1, name: 'Москва' }]
    const options = cities.map((c) => ({ value: c.id, label: c.name, data: c }))

    const select = (
      <Form.Field.Select
        name="city"
        options={options}
        renderOption={(o) => <span>{o.data?.name}</span>}
        renderValue={(o) => <b>{o.data?.id}</b>}
        getGroup={(o) => o.data?.name}
      />
    )
    const bad = (
      <Form.Field.Select
        name="city"
        options={options}
        // @ts-expect-error — у City нет поля `nope`
        renderOption={(o) => <span>{o.data?.nope}</span>}
      />
    )
    const combobox = (
      <Form.Field.Combobox
        name="city"
        useQuery={() => ({ data: cities, isLoading: false, error: null })}
        getLabel={(c: City) => c.name}
        getValue={(c: City) => c.id}
        renderOption={(o) => <span>{o.data?.name}</span>}
      />
    )
    expect([select, bad, combobox]).toHaveLength(3)
  })
})
