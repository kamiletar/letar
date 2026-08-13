import { Component } from '@angular/core'
import type { AddressProvider, AddressSuggestion } from '@letar/forms-core/address'
import { vi } from 'vitest'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldAddressComponent } from '../fields/field-address.component'
import { FieldCityComponent } from '../fields/field-city.component'
import { FieldColorPickerComponent } from '../fields/field-color-picker.component'
import { FieldCreditCardComponent } from '../fields/field-credit-card.component'
import { FieldFileUploadComponent } from '../fields/field-file-upload.component'
import { FieldOtpInputComponent } from '../fields/field-otp-input.component'
import { FieldPinInputComponent } from '../fields/field-pin-input.component'
import { FieldSignatureComponent } from '../fields/field-signature.component'

/**
 * Host для Stage G — 8 полей категории "special". Тот же приём выноса Angular-декоратора в
 * обычный `.ts` (не `.spec.ts`), что и предыдущие stage-host компоненты.
 */
export const stageGSchema = z.object({
  pin: z.string().optional().meta({ ui: { title: 'PIN' } }),
  code: z.string().optional().meta({ ui: { title: 'Код' } }),
  color: z.string().optional().meta({ ui: { title: 'Цвет' } }),
  file: z.any().optional().meta({ ui: { title: 'Файл' } }),
  signature: z.string().optional().meta({ ui: { title: 'Подпись' } }),
  address: z.any().optional().meta({ ui: { title: 'Адрес' } }),
  city: z.string().optional().meta({ ui: { title: 'Город' } }),
  card: z.any().optional().meta({ ui: { title: 'Карта' } }),
})

export const mockAddressSuggestions: AddressSuggestion[] = [
  { label: 'Москва, ул. Тверская, д. 1', value: 'Москва, ул. Тверская, д. 1', data: { city: 'Москва' } },
  { label: 'Москва, ул. Тверская, д. 2', value: 'Москва, ул. Тверская, д. 2', data: { city: 'Москва' } },
]

export function createMockAddressProvider(): AddressProvider {
  return { getSuggestions: vi.fn().mockResolvedValue(mockAddressSuggestions) }
}

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldPinInputComponent,
    FieldOtpInputComponent,
    FieldColorPickerComponent,
    FieldFileUploadComponent,
    FieldSignatureComponent,
    FieldAddressComponent,
    FieldCityComponent,
    FieldCreditCardComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-pin-input name="pin" [count]="4" />
      <letar-field-otp-input name="code" [length]="4" [resendTimeout]="30" [onResend]="onResend" />
      <letar-field-color-picker name="color" />
      <letar-field-file-upload name="file" />
      <letar-field-signature name="signature" [width]="200" [height]="80" />
      <letar-field-address name="address" [provider]="provider" [debounceMs]="0" />
      <letar-field-city name="city" [provider]="provider" [debounceMs]="0" />
      <letar-field-credit-card name="card" />
    </letar-app-form>
  `,
})
export class StageGHostComponent {
  schema = stageGSchema
  initialValue = {
    pin: '',
    code: '',
    color: '',
    file: [],
    signature: '',
    address: '',
    city: '',
    card: { number: '', expiry: '', cvc: '' },
  }
  lastSubmit: Record<string, unknown> | undefined

  provider = createMockAddressProvider()
  onResend?: () => Promise<void>
}
