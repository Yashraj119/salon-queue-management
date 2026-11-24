export const strings = {
  brand: 'Salon Queue',
  devScreens: 'Screens',
  navigation: 'Screen navigation',
  staffBadge: 'STAFF',
  ornament: 'Decorative divider',
  home: 'Home',
  homeSubtitle: 'A considered welcome, with every detail in its place.',
  join: 'Join the queue',
  joinSubtitle: 'Your visit begins with a little time for yourself.',
  status: 'Your place',
  statusSubtitle: 'A quiet moment, while we prepare for your visit.',
  reception: 'Reception',
  receptionSubtitle: 'A clear view of the day, beautifully composed.',
  barber: 'Barber view',
  barberSubtitle: 'Your chair, your craft, and the next guest.',
  display: 'The waiting room',
  displaySubtitle: 'A calm welcome for everyone arriving.',
  admin: 'Salon settings',
  adminSubtitle: 'The details behind a thoughtful experience.',
} as const;

export type PageKey = 'home' | 'join' | 'status' | 'reception' | 'barber' | 'display' | 'admin';
