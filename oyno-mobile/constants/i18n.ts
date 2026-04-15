type Lang = 'ru' | 'en';

type Translations = {
  [key: string]: { ru: string; en: string };
};

const translations: Translations = {
  // Auth
  'auth.login': { ru: 'Войти', en: 'Sign In' },
  'auth.register': { ru: 'Регистрация', en: 'Sign Up' },
  'auth.phone': { ru: 'Номер телефона', en: 'Phone number' },
  'auth.password': { ru: 'Пароль', en: 'Password' },
  'auth.name': { ru: 'Имя', en: 'Name' },
  'auth.otp': { ru: 'Код подтверждения', en: 'Verification code' },
  'auth.sendOtp': { ru: 'Отправить код', en: 'Send code' },
  'auth.noAccount': { ru: 'Нет аккаунта?', en: "Don't have an account?" },
  'auth.hasAccount': { ru: 'Уже есть аккаунт?', en: 'Already have an account?' },

  // Nav
  'nav.home': { ru: 'Главная', en: 'Home' },
  'nav.games': { ru: 'Игры', en: 'Games' },
  'nav.chats': { ru: 'Чаты', en: 'Chats' },
  'nav.profile': { ru: 'Профиль', en: 'Profile' },
  'nav.dashboard': { ru: 'Дашборд', en: 'Dashboard' },
  'nav.venues': { ru: 'Площадки', en: 'Venues' },
  'nav.bookings': { ru: 'Брони', en: 'Bookings' },

  // Home
  'home.hotMatches': { ru: 'Горящие матчи', en: 'Hot matches' },
  'home.sportBases': { ru: 'Спортивные базы', en: 'Sport venues' },
  'home.createGame': { ru: 'Создать свою игру', en: 'Create your game' },
  'home.all': { ru: 'Все', en: 'All' },

  // Games
  'games.title': { ru: 'ИГРЫ', en: 'GAMES' },
  'games.all': { ru: 'Все игры', en: 'All games' },
  'games.upcoming': { ru: 'Предстоящие', en: 'Upcoming' },
  'games.history': { ru: 'История', en: 'History' },
  'games.join': { ru: 'Записаться на игру', en: 'Join game' },
  'games.inGame': { ru: 'Ты в игре', en: "You're in" },
  'games.goToChat': { ru: 'Ворваться в чат', en: 'Go to chat' },
  'games.needed': { ru: 'Нужно', en: 'Need' },
  'games.notFound': { ru: 'Ничего не найдено', en: 'Nothing found' },
  'games.confirmed': { ru: 'Подтвержден', en: 'Confirmed' },
  'games.waiting': { ru: 'Ожидание', en: 'Waiting' },

  // Chats
  'chats.title': { ru: 'ЧАТЫ', en: 'CHATS' },
  'chats.search': { ru: 'Поиск игроков...', en: 'Search players...' },
  'chats.online': { ru: 'в сети', en: 'online' },
  'chats.type': { ru: 'Напиши что-нибудь...', en: 'Type a message...' },

  // Profile
  'profile.title': { ru: 'Профиль', en: 'Profile' },
  'profile.edit': { ru: 'Редактировать профиль', en: 'Edit profile' },
  'profile.payment': { ru: 'Способ оплаты', en: 'Payment method' },
  'profile.venues': { ru: 'Мои площадки', en: 'My venues' },
  'profile.settings': { ru: 'Настройки', en: 'Settings' },
  'profile.ownerMode': { ru: 'Режим владельца', en: 'Owner mode' },
  'profile.logout': { ru: 'Выйти из профиля', en: 'Sign out' },
  'profile.advanced': { ru: 'Продвинутый игрок', en: 'Advanced player' },
  'profile.matches': { ru: 'Матчи', en: 'Matches' },
  'profile.rating': { ru: 'Рейтинг', en: 'Rating' },
  'profile.reliability': { ru: 'Надёжность', en: 'Reliability' },

  // Owner CRM
  'owner.dashboard': { ru: 'ДАШБОРД', en: 'DASHBOARD' },
  'owner.revenue': { ru: 'Выручка', en: 'Revenue' },
  'owner.bookings': { ru: 'Брони', en: 'Bookings' },
  'owner.occupancy': { ru: 'Заполненность', en: 'Occupancy' },
  'owner.today': { ru: 'Сегодня', en: 'Today' },
  'owner.week': { ru: 'Неделя', en: 'Week' },
  'owner.month': { ru: 'Месяц', en: 'Month' },
  'owner.addVenue': { ru: 'Добавить площадку', en: 'Add venue' },
  'owner.playerMode': { ru: 'Режим игрока', en: 'Player mode' },
  'owner.confirm': { ru: 'Подтвердить', en: 'Confirm' },
  'owner.cancel': { ru: 'Отменить', en: 'Cancel' },
  'owner.pending': { ru: 'Ожидает', en: 'Pending' },
  'owner.confirmed': { ru: 'Подтверждено', en: 'Confirmed' },

  // Common
  'common.save': { ru: 'Сохранить', en: 'Save' },
  'common.cancel': { ru: 'Отмена', en: 'Cancel' },
  'common.back': { ru: 'Назад', en: 'Back' },
  'common.search': { ru: 'Поиск', en: 'Search' },
  'common.loading': { ru: 'Загрузка...', en: 'Loading...' },
  'common.error': { ru: 'Что-то пошло не так', en: 'Something went wrong' },
  'common.retry': { ru: 'Повторить', en: 'Retry' },
  'common.location': { ru: 'Локация', en: 'Location' },
  'common.date': { ru: 'Дата', en: 'Date' },
  'common.time': { ru: 'Время', en: 'Time' },
  'common.description': { ru: 'Описание', en: 'Description' },
};

let currentLang: Lang = 'ru';

export const setLanguage = (lang: Lang) => {
  currentLang = lang;
};

export const t = (key: string): string => {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] ?? key;
};

export const getLanguage = (): Lang => currentLang;
