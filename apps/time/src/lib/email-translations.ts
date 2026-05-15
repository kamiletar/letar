/**
 * Переводы для email-уведомлений о юбилеях UNIX-часов.
 * Используется в cron route — без зависимости от next-intl.
 */

import type { NotificationType } from './milestone'

/** Структура переводов для одного языка */
interface EmailStrings {
  /** Метки времени: "через месяц", "через неделю" и т.д. */
  timeLabels: Record<NotificationType, string>
  /** Тема письма: "{milestone} часов UNIX — {timeLabel}!" */
  subject: (milestone: string, timeLabel: string) => string
  /** Приветствие: "Привет, {name}!" или "Привет!" */
  greeting: (name?: string | null) => string
  /** Тело письма */
  body: (milestone: string, dateStr: string) => string
  /** Текст кнопки */
  buttonText: string
  /** Текст футера с ссылкой на отписку */
  footer: (url: string) => string
}

/** Переводы для всех поддерживаемых языков */
export const EMAIL_TRANSLATIONS: Record<string, EmailStrings> = {
  ru: {
    timeLabels: {
      month: 'через месяц',
      week: 'через неделю',
      day: 'через день',
      hour: 'через час',
      '5min': 'через 5 минут',
    },
    subject: (m, t) => `${m} часов UNIX — ${t}!`,
    greeting: (name) => (name ? `Привет, ${name}!` : 'Привет!'),
    body: (m, d) => `${m} часов с начала эпохи UNIX наступит ${d}. Не пропустите этот момент!`,
    buttonText: 'Открыть Unix Time',
    footer: (url) => `Отписаться от уведомлений: ${url}`,
  },
  en: {
    timeLabels: {
      month: 'in one month',
      week: 'in one week',
      day: 'in one day',
      hour: 'in one hour',
      '5min': 'in 5 minutes',
    },
    subject: (m, t) => `${m} UNIX hours — ${t}!`,
    greeting: (name) => (name ? `Hi, ${name}!` : 'Hi!'),
    body: (m, d) => `${m} hours since the UNIX epoch will occur on ${d}. Don't miss this moment!`,
    buttonText: 'Open Unix Time',
    footer: (url) => `Unsubscribe from notifications: ${url}`,
  },
  fr: {
    timeLabels: {
      month: 'dans un mois',
      week: 'dans une semaine',
      day: 'dans un jour',
      hour: 'dans une heure',
      '5min': 'dans 5 minutes',
    },
    subject: (m, t) => `${m} heures UNIX — ${t} !`,
    greeting: (name) => (name ? `Bonjour, ${name} !` : 'Bonjour !'),
    body: (m, d) => `${m} heures depuis l'époque UNIX arriveront le ${d}. Ne manquez pas ce moment !`,
    buttonText: 'Ouvrir Unix Time',
    footer: (url) => `Se désabonner des notifications : ${url}`,
  },
  de: {
    timeLabels: {
      month: 'in einem Monat',
      week: 'in einer Woche',
      day: 'in einem Tag',
      hour: 'in einer Stunde',
      '5min': 'in 5 Minuten',
    },
    subject: (m, t) => `${m} UNIX-Stunden — ${t}!`,
    greeting: (name) => (name ? `Hallo, ${name}!` : 'Hallo!'),
    body: (m, d) => `${m} Stunden seit der UNIX-Epoche werden am ${d} erreicht. Verpassen Sie diesen Moment nicht!`,
    buttonText: 'Unix Time öffnen',
    footer: (url) => `Von Benachrichtigungen abmelden: ${url}`,
  },
  ja: {
    timeLabels: { month: '1ヶ月後', week: '1週間後', day: '1日後', hour: '1時間後', '5min': '5分後' },
    subject: (m, t) => `UNIXエポックから${m}時間 — ${t}！`,
    greeting: (name) => (name ? `${name}さん、こんにちは！` : 'こんにちは！'),
    body: (m, d) => `UNIXエポックから${m}時間は${d}に到達します。この瞬間をお見逃しなく！`,
    buttonText: 'Unix Timeを開く',
    footer: (url) => `通知の配信停止: ${url}`,
  },
  zh: {
    timeLabels: { month: '一个月后', week: '一周后', day: '一天后', hour: '一小时后', '5min': '5分钟后' },
    subject: (m, t) => `UNIX纪元${m}小时 — ${t}！`,
    greeting: (name) => (name ? `你好，${name}！` : '你好！'),
    body: (m, d) => `UNIX纪元第${m}小时将在${d}到来。不要错过这个时刻！`,
    buttonText: '打开Unix Time',
    footer: (url) => `取消订阅通知：${url}`,
  },
  ar: {
    timeLabels: { month: 'بعد شهر', week: 'بعد أسبوع', day: 'بعد يوم', hour: 'بعد ساعة', '5min': 'بعد 5 دقائق' },
    subject: (m, t) => `${m} ساعة يونكس — ${t}!`,
    greeting: (name) => (name ? `مرحبًا، ${name}!` : '!مرحبًا'),
    body: (m, d) => `${m} ساعة منذ حقبة يونكس ستحل في ${d}. لا تفوت هذه اللحظة!`,
    buttonText: 'فتح Unix Time',
    footer: (url) => `إلغاء الاشتراك في الإشعارات: ${url}`,
  },
  ko: {
    timeLabels: { month: '한 달 후', week: '일주일 후', day: '하루 후', hour: '한 시간 후', '5min': '5분 후' },
    subject: (m, t) => `UNIX 에포크 ${m}시간 — ${t}!`,
    greeting: (name) => (name ? `안녕하세요, ${name}님!` : '안녕하세요!'),
    body: (m, d) => `UNIX 에포크로부터 ${m}시간이 ${d}에 도달합니다. 이 순간을 놓치지 마세요!`,
    buttonText: 'Unix Time 열기',
    footer: (url) => `알림 구독 취소: ${url}`,
  },
  es: {
    timeLabels: {
      month: 'en un mes',
      week: 'en una semana',
      day: 'en un día',
      hour: 'en una hora',
      '5min': 'en 5 minutos',
    },
    subject: (m, t) => `${m} horas UNIX — ¡${t}!`,
    greeting: (name) => (name ? `¡Hola, ${name}!` : '¡Hola!'),
    body: (m, d) => `${m} horas desde la época UNIX llegarán el ${d}. ¡No te pierdas este momento!`,
    buttonText: 'Abrir Unix Time',
    footer: (url) => `Cancelar suscripción a notificaciones: ${url}`,
  },
  pt: {
    timeLabels: {
      month: 'em um mês',
      week: 'em uma semana',
      day: 'em um dia',
      hour: 'em uma hora',
      '5min': 'em 5 minutos',
    },
    subject: (m, t) => `${m} horas UNIX — ${t}!`,
    greeting: (name) => (name ? `Olá, ${name}!` : 'Olá!'),
    body: (m, d) => `${m} horas desde a época UNIX chegarão em ${d}. Não perca este momento!`,
    buttonText: 'Abrir Unix Time',
    footer: (url) => `Cancelar inscrição nas notificações: ${url}`,
  },
  hi: {
    timeLabels: {
      month: 'एक महीने में',
      week: 'एक सप्ताह में',
      day: 'एक दिन में',
      hour: 'एक घंटे में',
      '5min': '5 मिनट में',
    },
    subject: (m, t) => `${m} UNIX घंटे — ${t}!`,
    greeting: (name) => (name ? `नमस्ते, ${name}!` : 'नमस्ते!'),
    body: (m, d) => `UNIX युग से ${m} घंटे ${d} को पूरे होंगे। इस पल को न चूकें!`,
    buttonText: 'Unix Time खोलें',
    footer: (url) => `सूचनाओं से सदस्यता रद्द करें: ${url}`,
  },
  tr: {
    timeLabels: {
      month: 'bir ay sonra',
      week: 'bir hafta sonra',
      day: 'bir gün sonra',
      hour: 'bir saat sonra',
      '5min': '5 dakika sonra',
    },
    subject: (m, t) => `${m} UNIX saati — ${t}!`,
    greeting: (name) => (name ? `Merhaba, ${name}!` : 'Merhaba!'),
    body: (m, d) => `UNIX döneminden bu yana ${m} saat ${d} tarihinde dolacak. Bu anı kaçırmayın!`,
    buttonText: "Unix Time'ı aç",
    footer: (url) => `Bildirim aboneliğini iptal et: ${url}`,
  },
  pl: {
    timeLabels: { month: 'za miesiąc', week: 'za tydzień', day: 'za dzień', hour: 'za godzinę', '5min': 'za 5 minut' },
    subject: (m, t) => `${m} godzin UNIX — ${t}!`,
    greeting: (name) => (name ? `Cześć, ${name}!` : 'Cześć!'),
    body: (m, d) => `${m} godzin od epoki UNIX nastąpi ${d}. Nie przegap tego momentu!`,
    buttonText: 'Otwórz Unix Time',
    footer: (url) => `Zrezygnuj z powiadomień: ${url}`,
  },
  uk: {
    timeLabels: {
      month: 'через місяць',
      week: 'через тиждень',
      day: 'через день',
      hour: 'через годину',
      '5min': 'через 5 хвилин',
    },
    subject: (m, t) => `${m} годин UNIX — ${t}!`,
    greeting: (name) => (name ? `Привіт, ${name}!` : 'Привіт!'),
    body: (m, d) => `${m} годин з початку епохи UNIX настане ${d}. Не пропустіть цей момент!`,
    buttonText: 'Відкрити Unix Time',
    footer: (url) => `Відписатися від сповіщень: ${url}`,
  },
  be: {
    timeLabels: {
      month: 'праз месяц',
      week: 'праз тыдзень',
      day: 'праз дзень',
      hour: 'праз гадзіну',
      '5min': 'праз 5 хвілін',
    },
    subject: (m, t) => `${m} гадзін UNIX — ${t}!`,
    greeting: (name) => (name ? `Прывітанне, ${name}!` : 'Прывітанне!'),
    body: (m, d) => `${m} гадзін з пачатку эпохі UNIX настане ${d}. Не прапусціце гэты момант!`,
    buttonText: 'Адкрыць Unix Time',
    footer: (url) => `Адпісацца ад апавяшчэнняў: ${url}`,
  },
  kk: {
    timeLabels: {
      month: 'бір айдан кейін',
      week: 'бір аптадан кейін',
      day: 'бір күннен кейін',
      hour: 'бір сағаттан кейін',
      '5min': '5 минуттан кейін',
    },
    subject: (m, t) => `${m} UNIX сағаты — ${t}!`,
    greeting: (name) => (name ? `Сәлем, ${name}!` : 'Сәлем!'),
    body: (m, d) => `UNIX дәуірінен бергі ${m} сағат ${d} күні толады. Бұл сәтті жіберіп алмаңыз!`,
    buttonText: 'Unix Time ашу',
    footer: (url) => `Хабарламалардан бас тарту: ${url}`,
  },
  uz: {
    timeLabels: {
      month: 'bir oydan keyin',
      week: 'bir haftadan keyin',
      day: 'bir kundan keyin',
      hour: 'bir soatdan keyin',
      '5min': '5 daqiqadan keyin',
    },
    subject: (m, t) => `${m} UNIX soati — ${t}!`,
    greeting: (name) => (name ? `Salom, ${name}!` : 'Salom!'),
    body: (m, d) => `UNIX davridan beri ${m} soat ${d} da yetadi. Bu lahzani o'tkazib yubormang!`,
    buttonText: 'Unix Time ochish',
    footer: (url) => `Bildirishnomalardan obunani bekor qilish: ${url}`,
  },
  tg: {
    timeLabels: {
      month: 'пас аз як моҳ',
      week: 'пас аз як ҳафта',
      day: 'пас аз як рӯз',
      hour: 'пас аз як соат',
      '5min': 'пас аз 5 дақиқа',
    },
    subject: (m, t) => `${m} соати UNIX — ${t}!`,
    greeting: (name) => (name ? `Салом, ${name}!` : 'Салом!'),
    body: (m, d) => `${m} соат аз оғози давраи UNIX дар ${d} фаро мерасад. Ин лаҳзаро аз даст надиҳед!`,
    buttonText: 'Unix Time-ро кушоед',
    footer: (url) => `Аз огоҳиномаҳо даст кашидан: ${url}`,
  },
  ky: {
    timeLabels: {
      month: 'бир айдан кийин',
      week: 'бир жумадан кийин',
      day: 'бир күндөн кийин',
      hour: 'бир сааттан кийин',
      '5min': '5 мүнөттөн кийин',
    },
    subject: (m, t) => `${m} UNIX саат — ${t}!`,
    greeting: (name) => (name ? `Салам, ${name}!` : 'Салам!'),
    body: (m, d) => `UNIX доорунан берки ${m} саат ${d} күнү толот. Бул учурду өткөрбөңүз!`,
    buttonText: 'Unix Time ачуу',
    footer: (url) => `Билдирмелерден баш тартуу: ${url}`,
  },
  tk: {
    timeLabels: {
      month: 'bir aýdan soň',
      week: 'bir hepdeden soň',
      day: 'bir günden soň',
      hour: 'bir sagatdan soň',
      '5min': '5 minutdan soň',
    },
    subject: (m, t) => `${m} UNIX sagady — ${t}!`,
    greeting: (name) => (name ? `Salam, ${name}!` : 'Salam!'),
    body: (m, d) => `UNIX eýýamyndan bäri ${m} sagat ${d} senesinde dolar. Bu pursaty sypdyrmaň!`,
    buttonText: 'Unix Time aç',
    footer: (url) => `Habarnama ýazylmasyny ýatyrmak: ${url}`,
  },
  az: {
    timeLabels: {
      month: 'bir aydan sonra',
      week: 'bir həftədən sonra',
      day: 'bir gündən sonra',
      hour: 'bir saatdan sonra',
      '5min': '5 dəqiqədən sonra',
    },
    subject: (m, t) => `${m} UNIX saatı — ${t}!`,
    greeting: (name) => (name ? `Salam, ${name}!` : 'Salam!'),
    body: (m, d) => `UNIX erasından bəri ${m} saat ${d} tarixində tamam olacaq. Bu anı qaçırmayın!`,
    buttonText: 'Unix Time aç',
    footer: (url) => `Bildirişlərdən abunəni ləğv et: ${url}`,
  },
  // Армянский и грузинский — fallback на английский формат (как и numberToWords)
  hy: {
    timeLabels: {
      month: 'in one month',
      week: 'in one week',
      day: 'in one day',
      hour: 'in one hour',
      '5min': 'in 5 minutes',
    },
    subject: (m, t) => `UNIX ${m} hours - ${t}!`,
    greeting: (name) => (name ? `Hi, ${name}!` : 'Hi!'),
    body: (m, d) => `${m} hours since the UNIX epoch will occur on ${d}. Don't miss it!`,
    buttonText: 'Open Unix Time',
    footer: (url) => `Unsubscribe: ${url}`,
  },
  ka: {
    timeLabels: {
      month: 'in one month',
      week: 'in one week',
      day: 'in one day',
      hour: 'in one hour',
      '5min': 'in 5 minutes',
    },
    subject: (m, t) => `UNIX ${m} hours - ${t}!`,
    greeting: (name) => (name ? `Hi, ${name}!` : 'Hi!'),
    body: (m, d) => `${m} hours since the UNIX epoch will occur on ${d}. Don't miss it!`,
    buttonText: 'Open Unix Time',
    footer: (url) => `Unsubscribe: ${url}`,
  },
  ro: {
    timeLabels: {
      month: 'peste o lun\u0103',
      week: 'peste o s\u0103pt\u0103m\u00e2n\u0103',
      day: 'peste o zi',
      hour: 'peste o or\u0103',
      '5min': '\u00een 5 minute',
    },
    subject: (m, t) => `${m} ore UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `Salut, ${name}!` : 'Salut!'),
    body: (m, d) => `${m} ore de la epoca UNIX vor fi atinse pe ${d}. Nu rata\u021bi acest moment!`,
    buttonText: 'Deschide Unix Time',
    footer: (url) => `Dezabonare de la notific\u0103ri: ${url}`,
  },
  fa: {
    timeLabels: {
      month: '\u06cc\u06a9 \u0645\u0627\u0647 \u062f\u06cc\u06af\u0631',
      week: '\u06cc\u06a9 \u0647\u0641\u062a\u0647 \u062f\u06cc\u06af\u0631',
      day: '\u06cc\u06a9 \u0631\u0648\u0632 \u062f\u06cc\u06af\u0631',
      hour: '\u06cc\u06a9 \u0633\u0627\u0639\u062a \u062f\u06cc\u06af\u0631',
      '5min': '5 \u062f\u0642\u06cc\u0642\u0647 \u062f\u06cc\u06af\u0631',
    },
    subject: (m, t) => `${m} \u0633\u0627\u0639\u062a \u06cc\u0648\u0646\u06cc\u06a9\u0633 \u2014 ${t}!`,
    greeting: (name) => (name ? `\u0633\u0644\u0627\u0645\u060c ${name}!` : '\u0633\u0644\u0627\u0645!'),
    body: (m, d) =>
      `${m} \u0633\u0627\u0639\u062a \u0627\u0632 \u0622\u063a\u0627\u0632 \u062f\u0648\u0631\u0647 \u06cc\u0648\u0646\u06cc\u06a9\u0633 \u062f\u0631 ${d} \u0641\u0631\u0627 \u0645\u06cc\u200c\u0631\u0633\u062f. \u0627\u06cc\u0646 \u0644\u062d\u0638\u0647 \u0631\u0627 \u0627\u0632 \u062f\u0633\u062a \u0646\u062f\u0647\u06cc\u062f!`,
    buttonText: '\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 Unix Time',
    footer: (url) =>
      `\u0644\u063a\u0648 \u0627\u0634\u062a\u0631\u0627\u06a9 \u0627\u0632 \u0627\u0639\u0644\u0627\u0646\u200c\u0647\u0627: ${url}`,
  },
  bn: {
    timeLabels: {
      month: '\u098f\u0995 \u09ae\u09be\u09b8\u09c7',
      week: '\u098f\u0995 \u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7',
      day: '\u098f\u0995 \u09a6\u09bf\u09a8\u09c7',
      hour: '\u098f\u0995 \u0998\u09a8\u09cd\u09a0\u09be\u09df',
      '5min': '5 \u09ae\u09bf\u09a8\u09bf\u099f\u09c7',
    },
    subject: (m, t) => `${m} UNIX \u0998\u09a8\u09cd\u099f\u09be \u2014 ${t}!`,
    greeting: (name) =>
      name ? `\u09a8\u09ae\u09b8\u09cd\u0995\u09be\u09b0, ${name}!` : '\u09a8\u09ae\u09b8\u09cd\u0995\u09be\u09b0!',
    body: (m, d) =>
      `UNIX \u09af\u09c1\u0997 \u09a5\u09c7\u0995\u09c7 ${m} \u0998\u09a8\u09cd\u099f\u09be ${d} \u09a4\u09c7 \u09aa\u09c2\u09b0\u09cd\u09a3 \u09b9\u09ac\u09c7\u0964 \u098f\u0987 \u09ae\u09c1\u09b9\u09c2\u09b0\u09cd\u09a4\u099f\u09bf \u09ae\u09bf\u09b8 \u0995\u09b0\u09ac\u09c7\u09a8 \u09a8\u09be!`,
    buttonText: 'Unix Time \u0996\u09c1\u09b2\u09c1\u09a8',
    footer: (url) =>
      `\u09b8\u09be\u09ac\u09b8\u09cd\u0995\u09cd\u09b0\u09bf\u09aa\u09b6\u09a8 \u09ac\u09be\u09a4\u09bf\u09b2: ${url}`,
  },
  id: {
    timeLabels: {
      month: 'dalam satu bulan',
      week: 'dalam satu minggu',
      day: 'dalam satu hari',
      hour: 'dalam satu jam',
      '5min': 'dalam 5 menit',
    },
    subject: (m, t) => `${m} jam UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `Halo, ${name}!` : 'Halo!'),
    body: (m, d) => `${m} jam sejak epoch UNIX akan terjadi pada ${d}. Jangan lewatkan momen ini!`,
    buttonText: 'Buka Unix Time',
    footer: (url) => `Berhenti berlangganan notifikasi: ${url}`,
  },
  ms: {
    timeLabels: {
      month: 'dalam satu bulan',
      week: 'dalam satu minggu',
      day: 'dalam satu hari',
      hour: 'dalam satu jam',
      '5min': 'dalam 5 minit',
    },
    subject: (m, t) => `${m} jam UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `Hai, ${name}!` : 'Hai!'),
    body: (m, d) => `${m} jam sejak epoch UNIX akan berlaku pada ${d}. Jangan terlepas momen ini!`,
    buttonText: 'Buka Unix Time',
    footer: (url) => `Nyahlanggan daripada pemberitahuan: ${url}`,
  },
  vi: {
    timeLabels: {
      month: 'trong m\u1ed9t th\u00e1ng',
      week: 'trong m\u1ed9t tu\u1ea7n',
      day: 'trong m\u1ed9t ng\u00e0y',
      hour: 'trong m\u1ed9t gi\u1edd',
      '5min': 'trong 5 ph\u00fat',
    },
    subject: (m, t) => `${m} gi\u1edd UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `Xin ch\u00e0o, ${name}!` : 'Xin ch\u00e0o!'),
    body: (m, d) =>
      `${m} gi\u1edd k\u1ec3 t\u1eeb k\u1ef7 nguy\u00ean UNIX s\u1ebd \u0111\u1ebfn v\u00e0o ${d}. \u0110\u1eebng b\u1ecf l\u1ee1 kho\u1ea3nh kh\u1eafc n\u00e0y!`,
    buttonText: 'M\u1edf Unix Time',
    footer: (url) => `H\u1ee7y \u0111\u0103ng k\u00fd th\u00f4ng b\u00e1o: ${url}`,
  },
  th: {
    timeLabels: {
      month: '\u0e2d\u0e35\u0e01 1 \u0e40\u0e14\u0e37\u0e2d\u0e19',
      week: '\u0e2d\u0e35\u0e01 1 \u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c',
      day: '\u0e2d\u0e35\u0e01 1 \u0e27\u0e31\u0e19',
      hour: '\u0e2d\u0e35\u0e01 1 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07',
      '5min': '\u0e2d\u0e35\u0e01 5 \u0e19\u0e32\u0e17\u0e35',
    },
    subject: (m, t) => `${m} \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07 UNIX \u2014 ${t}!`,
    greeting: (name) =>
      name
        ? `\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e04\u0e23\u0e31\u0e1a ${name}!`
        : '\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e04\u0e23\u0e31\u0e1a!',
    body: (m, d) =>
      `${m} \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07\u0e19\u0e31\u0e1a\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48 UNIX epoch \u0e08\u0e30\u0e21\u0e32\u0e16\u0e36\u0e07\u0e43\u0e19\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${d} \u0e2d\u0e22\u0e48\u0e32\u0e1e\u0e25\u0e32\u0e14\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e25\u0e32\u0e19\u0e35\u0e49!`,
    buttonText: '\u0e40\u0e1b\u0e34\u0e14 Unix Time',
    footer: (url) =>
      `\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19: ${url}`,
  },
  sw: {
    timeLabels: {
      month: 'baada ya mwezi mmoja',
      week: 'baada ya wiki moja',
      day: 'baada ya siku moja',
      hour: 'baada ya saa moja',
      '5min': 'baada ya dakika 5',
    },
    subject: (m, t) => `Saa ${m} za UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `Habari, ${name}!` : 'Habari!'),
    body: (m, d) => `Saa ${m} tangu enzi ya UNIX itafikiwa ${d}. Usikose wakati huu!`,
    buttonText: 'Fungua Unix Time',
    footer: (url) => `Jiondoe kutoka arifa: ${url}`,
  },
  nl: {
    timeLabels: {
      month: 'over een maand',
      week: 'over een week',
      day: 'over een dag',
      hour: 'over een uur',
      '5min': 'over 5 minuten',
    },
    subject: (m, t) => `${m} UNIX-uren \u2014 ${t}!`,
    greeting: (name) => (name ? `Hallo, ${name}!` : 'Hallo!'),
    body: (m, d) => `${m} uur sinds het UNIX-tijdperk wordt bereikt op ${d}. Mis dit moment niet!`,
    buttonText: 'Open Unix Time',
    footer: (url) => `Uitschrijven van meldingen: ${url}`,
  },
  sv: {
    timeLabels: {
      month: 'om en m\u00e5nad',
      week: 'om en vecka',
      day: 'om en dag',
      hour: 'om en timme',
      '5min': 'om 5 minuter',
    },
    subject: (m, t) => `${m} UNIX-timmar \u2014 ${t}!`,
    greeting: (name) => (name ? `Hej, ${name}!` : 'Hej!'),
    body: (m, d) => `${m} timmar sedan UNIX-epoken n\u00e5s den ${d}. Missa inte detta \u00f6gonblick!`,
    buttonText: '\u00d6ppna Unix Time',
    footer: (url) => `Avprenumerera fr\u00e5n aviseringar: ${url}`,
  },
  it: {
    timeLabels: {
      month: 'tra un mese',
      week: 'tra una settimana',
      day: 'tra un giorno',
      hour: "tra un'ora",
      '5min': 'tra 5 minuti',
    },
    subject: (m, t) => `${m} ore UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `Ciao, ${name}!` : 'Ciao!'),
    body: (m, d) => `${m} ore dall'epoca UNIX saranno raggiunte il ${d}. Non perdere questo momento!`,
    buttonText: 'Apri Unix Time',
    footer: (url) => `Annulla iscrizione alle notifiche: ${url}`,
  },
  el: {
    timeLabels: {
      month: '\u03c3\u03b5 \u03ad\u03bd\u03b1 \u03bc\u03ae\u03bd\u03b1',
      week: '\u03c3\u03b5 \u03bc\u03af\u03b1 \u03b5\u03b2\u03b4\u03bf\u03bc\u03ac\u03b4\u03b1',
      day: '\u03c3\u03b5 \u03bc\u03af\u03b1 \u03bc\u03ad\u03c1\u03b1',
      hour: '\u03c3\u03b5 \u03bc\u03af\u03b1 \u03ce\u03c1\u03b1',
      '5min': '\u03c3\u03b5 5 \u03bb\u03b5\u03c0\u03c4\u03ac',
    },
    subject: (m, t) => `${m} \u03ce\u03c1\u03b5\u03c2 UNIX \u2014 ${t}!`,
    greeting: (name) =>
      name ? `\u0393\u03b5\u03b9\u03b1 \u03c3\u03bf\u03c5, ${name}!` : '\u0393\u03b5\u03b9\u03b1 \u03c3\u03bf\u03c5!',
    body: (m, d) =>
      `${m} \u03ce\u03c1\u03b5\u03c2 \u03b1\u03c0\u03cc \u03c4\u03b7\u03bd \u03b5\u03c0\u03bf\u03c7\u03ae UNIX \u03b8\u03b1 \u03c6\u03c4\u03ac\u03c3\u03bf\u03c5\u03bd \u03c3\u03c4\u03b9\u03c2 ${d}. \u039c\u03b7\u03bd \u03c7\u03ac\u03c3\u03b5\u03c4\u03b5 \u03b1\u03c5\u03c4\u03ae \u03c4\u03b7 \u03c3\u03c4\u03b9\u03b3\u03bc\u03ae!`,
    buttonText: '\u0386\u03bd\u03bf\u03b9\u03b3\u03bc\u03b1 Unix Time',
    footer: (url) =>
      `\u039a\u03b1\u03c4\u03ac\u03c1\u03b3\u03b7\u03c3\u03b7 \u03b5\u03b3\u03b3\u03c1\u03b1\u03c6\u03ae\u03c2 \u03b1\u03c0\u03cc \u03b5\u03b9\u03b4\u03bf\u03c0\u03bf\u03b9\u03ae\u03c3\u03b5\u03b9\u03c2: ${url}`,
  },
  he: {
    timeLabels: {
      month: '\u05e2\u05d5\u05d3 \u05d7\u05d5\u05d3\u05e9',
      week: '\u05e2\u05d5\u05d3 \u05e9\u05d1\u05d5\u05e2',
      day: '\u05e2\u05d5\u05d3 \u05d9\u05d5\u05dd',
      hour: '\u05e2\u05d5\u05d3 \u05e9\u05e2\u05d4',
      '5min': '\u05e2\u05d5\u05d3 5 \u05d3\u05e7\u05d5\u05ea',
    },
    subject: (m, t) => `${m} \u05e9\u05e2\u05d5\u05ea UNIX \u2014 ${t}!`,
    greeting: (name) => (name ? `\u05e9\u05dc\u05d5\u05dd, ${name}!` : '!\u05e9\u05dc\u05d5\u05dd'),
    body: (m, d) =>
      `${m} \u05e9\u05e2\u05d5\u05ea \u05de\u05d0\u05d6 \u05ea\u05d7\u05d9\u05dc\u05ea \u05e2\u05d9\u05d3\u05df UNIX \u05d9\u05d2\u05d9\u05e2\u05d5 \u05d1\u05ea\u05d0\u05e8\u05d9\u05da ${d}. \u05d0\u05dc \u05ea\u05e4\u05e1\u05e4\u05e1\u05d5 \u05d0\u05ea \u05d4\u05e8\u05d2\u05e2 \u05d4\u05d6\u05d4!`,
    buttonText: '\u05e4\u05ea\u05d7 Unix Time',
    footer: (url) =>
      `\u05d1\u05d9\u05d8\u05d5\u05dc \u05d4\u05e8\u05e9\u05de\u05d4 \u05dc\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea: ${url}`,
  },
  ur: {
    timeLabels: {
      month: '\u0627\u06cc\u06a9 \u0645\u06c1\u06cc\u0646\u06d2 \u0645\u06cc\u06ba',
      week: '\u0627\u06cc\u06a9 \u06c1\u0641\u062a\u06d2 \u0645\u06cc\u06ba',
      day: '\u0627\u06cc\u06a9 \u062f\u0646 \u0645\u06cc\u06ba',
      hour: '\u0627\u06cc\u06a9 \u06af\u06be\u0646\u0679\u06d2 \u0645\u06cc\u06ba',
      '5min': '5 \u0645\u0646\u0679 \u0645\u06cc\u06ba',
    },
    subject: (m, t) => `${m} UNIX \u06af\u06be\u0646\u0679\u06d2 \u2014 ${t}!`,
    greeting: (name) =>
      name
        ? `\u0627\u0633\u0644\u0627\u0645 \u0639\u0644\u06cc\u06a9\u0645\u060c ${name}!`
        : '!\u0627\u0633\u0644\u0627\u0645 \u0639\u0644\u06cc\u06a9\u0645',
    body: (m, d) =>
      `UNIX \u062f\u0648\u0631 \u0633\u06d2 ${m} \u06af\u06be\u0646\u0679\u06d2 ${d} \u06a9\u0648 \u067e\u0648\u0631\u06d2 \u06c1\u0648\u06ba \u06af\u06d2\u06d4 \u06cc\u06c1 \u0644\u0645\u062d\u06c1 \u0645\u062a \u06af\u0646\u0648\u0627\u0626\u06cc\u06ba!`,
    buttonText: 'Unix Time \u06a9\u06be\u0648\u0644\u06cc\u06ba',
    footer: (url) =>
      `\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0633\u06d2 \u0627\u0646 \u0633\u0628\u0633\u06a9\u0631\u0627\u0626\u0628: ${url}`,
  },
  mr: {
    timeLabels: {
      month: '\u090f\u0915\u093e \u092e\u0939\u093f\u0928\u094d\u092f\u093e\u0924',
      week: '\u090f\u0915\u093e \u0906\u0920\u0935\u0921\u094d\u092f\u093e\u0924',
      day: '\u090f\u0915\u093e \u0926\u093f\u0935\u0938\u093e\u0924',
      hour: '\u090f\u0915\u093e \u0924\u093e\u0938\u093e\u0924',
      '5min': '5 \u092e\u093f\u0928\u093f\u091f\u093e\u0902\u0924',
    },
    subject: (m, t) => `${m} UNIX \u0924\u093e\u0938 \u2014 ${t}!`,
    greeting: (name) =>
      name ? `\u0928\u092e\u0938\u094d\u0915\u093e\u0930, ${name}!` : '\u0928\u092e\u0938\u094d\u0915\u093e\u0930!',
    body: (m, d) =>
      `UNIX \u092f\u0941\u0917\u093e\u092a\u093e\u0938\u0942\u0928 ${m} \u0924\u093e\u0938 ${d} \u0930\u094b\u091c\u0940 \u092a\u0942\u0930\u094d\u0923 \u0939\u094b\u0924\u0940\u0932. \u0939\u093e \u0915\u094d\u0937\u0923 \u091a\u0941\u0915\u0935\u0942 \u0928\u0915\u093e!`,
    buttonText: 'Unix Time \u0909\u0918\u0921\u093e',
    footer: (url) =>
      `\u0938\u0942\u091a\u0928\u093e\u0902\u091a\u0947 \u0938\u0926\u0938\u094d\u092f\u0924\u094d\u0935 \u0930\u0926\u094d\u0926 \u0915\u0930\u093e: ${url}`,
  },
  ta: {
    timeLabels: {
      month: '\u0b92\u0bb0\u0bc1 \u0bae\u0bbe\u0ba4\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bcd',
      week: '\u0b92\u0bb0\u0bc1 \u0bb5\u0bbe\u0bb0\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bcd',
      day: '\u0b92\u0bb0\u0bc1 \u0ba8\u0bbe\u0bb3\u0bbf\u0bb2\u0bcd',
      hour: '\u0b92\u0bb0\u0bc1 \u0bae\u0ba3\u0bbf \u0ba8\u0bc7\u0bb0\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bcd',
      '5min': '5 \u0ba8\u0bbf\u0bae\u0bbf\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bbf\u0bb2\u0bcd',
    },
    subject: (m, t) => `${m} UNIX \u0bae\u0ba3\u0bbf\u0ba8\u0bc7\u0bb0\u0bae\u0bcd \u2014 ${t}!`,
    greeting: (name) =>
      name ? `\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd, ${name}!` : '\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd!',
    body: (m, d) =>
      `UNIX \u0b95\u0bbe\u0bb2\u0b95\u0bcd\u0b95\u0b9f\u0bcd\u0b9f\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 ${m} \u0bae\u0ba3\u0bbf\u0ba8\u0bc7\u0bb0\u0bae\u0bcd ${d} \u0b85\u0ba9\u0bcd\u0bb1\u0bc1 \u0ba8\u0bbf\u0bb1\u0bc8\u0bb5\u0bc1\u0bae\u0bcd. \u0b87\u0ba8\u0bcd\u0ba4 \u0ba4\u0bb0\u0bc1\u0ba3\u0ba4\u0bcd\u0ba4\u0bc8 \u0ba4\u0bb5\u0bb1\u0bb5\u0bbf\u0b9f\u0bbe\u0ba4\u0bc0\u0bb0\u0bcd\u0b95\u0bb3\u0bcd!`,
    buttonText: 'Unix Time \u0ba4\u0bbf\u0bb1',
    footer: (url) =>
      `\u0b85\u0bb1\u0bbf\u0bb5\u0bbf\u0baa\u0bcd\u0baa\u0bc1\u0b95\u0bb3\u0bbf\u0bb2\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0ba4\u0bb3\u0bcd\u0bb3\u0bc1\u0baa\u0b9f\u0bbf: ${url}`,
  },
  te: {
    timeLabels: {
      month: '\u0c12\u0c15 \u0c28\u0c46\u0c32\u0c32\u0c4b',
      week: '\u0c12\u0c15 \u0c35\u0c3e\u0c30\u0c02\u0c32\u0c4b',
      day: '\u0c12\u0c15 \u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c4b',
      hour: '\u0c12\u0c15 \u0c17\u0c02\u0c1f\u0c32\u0c4b',
      '5min': '5 \u0c28\u0c3f\u0c2e\u0c3f\u0c37\u0c3e\u0c32\u0c4d\u0c32\u0c4b',
    },
    subject: (m, t) => `${m} UNIX \u0c17\u0c02\u0c1f\u0c32\u0c41 \u2014 ${t}!`,
    greeting: (name) =>
      name
        ? `\u0c28\u0c2e\u0c38\u0c4d\u0c15\u0c3e\u0c30\u0c02, ${name}!`
        : '\u0c28\u0c2e\u0c38\u0c4d\u0c15\u0c3e\u0c30\u0c02!',
    body: (m, d) =>
      `UNIX \u0c2f\u0c41\u0c17\u0c02 \u0c28\u0c41\u0c02\u0c21\u0c3f ${m} \u0c17\u0c02\u0c1f\u0c32\u0c41 ${d} \u0c28 \u0c2a\u0c42\u0c30\u0c4d\u0c24\u0c3f \u0c05\u0c35\u0c41\u0c24\u0c3e\u0c2f\u0c3f. \u0c08 \u0c15\u0c4d\u0c37\u0c23\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c2e\u0c3f\u0c38\u0c4d \u0c1a\u0c47\u0c2f\u0c15\u0c02\u0c21\u0c3f!`,
    buttonText: 'Unix Time \u0c24\u0c46\u0c30\u0c41\u0c35\u0c41',
    footer: (url) =>
      `\u0c28\u0c4b\u0c1f\u0c3f\u0c2b\u0c3f\u0c15\u0c47\u0c37\u0c28\u0c4d\u0c32 \u0c28\u0c41\u0c02\u0c21\u0c3f \u0c05\u0c28\u0c4d\u200c\u0c38\u0c2c\u0c4d\u200c\u0c38\u0c4d\u0c15\u0c4d\u0c30\u0c48\u0c2c\u0c4d: ${url}`,
  },
}

/**
 * Получить переводы для указанного языка (fallback на en)
 */
export function getEmailStrings(locale: string): EmailStrings {
  return EMAIL_TRANSLATIONS[locale] || EMAIL_TRANSLATIONS.en
}
