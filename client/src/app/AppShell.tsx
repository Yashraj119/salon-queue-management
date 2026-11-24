import { Scissors } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { strings } from '../strings';
import type { PageKey } from '../strings';
import { socket } from '../realtime/socket';
import { useEffect } from 'react';

const pageLinks: { to: string; key: PageKey }[] = [
  { to: '/', key: 'home' },
  { to: '/join', key: 'join' },
  { to: '/status/demo', key: 'status' },
  { to: '/reception', key: 'reception' },
  { to: '/barber/demo', key: 'barber' },
  { to: '/display', key: 'display' },
  { to: '/admin', key: 'admin' },
];

function CombMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 24" className="comb-mark" fill="none">
      <path d="M4 5.5h20v4H4zM6 9.5v9m4-9v9m4-9v9m4-9v9m4-9v9" />
    </svg>
  );
}

function Brand() {
  return (
    <Link to="/" className="brand-lockup" aria-label={strings.brand}>
      <span className="brand-mark" aria-hidden="true">
        <Scissors size={21} strokeWidth={1.5} />
        <CombMark />
      </span>
      <span className="brand-name">{strings.brand}</span>
    </Link>
  );
}

function ScreensTaskbar({ display = false }: { display?: boolean }) {
  if (!import.meta.env.DEV) return null;

  return (
    <nav className={`screens-taskbar${display ? ' screens-taskbar-display' : ''}`} aria-label={strings.navigation}>
      {pageLinks.map(({ to, key }) => (
        <NavLink key={key} to={to} end={to === '/'}>
          {strings[key]}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const isDisplay = pathname === '/display';
  const isStaff = pathname === '/reception' || pathname.startsWith('/barber/') || pathname === '/admin';
  const pageKey: PageKey = pathname === '/join'
    ? 'join'
    : pathname.startsWith('/status/')
      ? 'status'
      : pathname === '/reception'
        ? 'reception'
        : pathname.startsWith('/barber/')
          ? 'barber'
          : pathname === '/display'
            ? 'display'
            : pathname === '/admin'
              ? 'admin'
              : 'home';

  useEffect(() => {
    document.title = strings.brand;
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  if (isDisplay) {
    return (
      <div className="app-canvas display-canvas">
        <Outlet />
        <ScreensTaskbar display />
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="app-canvas staff-canvas">
        <header className="staff-header">
          <div className="staff-header-inner">
            <div className="staff-header-top">
              <div className="staff-heading-wrap">
                <h1 className="staff-heading">{strings[pageKey]}</h1>
                <span className="staff-badge">{strings.staffBadge}</span>
              </div>
            </div>
            <ScreensTaskbar />
          </div>
        </header>
        <main className="page-main staff-main"><Outlet /></main>
      </div>
    );
  }

  return (
    <div className="app-canvas customer-canvas">
      <header className="customer-header">
        <div className="customer-header-inner">
          <div className="customer-header-top"><Brand /></div>
          <ScreensTaskbar />
        </div>
      </header>
      <main className="page-main customer-main"><Outlet /></main>
      <div className="mobile-action-bar" aria-hidden="true" />
    </div>
  );
}
