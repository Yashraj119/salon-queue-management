import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Clock3, Coffee, Play, RotateCcw, UserRound } from 'lucide-react';
import { completeService, getBarberView, setBarberAvailability, startService, StaffApiError } from '../api/staffApi';
import type { BarberViewData } from '../api/staffApi';
import { BarberAvatar } from '../components/BarberAvatar';
import { useStaffSession } from '../auth/StaffSession';
import { socket } from '../realtime/socket';
import { strings } from '../strings';

function elapsedLabel(startedAt: string | null, now: number) {
  if (!startedAt) return '00:00';
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function BarberPage() {
  const { name = '' } = useParams();
  const { pin, lock } = useStaffSession();
  const [data, setData] = useState<BarberViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(socket.connected);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!pin || !name) return;
    try {
      const view = await getBarberView(pin, name);
      setData(view);
      setError('');
    } catch (cause) {
      if (cause instanceof StaffApiError && cause.status === 401) lock();
      setError(cause instanceof StaffApiError && cause.status === 404 ? strings.barberUnavailable : strings.staffNetworkError);
    } finally {
      setLoading(false);
    }
  }, [lock, name, pin]);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    const onConnect = () => { setLive(true); void refresh(); };
    const onDisconnect = () => setLive(false);
    socket.on('queue:changed', onChanged);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('queue:changed', onChanged);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await refresh();
    } catch (cause) {
      if (cause instanceof StaffApiError && cause.status === 401) lock();
      setError(strings.barberActionError);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <section className="barber-view-state luxury-card" role="status">{strings.loading}</section>;
  if (!data) return <section className="barber-view-state luxury-card" role="alert"><p>{error || strings.serviceError}</p><button className="button-secondary" onClick={() => void refresh()}>{strings.retry}</button></section>;

  const { barber, current, next } = data;
  const isInChair = current?.status === 'In chair';
  const isCalled = current?.status === 'Called';

  return (
    <section className="barber-view-page" aria-label={`${barber.name} barber view`}>
      <header className="barber-view-heading">
        <div className="barber-view-identity">
          <BarberAvatar barber={barber} size="large" />
          <div>
            <p className="eyebrow">{strings.barberStatus}</p>
            <h2>{barber.name}</h2>
          </div>
        </div>
          <span className={`barber-availability-pill${barber.status === 'On break' ? ' is-on-break' : ''}`}>
          <span className="status-dot" />{barber.status === 'On break' ? strings.barberOnBreakLabel : barber.status === 'Busy' ? strings.statusBusy : strings.barberAvailable}
        </span>
      </header>

      {error && <p className="barber-view-error" role="alert">{error}</p>}
      {!live && <p className="barber-view-error" role="status">{strings.syncUnavailable}</p>}

      <article className="barber-current-card luxury-card">
        <p className="eyebrow">{strings.barberCurrent}</p>
        {current ? (
          <>
            <div className="barber-current-main">
              <span className="barber-token">{current.token}</span>
              <div className="barber-customer-copy">
                <h3>{current.customerName}</h3>
                <p>{current.services.map((service) => service.name).join(' · ')}</p>
              </div>
            </div>
            <div className="barber-timer-row">
              <span><Clock3 size={18} strokeWidth={1.6} />{strings.barberTimer}</span>
              <strong>{elapsedLabel(isInChair ? current.startedAt : null, now)}</strong>
            </div>
            <button
              type="button"
              className={`barber-service-action button-primary${isCalled ? ' is-start' : ''}`}
              disabled={busy || (!isCalled && !isInChair)}
              onClick={() => void runAction(() => isCalled ? startService(pin!, barber.id) : completeService(pin!, barber.id))}
            >
              {busy ? strings.calling : isInChair ? strings.barberDone : strings.barberStart}
              {isInChair ? <Check size={22} /> : <Play size={21} fill="currentColor" />}
            </button>
          </>
        ) : (
          <div className="barber-empty-current"><UserRound size={30} strokeWidth={1.4} /><p>{strings.barberNoCurrent}</p></div>
        )}
      </article>

      <article className="barber-next-card luxury-card">
        <p className="eyebrow">{strings.barberNext}</p>
        {next ? (
          <div className="barber-next-entry">
            <strong>{next.token}</strong>
            <div><h3>{next.customerName}</h3><p>{next.services.map((service) => service.name).join(' · ')}</p></div>
          </div>
        ) : <p className="barber-next-empty">{strings.barberNextEmpty}</p>}
      </article>

      <button
        type="button"
        className={`barber-break-toggle${barber.status === 'On break' ? ' is-return' : ''}`}
        disabled={busy || (!data.canTakeBreak && barber.status !== 'On break')}
        onClick={() => void runAction(() => setBarberAvailability(pin!, barber.id, barber.status === 'On break' ? 'Available' : 'On break'))}
      >
        {barber.status === 'On break' ? <RotateCcw size={19} /> : <Coffee size={19} />}
        {barber.status === 'On break' ? strings.barberReturn : strings.barberTakeBreak}
      </button>
      {!data.canTakeBreak && barber.status !== 'On break' && <p className="barber-break-note">{strings.barberBreakUnavailable}</p>}
    </section>
  );
}
