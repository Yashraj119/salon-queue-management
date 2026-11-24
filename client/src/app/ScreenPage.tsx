import type { TranslationKey } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageProvider';

export function ScreenPage({ titleKey }: { titleKey: TranslationKey }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-800/70 p-5 shadow-xl shadow-black/10 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-50 sm:text-3xl">{t(titleKey)}</h1>
      <div aria-hidden="true" className="mt-6 min-h-48 rounded-2xl border border-dashed border-white/10 bg-charcoal/50" />
    </section>
  );
}
