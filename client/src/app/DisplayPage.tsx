import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, Radio } from 'lucide-react';
import { getDisplayData } from '../api/publicApi';
import type { DisplayData } from '../api/publicApi';
import { BarberAvatar } from '../components/BarberAvatar';
import { socket } from '../realtime/socket';
import { strings } from '../strings';

function playChime() {
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const resume = context.state === 'suspended' ? context.resume() : Promise.resolve();
    void resume.then(() => {
      const startTone = (frequency: number, offset: number) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.42);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(context.currentTime + offset);
        oscillator.stop(context.currentTime + offset + 0.45);
      };
      startTone(740, 0);
      startTone(988, 0.17);
      window.setTimeout(() => void context.close(), 900);
    }).catch(() => void context.close());
  } catch {
    // Some browsers keep audio suspended until a local interaction has occurred.
  }
}

export function DisplayPage() {
  const [data, setData] = useState<DisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(socket.connected);
  const [flashingToken, setFlashingToken] = useState<string | null>(null);
  const previousCalls = useRef<Map<string, string>>(new Map());
  const hasSnapshot = useRef(false);
  const flashTimeout = useRef<number | null>(null);

  const refresh = useCallback(async (announce = false) => {
    try {
      const next = await getDisplayData();
      if (announce && hasSnapshot.current) {
        const newCall = next.barbers.find((barber) => barber.current?.status === 'Called'
          && previousCalls.current.get(barber.id) !== `${barber.current.id}:${barber.current.calledAt ?? ''}`);
        if (newCall?.current) {
          setFlashingToken(newCall.current.token);
          playChime();
          if (flashTimeout.current !== null) window.clearTimeout(flashTimeout.current);
          flashTimeout.current = window.setTimeout(() => setFlashingToken(null), 5000);
        }
      }
      previousCalls.current = new Map(next.barbers
        .filter((barber) => barber.current?.status === 'Called')
        .map((barber) => [barber.id, `${barber.current!.id}:${barber.current!.calledAt ?? ''}`]));
      hasSnapshot.current = true;
      setData(next);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh(true);
    const onConnect = () => { setLive(true); void refresh(); };
    const onDisconnect = () => setLive(false);
    socket.on('queue:changed', onChanged);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('queue:changed', onChanged);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (flashTimeout.current !== null) window.clearTimeout(flashTimeout.current);
    };
  }, [refresh]);

  return (
    <main className="tv-board" aria-label={strings.display}>
      <header className="tv-header">
        <div><p className="tv-kicker"><Radio size={17} />{strings.displayLive}</p><h1>{data?.salonName ?? strings.brand}</h1></div>
        <span className={`tv-live-state${live ? '' : ' is-offline'}`}><span className="status-dot" />{live ? strings.live : strings.syncUnavailable}</span>
      </header>
      {error && <div className="tv-error" role="alert"><span>{strings.statusError}</span><button type="button" onClick={() => void refresh()}>{strings.retry}</button></div>}
      {loading && !data ? <p className="tv-loading" role="status">{strings.loading}</p> : data && (
        <div className="tv-content">
          <section className="tv-barber-list" aria-label={strings.barbersOnDuty}>
            {data.barbers.map((barber) => (
              <article className="tv-barber-row" key={barber.id}>
                <BarberAvatar barber={barber} size="large" />
                <div className="tv-barber-name"><h2>{barber.name}</h2><span>{barber.status === 'On break' ? strings.displayOnBreak : barber.status === 'Busy' ? strings.statusBusy : strings.displayAvailable}</span></div>
                <div className={`tv-now-value${barber.current?.token === flashingToken ? ' is-flashing' : ''}`}>
                  <span>{strings.displayNow}</span><strong>{barber.current?.token ?? '—'}</strong>
                </div>
              </article>
            ))}
            {!data.barbers.length && <p className="tv-empty">{strings.noBarbersOnDuty}</p>}
          </section>
          <section className="tv-next-panel" aria-labelledby="tv-next-heading">
            <div className="tv-next-heading"><p className="tv-kicker"><Clock3 size={17} />{strings.displayUpNext}</p><h2 id="tv-next-heading">{strings.displayUpNext}</h2></div>
            {data.upNext.length ? (
              <ol className="tv-next-list">
                {data.upNext.map((entry, index) => (
                  <li key={entry.id} className="tv-next-row">
                    <span className="tv-next-rank">{String(index + 1).padStart(2, '0')}</span>
                    <strong className="tv-next-token">{entry.token}</strong>
                    <span className="tv-next-estimate">{entry.estimatedMinutes === null ? strings.displayWaitUnavailable : `${strings.displayEstimated} ${entry.estimatedMinutes} ${strings.displayMinutes}`}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="tv-empty">{strings.displayNoWaiting}</p>}
            {data.noWorkingBarbers && <p className="tv-wait-note">{strings.displayWaitUnavailable}</p>}
          </section>
        </div>
      )}
      <footer className="tv-footer"><span>{strings.brand}</span><span>{strings.displayLive}</span></footer>
    </main>
  );
}
