import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { TranslationKey } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageProvider';
import { socket } from '../realtime/socket';

const navigation: { to: string; label: TranslationKey }[] = [
  { to: '/', label: 'home' },
  { to: '/join', label: 'join' },
  { to: '/status/demo', label: 'status' },
  { to: '/reception', label: 'reception' },
  { to: '/barber/demo', label: 'barber' },
  { to: '/display', label: 'display' },
  { to: '/admin', label: 'admin' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language === 'gu' ? 'gu' : 'en';
    document.title = t('brand');
  }, [language, t]);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-charcoal text-stone-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold tracking-wide text-gold">{t('brand')}</span>
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t('languageToggle')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/40 px-4 text-sm font-medium text-gold transition hover:bg-gold/10"
            >
              <Languages aria-hidden="true" size={17} />
              <span>{language === 'en' ? t('gujaratiLanguage') : t('englishLanguage')}</span>
            </button>
          </div>
          <nav aria-label={t('mainNavigation')} className="flex gap-2 overflow-x-auto pb-1">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
                    isActive ? 'bg-gold text-charcoal' : 'text-stone-300 hover:bg-white/10'
                  }`
                }
              >
                {t(label)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
