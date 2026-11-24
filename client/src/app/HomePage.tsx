import { ArrowRight, Clock3, Scissors, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHomeData } from '../api/publicApi';
import { BarberAvatar } from '../components/BarberAvatar';
import { usePublicData } from '../hooks/usePublicData';
import { strings } from '../strings';

function waitLabel(minutes: number | null) {
  if (minutes === null) return strings.waitUnavailable;
  return `${strings.about} ${strings.timeFormat(minutes)}`;
}

function statusLabel(status: 'Available' | 'Busy' | 'On break') {
  if (status === 'Busy') return strings.statusBusy;
  if (status === 'On break') return strings.statusBreak;
  return strings.statusAvailable;
}

export function HomePage() {
  const { data, loading, error, refresh } = usePublicData(getHomeData);

  return (
    <div className="home-page page-enter">
      <section className="home-intro">
        <p className="eyebrow"><Scissors size={14} strokeWidth={1.5} />{strings.homeEyebrow}</p>
        <h1 className="home-headline">{strings.homeHeadline}</h1>
        <p className="home-description">{strings.homeDescription}</p>
        {data && (
          <div className={`opening-badge${data.salonOpen ? ' is-open' : ' is-closed'}`}>
            <span className="opening-dot" />
            <span>{data.salonOpen ? `${strings.open} · ${strings.closes} ${data.closesAt}` : `${strings.closed} · ${strings.opens} ${data.opensAt}`}</span>
          </div>
        )}
      </section>

      {error && !data ? (
        <section className="state-card" role="alert">
          <p>{error.code === 'network_error' ? strings.networkError : strings.serviceError}</p>
          <button type="button" className="button-secondary" onClick={() => void refresh()}>{strings.retry}</button>
        </section>
      ) : (
        <>
          {error && data && (
            <div className="sync-warning" role="status">
              <p>{strings.syncUnavailable}</p>
              <button type="button" className="button-secondary" onClick={() => void refresh()}>{strings.retry}</button>
            </div>
          )}
          <section className="home-grid" aria-label={strings.homeSummary}>
            <article className="queue-card luxury-card">
              <div className="card-heading-row">
                <p className="eyebrow">{strings.liveQueue}</p>
                <span className="live-indicator"><span />{strings.live}</span>
              </div>
              {loading && !data ? (
                <p className="loading-copy">{strings.loading}</p>
              ) : data ? (
                <>
                  <div className="queue-count-row">
                    <UsersRound className="queue-icon" size={22} strokeWidth={1.5} />
                    <strong className="queue-count">{data.waitingCount}</strong>
                    <span className="queue-count-label">{data.waitingCount === 1 ? strings.personWaiting : strings.peopleWaiting}</span>
                  </div>
                  <p className="queue-note">{data.waitingCount === 0 ? strings.noOneWaiting : strings.queueMovingSmoothly}</p>
                  <div className="queue-wait-row">
                    <Clock3 size={16} strokeWidth={1.5} />
                    <span>{strings.estimatedWait}</span>
                    <strong>{waitLabel(data.expectedWaitMinutes)}</strong>
                  </div>
                  {data.workingBarberCount === 0 && <p className="availability-note">{strings.noWorkingBarbers}</p>}
                </>
              ) : null}
            </article>

            <article className="barbers-card luxury-card">
              <div className="card-heading-row">
                <p className="eyebrow">{strings.ourBarbers}</p>
                {data && <span className="barber-count-label">{data.barbers.length} {strings.onFloor}</span>}
              </div>
              {loading && !data ? (
                <p className="loading-copy">{strings.loading}</p>
              ) : data?.barbers.length ? (
                <div className="barber-chip-list">
                  {data.barbers.map((barber) => (
                    <div className="barber-chip" key={barber.id}>
                      <BarberAvatar barber={barber} />
                      <span className="barber-chip-name">{barber.name}</span>
                      <span className={`status-chip status-${barber.status.toLowerCase().replaceAll(' ', '-')}`}>
                        <span className="status-dot" />{statusLabel(barber.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="loading-copy">{strings.noBarbersOnDuty}</p>
              )}
            </article>
          </section>

          <div className="home-action-wrap">
            {loading && !data ? (
              <button type="button" className="button-primary home-join-button" disabled>{strings.loading}</button>
            ) : data?.onlineJoiningOpen && data.workingBarberCount > 0 ? (
              <Link to="/join" className="button-primary is-main-cta home-join-button">
                {strings.joinCta}<ArrowRight size={17} strokeWidth={1.5} />
              </Link>
            ) : (
              <div className="closed-join-block">
                <button type="button" className="button-primary home-join-button" disabled>{strings.joinCta}</button>
                <p>{data?.workingBarberCount === 0 && data.onlineJoiningOpen ? strings.noBarberAvailable : `${strings.joiningClosed} ${strings.walkInsWelcome}`}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
