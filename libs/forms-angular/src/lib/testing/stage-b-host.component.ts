import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldBankAccountComponent } from '../fields/field-bank-account.component'
import { FieldBikComponent } from '../fields/field-bik.component'
import { FieldBirthCertificateComponent } from '../fields/field-birth-certificate.component'
import { FieldCorrAccountComponent } from '../fields/field-corr-account.component'
import { FieldDepartmentCodeComponent } from '../fields/field-department-code.component'
import { FieldForeignPassportComponent } from '../fields/field-foreign-passport.component'
import { FieldInnComponent } from '../fields/field-inn.component'
import { FieldKppComponent } from '../fields/field-kpp.component'
import { FieldOgrnComponent } from '../fields/field-ogrn.component'
import { FieldPassportComponent } from '../fields/field-passport.component'
import { FieldSnilsComponent } from '../fields/field-snils.component'

/**
 * Host для Stage B — 11 документных полей РФ, тот же приём выноса Angular-декоратора в обычный
 * `.ts` (не `.spec.ts`), что и у `stage-a-host.component.ts`. Схема сознательно держит поля
 * простыми `z.string()` (без `zRu.*()`) — контрольная сумма должна срабатывать из самого поля
 * (`DocumentFieldBase.validateDocument`), не из Zod-подсхемы приложения, см. комментарий
 * "Двойной источник ошибки" в `document-field-base.ts`.
 */
export const stageBSchema = z.object({
  inn: z.string().meta({ ui: { title: 'ИНН' } }),
  bik: z.string().meta({ ui: { title: 'БИК' } }),
  ogrn: z.string().meta({ ui: { title: 'ОГРН' } }),
  snils: z.string().meta({ ui: { title: 'СНИЛС' } }),
  kpp: z.string().meta({ ui: { title: 'КПП' } }),
  passport: z.string().meta({ ui: { title: 'Паспорт' } }),
  bankAccount: z.string().meta({ ui: { title: 'Расчётный счёт' } }),
  corrAccount: z.string().meta({ ui: { title: 'Корр. счёт' } }),
  foreignPassport: z.string().meta({ ui: { title: 'Загранпаспорт' } }),
  departmentCode: z.string().meta({ ui: { title: 'Код подразделения' } }),
  birthCertificate: z.string().meta({ ui: { title: 'Свидетельство о рождении' } }),
})

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldInnComponent,
    FieldBikComponent,
    FieldOgrnComponent,
    FieldSnilsComponent,
    FieldKppComponent,
    FieldPassportComponent,
    FieldBankAccountComponent,
    FieldCorrAccountComponent,
    FieldForeignPassportComponent,
    FieldDepartmentCodeComponent,
    FieldBirthCertificateComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-inn name="inn" />
      <letar-field-bik name="bik" />
      <letar-field-ogrn name="ogrn" />
      <letar-field-snils name="snils" />
      <letar-field-kpp name="kpp" />
      <letar-field-passport name="passport" />
      <letar-field-bank-account name="bankAccount" />
      <letar-field-corr-account name="corrAccount" />
      <letar-field-foreign-passport name="foreignPassport" />
      <letar-field-department-code name="departmentCode" />
      <letar-field-birth-certificate name="birthCertificate" />
    </letar-app-form>
  `,
})
export class StageBHostComponent {
  schema = stageBSchema
  initialValue = {
    inn: '',
    bik: '',
    ogrn: '',
    snils: '',
    kpp: '',
    passport: '',
    bankAccount: '',
    corrAccount: '',
    foreignPassport: '',
    departmentCode: '',
    birthCertificate: '',
  }
  lastSubmit: Record<string, unknown> | undefined
}
