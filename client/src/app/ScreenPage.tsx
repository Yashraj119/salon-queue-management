import { useLocation } from 'react-router-dom';
import { strings } from '../strings';
import type { PageKey } from '../strings';

export function ScreenPage({ pageKey }: { pageKey: PageKey }) {
  const { pathname } = useLocation();
  const isDisplay = pageKey === 'display';
  const subtitle = strings[`${pageKey}Subtitle`];

  return (
    <section className={`screen-card${isDisplay ? ' screen-card-display' : ''}`} key={pathname}>
      {isDisplay && <p className="display-kicker">{strings.brand}</p>}
      <h1 className="screen-title">{strings[pageKey]}</h1>
      <p className="screen-subtitle">{subtitle}</p>
      <div className="gold-divider" role="img" aria-label={strings.ornament}>
        <span />
      </div>
    </section>
  );
}
