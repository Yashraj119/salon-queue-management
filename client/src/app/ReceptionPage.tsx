import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Clock3, Plus, UserRound, X } from 'lucide-react';
import { addWalkIn, callNextForBarber, cancelQueueEntry, getReceptionData, markNoShow, StaffApiError } from '../api/staffApi';
import type { ReceptionData, StaffBarberCard, StaffQueueEntry } from '../api/staffApi';
import { getCatalogData } from '../api/publicApi';
import type { CatalogData } from '../api/publicApi';
import { BarberAvatar } from '../components/BarberAvatar';
import { useStaffSession } from '../auth/StaffSession';
import { socket } from '../realtime/socket';
import { strings } from '../strings';

type WalkInErrors = Partial<Record<'name' | 'phone' | 'services', string>>;

function statusText(status: StaffBarberCard['status']) {
  if (status === 'On break') return strings.statusBreak;
  if (status === 'Busy') return strings.statusBusy;
  if (status === 'Called') return strings.calledStatus;
  return strings.statusAvailable;
}

function remainingTime(entry: StaffQueueEntry, now: number) {
  const called = entry.status === 'Called';
  const start = called ? entry.calledAt : entry.startedAt;
  const totalSeconds = called ? 10 * 60 : Math.max(60, entry.totalServiceMinutes * 60);
  const elapsedSeconds = start ? Math.max(0, Math.floor((now - Date.parse(start)) / 1000)) : 0;
  const secondsLeft = Math.max(0, totalSeconds - elapsedSeconds);
  const elapsedPercent = Math.min(100, (elapsedSeconds / totalSeconds) * 100);

  return {
    secondsLeft,
    elapsedPercent,
    label: called ? strings.arrivalWindow : strings.serviceProgress,
    statusLabel: called ? strings.waitingForArrival : strings.inService,
  };
}

function waitLabel(minutes: number) {
  return strings.timeFormat(minutes);
}

function BarberCurrentCard({ barber, now, busy, onCallNext }: {
  barber: StaffBarberCard;
  now: number;
  busy: boolean;
  onCallNext: (barber: StaffBarberCard) => void;
}) {
  const current = barber.current;
  const progress = current ? remainingTime(current, now) : null;
  const minutesLeft = progress ? Math.ceil(progress.secondsLeft / 60) : 0;

  return (
    <article className="reception-barber-card luxury-card">
      <header className="reception-barber-header">
        <div className="reception-barber-identity">
          <BarberAvatar barber={{ ...barber, status: barber.status === 'Called' ? 'Busy' : barber.status }} />
          <div>
            <h2>{barber.name}</h2>
            <span className={`reception-status status-${barber.status.toLowerCase().replaceAll(' ', '-')}`}>
              <span className="status-dot" />{statusText(barber.status)}
            </span>
          </div>
        </div>
        {current && <span className="current-token">{current.token}</span>}
      </header>

      {current ? (
        <div className="current-guest">
          <p className="eyebrow">{strings.currentCustomer}</p>
          <h3>{current.customerName}</h3>
          <p className="current-services">{current.services.map((service) => service.name).join(' · ')}</p>
          <div className="current-time-row">
            <span>{progress?.statusLabel}</span>
            <strong>{progress ? (minutesLeft > 0 ? strings.timeLeft(minutesLeft) : current.status === 'Called' ? strings.arrivalWindowExpired : strings.lessThanMinute) : ''}</strong>
          </div>
          <div
            className="service-progress-track"
            role="progressbar"
            aria-label={progress?.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress?.elapsedPercent ?? 0)}
          >
            <span style={{ width: `${progress?.elapsedPercent ?? 0}%` }} />
          </div>
        </div>
      ) : (
        <div className="empty-chair">
          <UserRound size={20} strokeWidth={1.5} />
          <p>{strings.noCurrentCustomer}</p>
        </div>
      )}

      <button
        type="button"
        className="button-primary call-next-button"
        onClick={() => onCallNext(barber)}
        disabled={busy || !barber.canCallNext}
        title={barber.unavailableReason === 'on_break' ? strings.callOnBreak : barber.unavailableReason === 'occupied' ? strings.callOccupied : undefined}
      >
        {busy ? strings.calling : strings.callNext}<ArrowRight size={16} strokeWidth={1.5} />
      </button>
      {!barber.canCallNext && !current && (
        <p className="barber-card-note">
          {barber.unavailableReason === 'on_break' ? strings.callOnBreak : strings.callNoEligible}
        </p>
      )}
    </article>
  );
}

function QueueRow({ entry, busy, onCancel, onNoShow }: {
  entry: StaffQueueEntry;
  busy: boolean;
  onCancel: (entry: StaffQueueEntry) => void;
  onNoShow: (entry: StaffQueueEntry) => void;
}) {
  const longWait = entry.waitingMinutes > 60;
  const preferredBarber = entry.preferredBarberName ?? strings.anyBarber;

  return (
    <article className={`queue-row${longWait ? ' is-over-hour' : ''}${entry.status === 'Called' ? ' is-called' : ''}`}>
      <div className="queue-token-cell">
        <span className="queue-column-label">{strings.token}</span>
        <strong>{entry.token}</strong>
        {entry.status === 'Called' && <span className="called-row-badge">{strings.calledStatus}</span>}
      </div>
      <div className="queue-name-cell">
        <span className="queue-column-label">{strings.guest}</span>
        <strong>{entry.customerName}</strong>
      </div>
      <div className="queue-services-cell">
        <span className="queue-column-label">{strings.services}</span>
        <span>{entry.services.map((service) => service.name).join(', ')}</span>
      </div>
      <div className="queue-preference-cell">
        <span className="queue-column-label">{strings.preferredBarber}</span>
        <span>{preferredBarber}</span>
      </div>
      <div className="queue-wait-cell">
        <span className="queue-column-label">{strings.waitingTime}</span>
        <strong>{waitLabel(entry.waitingMinutes)}</strong>
        {longWait && <span className="over-hour-badge">{strings.waitingOverHour}</span>}
      </div>
      <div className="queue-actions-cell">
        <button
          type="button"
          className="queue-action queue-action-noshow"
          onClick={() => onNoShow(entry)}
          disabled={busy || !entry.noShowAvailable}
          title={!entry.noShowAvailable ? strings.noShowAfterTenMinutes : undefined}
        >
          {strings.noShow}
        </button>
        <button
          type="button"
          className="queue-action queue-action-cancel"
          onClick={() => onCancel(entry)}
          disabled={busy || entry.status !== 'Waiting'}
        >
          {strings.cancel}
        </button>
      </div>
    </article>
  );
}

function WalkInDialog({ catalog, pin, onClose, onAdded }: {
  catalog: CatalogData | null;
  pin: string;
  onClose: () => void;
  onAdded: (result: { duplicate: boolean; token: string }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<WalkInErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function toggleService(id: number) {
    setServiceIds((current) => current.includes(id)
      ? current.filter((serviceId) => serviceId !== id)
      : current.length < 3 ? [...current, id] : current);
    setErrors((current) => ({ ...current, services: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: WalkInErrors = {};
    if (name.trim().length < 2 || name.trim().length > 80) nextErrors.name = strings.fieldNameInvalid;
    if (!/^\d{10}$/.test(phone)) nextErrors.phone = strings.fieldPhoneInvalid;
    if (serviceIds.length === 0) nextErrors.services = strings.fieldServicesRequired;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await addWalkIn(pin, { name: name.trim(), phone, serviceIds, barberId: null });
      onAdded({ duplicate: result.duplicate, token: result.entry.token });
      if (!result.duplicate) onClose();
    } catch {
      setErrors({ phone: strings.staffError });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="walkin-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="walkin-dialog luxury-card" role="dialog" aria-modal="true" aria-labelledby="walkin-title">
        <header className="walkin-dialog-header">
          <div><p className="eyebrow">{strings.walkInTitle}</p><h2 id="walkin-title">{strings.walkInDescription}</h2></div>
          <button type="button" className="icon-button" aria-label={strings.closeDialog} onClick={onClose}><X size={18} strokeWidth={1.5} /></button>
        </header>
        <form className="walkin-form" onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="walkin-name">
            {strings.walkInName}
            <input id="walkin-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label className="field-label" htmlFor="walkin-phone">
            {strings.walkInPhone}
            <input id="walkin-phone" value={phone} type="tel" inputMode="numeric" maxLength={10} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} autoComplete="tel-national" />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </label>
          <fieldset className="walkin-services">
            <legend>{strings.walkInServices}</legend>
            {catalog?.services.map((service) => {
              const selected = serviceIds.includes(service.id);
              return (
                <button
                  type="button"
                  key={service.id}
                  className={`walkin-service-option${selected ? ' is-selected' : ''}`}
                  aria-pressed={selected}
                  disabled={!selected && serviceIds.length >= 3}
                  onClick={() => toggleService(service.id)}
                >
                  <span className="service-check" aria-hidden="true">{selected && <Check size={15} strokeWidth={1.7} />}</span>
                  <span>{service.nameEn}</span>
                  <small>{strings.timeFormat(service.durationMinutes)}</small>
                </button>
              );
            })}
            {errors.services && <span className="field-error">{errors.services}</span>}
          </fieldset>
          <button type="submit" className="button-primary walkin-submit" disabled={submitting || !catalog}>
            {submitting ? strings.savingWalkIn : strings.saveWalkIn}<Plus size={16} strokeWidth={1.5} />
          </button>
        </form>
      </section>
    </div>
  );
}

export function ReceptionPage() {
  const { pin, lock } = useStaffSession();
  const [data, setData] = useState<ReceptionData | null>(null);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!pin) return;
    try {
      const [reception, serviceCatalog] = await Promise.all([getReceptionData(pin), getCatalogData()]);
      setData(reception);
      setCatalog(serviceCatalog);
      setError('');
    } catch (cause) {
      if (cause instanceof StaffApiError && cause.status === 401) {
        lock();
        return;
      }
      setError(cause instanceof StaffApiError && cause.code === 'network_error' ? strings.staffNetworkError : strings.staffError);
    } finally {
      setLoading(false);
    }
  }, [pin, lock]);

  useEffect(() => {
    void refresh();
    const onQueueChanged = () => void refresh();
    socket.on('queue:changed', onQueueChanged);
    const refreshTimer = window.setInterval(() => void refresh(), 10_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      socket.off('queue:changed', onQueueChanged);
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [refresh]);

  async function handleCallNext(barber: StaffBarberCard) {
    if (!pin) return;
    setBusyAction(`call:${barber.id}`);
    setNotice('');
    try {
      await callNextForBarber(pin, barber.id);
      await refresh();
    } catch (cause) {
      const code = cause instanceof StaffApiError ? cause.code : '';
      setNotice(code === 'barber_on_break' ? strings.callOnBreak : code === 'barber_occupied' ? strings.callOccupied : code === 'no_eligible_customer' ? strings.callNoEligible : strings.staffError);
    } finally {
      setBusyAction('');
    }
  }

  async function handleCancel(entry: StaffQueueEntry) {
    if (!pin || !window.confirm(strings.confirmCancel)) return;
    setBusyAction(entry.id);
    setNotice('');
    try {
      await cancelQueueEntry(pin, entry.id);
      setNotice(strings.cancelSucceeded);
      await refresh();
    } catch {
      setNotice(strings.staffError);
    } finally {
      setBusyAction('');
    }
  }

  async function handleNoShow(entry: StaffQueueEntry) {
    if (!pin) return;
    setBusyAction(entry.id);
    setNotice('');
    try {
      await markNoShow(pin, entry.id);
      setNotice(strings.noShowSucceeded);
      await refresh();
    } catch {
      setNotice(strings.staffError);
    } finally {
      setBusyAction('');
    }
  }

  function handleWalkInAdded(result: { duplicate: boolean; token: string }) {
    setDialogOpen(false);
    setNotice(result.duplicate ? strings.walkInDuplicate(result.token) : strings.walkInSucceeded(result.token));
    void refresh();
  }

  const queueCount = data?.waiting.length ?? 0;

  return (
    <div className="reception-page">
      <header className="reception-toolbar">
        <div className="reception-toolbar-copy">
          <p className="eyebrow">{strings.receptionEyebrow}</p>
          <p className="reception-description">{strings.receptionDescription}</p>
        </div>
        <div className="reception-toolbar-actions">
          <span className={`queue-open-badge${data?.queueOpen ? ' is-open' : ' is-closed'}`}>
            <span className="status-dot" />{data?.queueOpen ? strings.queueStatusOpen : strings.queueStatusClosed}
          </span>
          <button type="button" className="button-primary walkin-open-button" onClick={() => { setNotice(''); setDialogOpen(true); }}>
            <Plus size={17} strokeWidth={1.5} />{strings.addWalkIn}
          </button>
        </div>
      </header>

      {error && <div className="reception-alert" role="alert"><span>{error}</span><button type="button" className="button-secondary" onClick={() => void refresh()}>{strings.retry}</button></div>}
      {notice && <div className="reception-notice" role="status">{notice}</div>}

      <div className="reception-grid">
        <section className="reception-barbers-section">
          <header className="reception-section-heading">
            <div><p className="eyebrow">{strings.barbersOnDuty}</p><h2>{data?.barbers.length ?? 0}</h2></div>
            <span>{loading ? strings.loading : strings.barbersOnDuty}</span>
          </header>
          <div className="reception-barber-grid">
            {data?.barbers.map((barber) => (
              <BarberCurrentCard
                key={barber.id}
                barber={barber}
                now={now}
                busy={busyAction === `call:${barber.id}`}
                onCallNext={handleCallNext}
              />
            ))}
            {!loading && data?.barbers.length === 0 && <p className="reception-empty-note">{strings.noBarbersOnDuty}</p>}
          </div>
        </section>

        <section className="reception-queue-section">
          <header className="reception-section-heading queue-list-heading">
            <div><p className="eyebrow">{strings.waitingList}</p><h2>{strings.waitingListCount(queueCount)}</h2></div>
            <button type="button" className="refresh-queue-button" onClick={() => void refresh()} aria-label={strings.retry}>
              <Clock3 size={17} strokeWidth={1.5} />
            </button>
          </header>
          <div className="queue-table">
            <div className="queue-table-head">
              <span>{strings.token}</span><span>{strings.guest}</span><span>{strings.services}</span>
              <span>{strings.preferredBarber}</span><span>{strings.waitingTime}</span><span>{strings.actions}</span>
            </div>
            {data?.waiting.map((entry) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                busy={busyAction === entry.id}
                onCancel={handleCancel}
                onNoShow={handleNoShow}
              />
            ))}
            {loading && !data && <p className="queue-empty-state">{strings.loading}</p>}
            {!loading && data?.waiting.length === 0 && (
              <div className="queue-empty-state"><p>{strings.waitingListEmpty}</p><span>{strings.waitingListEmptyNote}</span></div>
            )}
          </div>
        </section>
      </div>

      {dialogOpen && pin && <WalkInDialog catalog={catalog} pin={pin} onClose={() => setDialogOpen(false)} onAdded={handleWalkInAdded} />}
    </div>
  );
}
