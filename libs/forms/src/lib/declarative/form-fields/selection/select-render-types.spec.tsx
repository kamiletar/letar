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
        getValue={(c: City) => String(c.id)}
        renderOption={(o) => <span>{o.data?.name}</span>}
      />
    )
    expect([select, bad, combobox]).toHaveLength(3)
  })

  it('onUpdate: опция с data типизирована, результат принимает data того же типа, editable — флаг опции', () => {
    const cities: City[] = [{ id: 1, name: 'Москва' }]
    const options = cities.map((c) => ({ value: c.id, label: c.name, data: c, editable: c.id !== 0 }))

    const select = (
      <Form.Field.Select
        name="city"
        options={options}
        onUpdate={async (o) => (o.data ? { label: o.data.name, value: o.data.id, data: o.data } : null)}
        listFooter={<Form.Field.Select.CreateButton />}
        renderOption={(o) => (
          <span>
            {o.data?.name}
            <Form.Field.Select.EditButton asChild>
              <a href="#edit">edit</a>
            </Form.Field.Select.EditButton>
          </span>
        )}
      />
    )
    const bad = (
      <Form.Field.Select
        name="city"
        options={options}
        // @ts-expect-error — data в результате должна быть City
        onUpdate={async () => ({ label: 'x', value: 1, data: { nope: true } })}
      />
    )
    const combobox = (
      <Form.Field.Combobox
        name="city"
        options={options.map((o) => ({ ...o, value: String(o.value) }))}
        onUpdate={async (o) => ({ label: String(o.label), value: o.value })}
        renderEmpty={({ search }) => <i>{search}</i>}
        listFooter={<Form.Field.Combobox.CreateButton />}
      />
    )
    expect([select, bad, combobox]).toHaveLength(3)
  })
})
