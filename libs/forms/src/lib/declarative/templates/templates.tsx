'use client'

import { z } from 'zod/v4'
import type { FormTemplate } from './template-types'

// ============================================================================
// Auth шаблоны
// ============================================================================

const loginSchema = z
  .object({
    email: z.email('Некорректный email'),
    password: z.string().min(6, 'Минимум 6 символов'),
  })
  .strip()

export const loginForm: FormTemplate = {
  name: 'loginForm',
  title: 'Вход',
  description: 'Форма входа: email + пароль',
  category: 'auth',
  schema: loginSchema,
  defaultValues: { email: '', password: '' },
  renderFields: () => null, // Рендеринг через FormFromTemplate
}

const registerSchema = z
  .object({
    name: z.string().min(2, 'Минимум 2 символа'),
    email: z.email('Некорректный email'),
    password: z.string().min(8, 'Минимум 8 символов'),
    confirmPassword: z.string(),
  })
  .strip()
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

export const registerForm: FormTemplate = {
  name: 'registerForm',
  title: 'Регистрация',
  description: 'Форма регистрации: имя, email, пароль, подтверждение',
  category: 'auth',
  schema: registerSchema,
  defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  renderFields: () => null,
}

const forgotPasswordSchema = z
  .object({
    email: z.email('Некорректный email'),
  })
  .strip()

export const forgotPasswordForm: FormTemplate = {
  name: 'forgotPasswordForm',
  title: 'Восстановление пароля',
  description: 'Форма восстановления пароля: email',
  category: 'auth',
  schema: forgotPasswordSchema,
  defaultValues: { email: '' },
  renderFields: () => null,
}

// ============================================================================
// Feedback шаблоны
// ============================================================================

const contactSchema = z
  .object({
    name: z.string().min(2, 'Введите имя'),
    email: z.email('Некорректный email'),
    phone: z.string().optional(),
    message: z.string().min(10, 'Минимум 10 символов'),
  })
  .strip()

export const contactForm: FormTemplate = {
  name: 'contactForm',
  title: 'Контактная форма',
  description: 'Обратная связь: имя, email, телефон, сообщение',
  category: 'feedback',
  schema: contactSchema,
  defaultValues: { name: '', email: '', phone: '', message: '' },
  renderFields: () => null,
}

const feedbackSchema = z
  .object({
    rating: z.number().min(1).max(5),
    category: z.string().min(1, 'Выберите категорию'),
    message: z.string().min(5, 'Опишите подробнее'),
    email: z.email().optional(),
  })
  .strip()

export const feedbackForm: FormTemplate = {
  name: 'feedbackForm',
  title: 'Отзыв',
  description: 'Форма отзыва: рейтинг, категория, сообщение',
  category: 'feedback',
  schema: feedbackSchema,
  defaultValues: { rating: 0, category: '', message: '', email: '' },
  renderFields: () => null,
}

// ============================================================================
// Survey шаблоны
// ============================================================================

const npsSchema = z
  .object({
    score: z.number().min(0).max(10),
    reason: z.string().optional(),
    email: z.email().optional(),
  })
  .strip()

export const npsForm: FormTemplate = {
  name: 'npsForm',
  title: 'NPS-опрос',
  description: 'Net Promoter Score: оценка 0-10, причина, email',
  category: 'survey',
  schema: npsSchema,
  defaultValues: { score: 0, reason: '', email: '' },
  renderFields: () => null,
}

// ============================================================================
// Business шаблоны
// ============================================================================

const companyRegistrationSchema = z
  .object({
    inn: z.string().min(10, 'Введите ИНН'),
    kpp: z.string().optional(),
    ogrn: z.string().optional(),
    name: z.string().min(2, 'Введите название'),
    address: z.string().min(5, 'Введите адрес'),
    bik: z.string().optional(),
    account: z.string().optional(),
    corrAccount: z.string().optional(),
  })
  .strip()

export const companyRegistrationForm: FormTemplate = {
  name: 'companyRegistration',
  title: 'Регистрация компании',
  description: 'Реквизиты: ИНН, КПП, ОГРН, название, адрес, банковские реквизиты',
  category: 'business',
  schema: companyRegistrationSchema,
  defaultValues: { inn: '', kpp: '', ogrn: '', name: '', address: '', bik: '', account: '', corrAccount: '' },
  renderFields: () => null,
}

// ============================================================================
// E-commerce шаблоны
// ============================================================================

const orderItemSchema = z.object({
  product: z.string().min(1),
  qty: z.number().min(1),
  price: z.number().min(0),
})

const orderSchema = z
  .object({
    customer: z.string().min(2, 'Введите имя'),
    email: z.email('Некорректный email'),
    phone: z.string().optional(),
    address: z.string().min(5, 'Введите адрес'),
    items: z.array(orderItemSchema).min(1, 'Добавьте хотя бы один товар'),
    comment: z.string().optional(),
  })
  .strip()

export const orderForm: FormTemplate = {
  name: 'orderForm',
  title: 'Заказ',
  description: 'Оформление заказа: клиент, адрес, товары',
  category: 'ecommerce',
  schema: orderSchema,
  defaultValues: {
    customer: '',
    email: '',
    phone: '',
    address: '',
    items: [{ product: '', qty: 1, price: 0 }],
    comment: '',
  },
  renderFields: () => null,
}

// ============================================================================
// Profile шаблоны
// ============================================================================

const profileSchema = z
  .object({
    firstName: z.string().min(2, 'Введите имя'),
    lastName: z.string().min(2, 'Введите фамилию'),
    email: z.email('Некорректный email'),
    phone: z.string().optional(),
  })
  .strip()

export const profileForm: FormTemplate = {
  name: 'profileForm',
  title: 'Профиль',
  description: 'Личные данные: имя, фамилия, email, телефон',
  category: 'profile',
  schema: profileSchema,
  defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
  renderFields: () => null,
}

// ============================================================================
// Address шаблоны
// ============================================================================

const addressSchema = z
  .object({
    country: z.string().min(1, 'Выберите страну'),
    city: z.string().min(2, 'Введите город'),
    street: z.string().min(3, 'Введите улицу'),
    building: z.string().min(1, 'Введите дом'),
    apartment: z.string().optional(),
    zip: z.string().optional(),
  })
  .strip()

export const addressForm: FormTemplate = {
  name: 'addressForm',
  title: 'Адрес',
  description: 'Адрес доставки: страна, город, улица, дом, квартира, индекс',
  category: 'address',
  schema: addressSchema,
  defaultValues: { country: '', city: '', street: '', building: '', apartment: '', zip: '' },
  renderFields: () => null,
}

// ============================================================================
// Все шаблоны
// ============================================================================

export const templates = {
  loginForm,
  registerForm,
  forgotPasswordForm,
  contactForm,
  feedbackForm,
  npsForm,
  companyRegistration: companyRegistrationForm,
  orderForm,
  profileForm,
  addressForm,
} as const
