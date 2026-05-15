import { z } from 'zod/v4'

// Опции для NativeSelect (используют title вместо label)
export const companySizeOptions = [
  { value: 'startup', title: 'Стартап (1-10)' },
  { value: 'small', title: 'Малый (11-50)' },
  { value: 'medium', title: 'Средний (51-200)' },
  { value: 'large', title: 'Крупный (201-1000)' },
  { value: 'enterprise', title: 'Корпорация (1000+)' },
]

export const teamSizeOptions = [
  { value: '1-3', title: '1-3 человека' },
  { value: '4-7', title: '4-7 человек' },
  { value: '8-15', title: '8-15 человек' },
  { value: '15+', title: 'Больше 15' },
]

export const timezoneOptions = [
  { value: 'UTC+0', title: 'UTC+0 (Лондон)' },
  { value: 'UTC+1', title: 'UTC+1 (Берлин)' },
  { value: 'UTC+2', title: 'UTC+2 (Киев)' },
  { value: 'UTC+3', title: 'UTC+3 (Москва)' },
  { value: 'UTC+4', title: 'UTC+4 (Дубай)' },
  { value: 'UTC+5', title: 'UTC+5 (Ташкент)' },
  { value: 'UTC+5:30', title: 'UTC+5:30 (Мумбаи)' },
  { value: 'UTC+8', title: 'UTC+8 (Пекин)' },
  { value: 'UTC-5', title: 'UTC-5 (Нью-Йорк)' },
  { value: 'UTC-8', title: 'UTC-8 (Лос-Анджелес)' },
  { value: 'any', title: 'Любой' },
]

// Опции для RadioGroup (используют label)
export const projectTypeOptions = [
  { value: 'web', label: 'Web-приложение' },
  { value: 'mobile', label: 'Мобильное приложение' },
  { value: 'desktop', label: 'Desktop-приложение' },
  { value: 'other', label: 'Другое' },
]

export const employmentTypeOptions = [
  { value: 'full-time', label: 'Полная занятость' },
  { value: 'part-time', label: 'Частичная занятость' },
  { value: 'contract', label: 'Контракт' },
  { value: 'freelance', label: 'Фриланс' },
]

// Zod схема формы
export const HireFormSchema = z
  .object({
    // Шаг 1: О компании
    companyName: z.string().min(2, 'Минимум 2 символа'),
    companyWebsite: z.string().url('Введите корректный URL').optional().or(z.literal('')),
    companySize: z.string().optional(),
    industry: z.string().optional(),

    // Шаг 2: Команда
    teamSize: z.string().optional(),
    teamStructure: z.string().optional(),
    remoteFriendly: z.boolean().default(true),

    // Шаг 3: Стек
    techStack: z.array(z.string()).default([]),
    projectType: z.string().optional(),

    // Шаг 4: Условия
    employmentType: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional(),

    // Шаг 5: Компенсация
    salaryRange: z.string().optional(),
    benefits: z.string().optional(),

    // Шаг 6: Процесс
    hiringProcess: z.string().optional(),
    startDate: z.string().optional(),

    // Шаг 7: Контакты
    contactName: z.string().min(2, 'Минимум 2 символа'),
    contactEmail: z.string().email('Введите корректный email'),
    contactTelegram: z.string().optional(),
    message: z.string().optional(),
  })
  .strip()

export type HireFormData = z.infer<typeof HireFormSchema>

// Дефолтные значения
export const defaultHireFormValues: HireFormData = {
  companyName: '',
  companyWebsite: '',
  companySize: '',
  industry: '',
  teamSize: '',
  teamStructure: '',
  remoteFriendly: true,
  techStack: [],
  projectType: '',
  employmentType: '',
  location: '',
  timezone: '',
  salaryRange: '',
  benefits: '',
  hiringProcess: '',
  startDate: '',
  contactName: '',
  contactEmail: '',
  contactTelegram: '',
  message: '',
}
