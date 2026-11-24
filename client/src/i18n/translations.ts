export const translations = {
  en: {
    brand: 'Salon Queue',
    mainNavigation: 'Main navigation',
    languageToggle: 'Change language',
    englishLanguage: 'English',
    gujaratiLanguage: 'ગુજરાતી',
    home: 'Home',
    join: 'Join queue',
    status: 'My status',
    reception: 'Reception',
    barber: 'Barber view',
    display: 'Waiting area display',
    admin: 'Owner settings',
  },
  gu: {
    brand: 'સલૂન કતાર',
    mainNavigation: 'મુખ્ય નેવિગેશન',
    languageToggle: 'ભાષા બદલો',
    englishLanguage: 'English',
    gujaratiLanguage: 'ગુજરાતી',
    home: 'હોમ',
    join: 'કતારમાં જોડાઓ',
    status: 'મારી સ્થિતિ',
    reception: 'રિસેપ્શન',
    barber: 'વાળંદ દૃશ્ય',
    display: 'પ્રતીક્ષા વિસ્તાર ડિસ્પ્લે',
    admin: 'માલિક સેટિંગ્સ',
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)['en'];
