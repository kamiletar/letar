// Контроль типов пакета: позитивный (subpath-импорт резолвится и типизирован) и негативный.
import { Form } from '@letar/forms'
import { FieldPhone } from '@letar/forms/fields/specialized'

export const ok = <Form.Field.String name="title" label="Название" />

// @ts-expect-error name — строка; если типы превратились в any, tsc упадёт на неиспользуемой директиве
export const bad = <Form.Field.String name={42} />

// subpath-импорт: компонент определён и типизирован
export const phone = <FieldPhone name="phone" />

// @ts-expect-error то же для subpath-экспорта
export const badPhone = <FieldPhone name={42} />
