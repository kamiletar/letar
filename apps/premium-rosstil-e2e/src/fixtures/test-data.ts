/**
 * Тестовые данные для E2E тестов
 */

export const TEST_ADMIN = {
  email: 'admin@test.local',
  password: 'TestAdmin123!',
  name: 'Тест Админ',
}

export const TEST_USER = {
  email: 'user@test.local',
  password: 'TestUser123!',
  name: 'Тест Покупатель',
}

// Женские размеры для тестов
export const FEMALE_SIZES = [
  {
    international: 'XS',
    ru: '40',
    de: '32',
    it: '38',
    fr: '34',
    uk: '6',
    us: '2',
    jeansFrom: '24',
    jeansTo: '25',
    bustMin: 76,
    bustMax: 80,
    waistMin: 58,
    waistMax: 62,
    hipsMin: 82,
    hipsMax: 86,
  },
  {
    international: 'S',
    ru: '42',
    de: '34',
    it: '40',
    fr: '36',
    uk: '8',
    us: '4',
    jeansFrom: '25',
    jeansTo: '26',
    bustMin: 80,
    bustMax: 84,
    waistMin: 62,
    waistMax: 66,
    hipsMin: 86,
    hipsMax: 90,
  },
  {
    international: 'M',
    ru: '44',
    de: '36',
    it: '42',
    fr: '38',
    uk: '10',
    us: '6',
    jeansFrom: '27',
    jeansTo: '28',
    bustMin: 84,
    bustMax: 88,
    waistMin: 66,
    waistMax: 70,
    hipsMin: 90,
    hipsMax: 94,
  },
  {
    international: 'L',
    ru: '46',
    de: '38',
    it: '44',
    fr: '40',
    uk: '12',
    us: '8',
    jeansFrom: '29',
    jeansTo: '30',
    bustMin: 88,
    bustMax: 92,
    waistMin: 70,
    waistMax: 74,
    hipsMin: 94,
    hipsMax: 98,
  },
  {
    international: 'XL',
    ru: '48',
    de: '40',
    it: '46',
    fr: '42',
    uk: '14',
    us: '10',
    jeansFrom: '31',
    jeansTo: '32',
    bustMin: 92,
    bustMax: 96,
    waistMin: 74,
    waistMax: 78,
    hipsMin: 98,
    hipsMax: 102,
  },
]

// Тестовые товары
export const TEST_PRODUCTS = [
  {
    name: 'Платье "Элегант"',
    description: 'Элегантное вечернее платье',
    gender: 'FEMALE',
    variants: [
      {
        color: 'Черный',
        composition: '95% полиэстер, 5% эластан',
        images: ['1_1.jpg', '1_2.jpg'],
        items: [
          { size: 'XS', price: 15000, availableCount: 5 },
          { size: 'S', price: 15000, availableCount: 10 },
          { size: 'M', price: 15000, availableCount: 10 },
          { size: 'L', price: 15000, availableCount: 5 },
          { size: 'XL', price: 15000, availableCount: 3 },
        ],
      },
    ],
  },
  {
    name: 'Блузка "Минимал"',
    description: 'Минималистичная блузка для офиса',
    gender: 'FEMALE',
    variants: [
      {
        color: 'Белый',
        composition: '100% хлопок',
        images: ['2_1.jpg', '2_2.jpg'],
        items: [
          { size: 'S', price: 8500, availableCount: 15 },
          { size: 'M', price: 8500, availableCount: 20 },
          { size: 'L', price: 8500, availableCount: 10 },
        ],
      },
      {
        color: 'Бежевый',
        composition: '100% хлопок',
        images: ['3_1.jpg'],
        items: [
          { size: 'S', price: 8500, availableCount: 10 },
          { size: 'M', price: 8500, availableCount: 15 },
        ],
      },
    ],
  },
  {
    name: 'Брюки "Классик"',
    description: 'Классические брюки',
    gender: 'FEMALE',
    variants: [
      {
        color: 'Темно-синий',
        composition: '70% шерсть, 30% полиэстер',
        images: ['4_1.jpg'],
        items: [
          { size: 'XS', price: 12000, availableCount: 8 },
          { size: 'S', price: 12000, availableCount: 12 },
          { size: 'M', price: 12000, availableCount: 15 },
          { size: 'L', price: 12000, availableCount: 10 },
        ],
      },
    ],
  },
]

// Тестовые мерки пользователя
export const TEST_USER_MEASUREMENTS = {
  gender: 'FEMALE',
  bust: 86,
  waist: 68,
  hips: 94,
  height: 168,
}

// Тестовый адрес доставки
export const TEST_ADDRESS = {
  label: 'Дом',
  recipientName: 'Тест Покупатель',
  phone: '+7 999 123-45-67',
  address: 'Москва, ул. Тверская, д. 1, кв. 10',
}
