/**
 * Статические данные организаторов по городам.
 * Обновляются вручную — данные редко меняются.
 */

export interface OrganizerInfo {
  /** Уникальный slug для имени файла фото */
  slug: string
  /** Полное имя */
  name: string
  /** Ссылка на соцсеть (telegram, vk и т.д.) */
  socialUrl: string | null
  /** Биография / описание роли */
  bio: string
}

/** Организаторы по citySlug */
export const ORGANIZERS_BY_CITY: Record<string, OrganizerInfo[]> = {
  moskva: [
    {
      slug: 'denis-rubin',
      name: 'Денис Рубин',
      socialUrl: 'https://t.me/rubin_write',
      bio: 'Создатель Кубка Большого Слэма, организатор и ведущий слэмов в Питере с 2001–2002 года.',
    },
    {
      slug: 'svetlana-nosova',
      name: 'Светлана Носова',
      socialUrl: 'https://t.me/+a68FfVCCDUJmZTky',
      bio: 'Поэт, организатор, идеолог московского КБС, редактор тг-канала Кубка, участница команды РЫБА.',
    },
    {
      slug: 'aleksandra-airapetova',
      name: 'Александра Айрапетова',
      socialUrl: 'https://t.me/prigoro4ek',
      bio: 'Поэт, соорганизатор ЛитПонов, ведущая КБС, в первом сезоне играла за команды Птица поэта и ЛитПон.',
    },
    {
      slug: 'vanya-shuplyakov',
      name: 'Ваня Шупляков',
      socialUrl: 'https://t.me/vanya_shuplyakov',
      bio: 'Поэт, организатор ЛитПонов, ведущий КБС, в первом сезоне был тренером команды ЛитПон.',
    },
    {
      slug: 'ivan-simak',
      name: 'Иван Симак',
      socialUrl: 'https://t.me/simak_vanya',
      bio: 'Поэт, тренер команды Шатуны, победитель в номинации «Лучший тренер первого сезона КБС».',
    },
    {
      slug: 'dasha-kulagina',
      name: 'Даша Кулагина',
      socialUrl: 'https://vk.ru/dashakulagina1',
      bio: 'Ведущая и цифровик КБС, победительница в номинации «Лучший ведущий первого сезона КБС».',
    },
    {
      slug: 'ruslan-shishkin',
      name: 'Руслан Шишкин',
      socialUrl: 'https://t.me/shishkinruslan',
      bio: 'Поэт, организатор, в первом сезоне был тренером команды РЫБА, во втором играет за команду Шатуны.',
    },
    {
      slug: 'grigoriy-sofiyskiy',
      name: 'Григорий Софийский',
      socialUrl: 'https://t.me/voiedesoie_official',
      bio: 'Поэт, участник команды Кашалот, победитель в номинации «Главное открытие первого сезона КБС».',
    },
    {
      slug: 'polina-pehtereva',
      name: 'Полина Пехтерева',
      socialUrl: 'https://t.me/ppeh_stih',
      bio: 'Поэт, в первом сезоне играла за команду TERIYAKI SQUAD, во втором создала команду In Folio.',
    },
    {
      slug: 'kostya-denisov',
      name: 'Костя Денисов',
      socialUrl: 'https://t.me/poetchitalgluhoysoglasnoy',
      bio: 'Поэт, ведущий и цифровик КБС, участник команды Шатуны.',
    },
  ],
}
