import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, Sparkles } from 'lucide-react';
import { ApiError, createQueueEntry, getCatalogData } from '../api/publicApi';
import type { CatalogData, QueueEntryResult, Service } from '../api/publicApi';
import { BarberAvatar } from '../components/BarberAvatar';
import { usePublicData } from '../hooks/usePublicData';
import { strings } from '../strings';

type FormErrors = Partial<Record<'name' | 'phone' | 'serviceIds' | 'barberId', string>>;
type BarberChoice = 'any' | string;

function serviceErrorText(code: string) {
  if (code === 'selection_limit') return strings.fieldServicesLimit;
  if (code === 'unavailable' || code === 'invalid_selection') return strings.fieldServicesUnavailable;
  if (code === 'required') return strings.fieldServicesRequired;
  return strings.fieldServicesRequired;
}

function barberStatus(status: 'Available' | 'Busy' | 'On break') {
  if (status === 'On break') return strings.statusBreak;
  if (status === 'Busy') return strings.statusBusy;
  return strings.statusAvailable;
}

function estimateLabel(minutes: number | null) {
  return minutes === null ? strings.waitUnavailable : `${strings.about} ${strings.timeFormat(minutes)}`;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function validate(name: string, phone: string, serviceIds: number[], barberChoice: BarberChoice): FormErrors {
  const errors: FormErrors = {};
  if (name.trim().length < 2 || name.trim().length > 80) errors.name = strings.fieldNameInvalid;
  if (!/^\d{10}$/.test(phone)) errors.phone = strings.fieldPhoneInvalid;
  if (serviceIds.length === 0) errors.serviceIds = strings.fieldServicesRequired;
  else if (serviceIds.length > 3) errors.serviceIds = strings.fieldServicesLimit;
  if (!barberChoice) errors.barberId = strings.fieldBarberRequired;
  return errors;
}

function mapApiError(error: ApiError) {
  if (error.code === 'queue_closed') return { message: strings.queueClosedError };
  if (error.code === 'no_barber_available') return { message: strings.noBarberAvailable };
  if (error.code === 'network_error') return { message: strings.networkError };
  if (error.field === 'name') return { field: 'name' as const, message: strings.fieldNameInvalid };
  if (error.field === 'phone') return { field: 'phone' as const, message: strings.fieldPhoneInvalid };
  if (error.field === 'serviceIds') return { field: 'serviceIds' as const, message: serviceErrorText(error.code) };
  if (error.field === 'barberId') {
    return { field: 'barberId' as const, message: error.code === 'unavailable' ? strings.fieldBarberUnavailable : strings.fieldBarberRequired };
  }
  return { message: strings.requestError };
}

function ServiceOption({
  service,
  selected,
  disabled,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`service-option${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="service-check" aria-hidden="true">{selected && <Check size={15} strokeWidth={1.7} />}</span>
      <span className="service-option-copy">
        <span className="service-name-en">{service.nameEn}</span>
        <span className="service-name-gu" lang="gu">{service.nameGu}</span>
      </span>
      <span className="service-option-meta">
        <span>{strings.timeFormat(service.durationMinutes)}</span>
        <strong>{formatPrice(service.priceRupees)}</strong>
      </span>
    </button>
  );
}

export function JoinQueuePage() {
  const { data, loading, error, refresh } = usePublicData<CatalogData>(getCatalogData);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [barberChoice, setBarberChoice] = useState<BarberChoice>('any');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formNotice, setFormNotice] = useState('');
  const [selectionNotice, setSelectionNotice] = useState('');
  const [result, setResult] = useState<QueueEntryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedServices = useMemo(
    () => data?.services.filter((service) => selectedServiceIds.includes(service.id)) ?? [],
    [data?.services, selectedServiceIds],
  );
  const totalMinutes = selectedServices.reduce((total, service) => total + service.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((total, service) => total + service.priceRupees, 0);
  const selectedBarber = data?.barbers.find((barber) => barber.id === barberChoice);

  function toggleService(serviceId: number) {
    setSelectionNotice('');
    setResult(null);
    setFormNotice('');
    setSelectedServiceIds((current) => {
      if (current.includes(serviceId)) return current.filter((id) => id !== serviceId);
      if (current.length >= 3) {
        setSelectionNotice(strings.maxServicesReached);
        return current;
      }
      return [...current, serviceId];
    });
    setErrors((current) => ({ ...current, serviceIds: undefined }));
  }

  function selectBarber(choice: BarberChoice) {
    setBarberChoice(choice);
    setResult(null);
    setFormNotice('');
    setErrors((current) => ({ ...current, barberId: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setFormNotice('');
    const nextErrors = validate(name, phone, selectedServiceIds, barberChoice);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !data) return;
    if (!data.onlineJoiningOpen) {
      setFormNotice(strings.queueClosedError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await createQueueEntry({
        name: name.trim(),
        phone,
        serviceIds: selectedServiceIds,
        barberId: barberChoice === 'any' ? null : barberChoice,
      });
      setResult(response);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : new ApiError('request_failed');
      const mapped = mapApiError(apiError);
      if (mapped.field) setErrors((current) => ({ ...current, [mapped.field]: mapped.message }));
      else setFormNotice(mapped.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !data) {
    return (
      <section className="state-card join-load-error" role="alert">
        <p>{error.code === 'network_error' ? strings.networkError : strings.serviceError}</p>
        <button type="button" className="button-secondary" onClick={() => void refresh()}>{strings.retry}</button>
      </section>
    );
  }

  return (
    <div className="join-page page-enter">
      <header className="join-intro">
        <p className="eyebrow"><Sparkles size={14} strokeWidth={1.5} />{strings.yourDetails}</p>
        <h1 className="join-headline">{strings.joinHeadline}</h1>
        <p className="join-description">{strings.joinDescription}</p>
      </header>

      {error && data && (
        <div className="sync-warning" role="status">
          <p>{strings.syncUnavailable}</p>
          <button type="button" className="button-secondary" onClick={() => void refresh()}>{strings.retry}</button>
        </div>
      )}

      {result && (
        <section className={`join-result${result.duplicate ? ' is-existing' : ''}`} role="status" aria-live="polite">
          <div>
            <p className="eyebrow">{result.duplicate ? strings.activeSpotTitle : strings.joinSuccessTitle}</p>
            <p className="join-result-copy">{result.duplicate ? strings.activeSpotBody : strings.joinSuccessBody}</p>
            {result.entry.position !== null && <p className="join-result-position">{result.duplicate ? strings.activePosition(result.entry.position) : strings.joinSuccessPosition(result.entry.position)}</p>}
          </div>
          <div className="join-result-token"><span>{strings.tokenLabel}</span><strong>{result.entry.token}</strong></div>
        </section>
      )}

      {formNotice && <p className="form-notice" role="alert">{formNotice}</p>}

      <form id="join-form" className="join-layout" onSubmit={handleSubmit} noValidate>
        <div className="join-form-column">
          <section className="form-card luxury-card">
            <div className="form-section-heading">
              <span className="section-number">01</span>
              <div><p className="eyebrow">{strings.yourDetails}</p><h2>{strings.guestDetails}</h2></div>
            </div>
            <div className="form-fields">
              <label className="field-label" htmlFor="guest-name">
                {strings.nameLabel}
                <input
                  id="guest-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  placeholder={strings.namePlaceholder}
                  value={name}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); setResult(null); }}
                />
                {errors.name && <span id="name-error" className="field-error">{errors.name}</span>}
              </label>
              <label className="field-label" htmlFor="guest-phone">
                {strings.phoneLabel}
                <input
                  id="guest-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder={strings.phonePlaceholder}
                  value={phone}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setErrors((current) => ({ ...current, phone: undefined })); setResult(null); }}
                />
                {errors.phone && <span id="phone-error" className="field-error">{errors.phone}</span>}
              </label>
            </div>
          </section>

          <section className="form-card luxury-card">
            <div className="form-section-heading">
              <span className="section-number">02</span>
              <div><p className="eyebrow">{strings.servicesLabel}</p><h2>{strings.chooseServices}</h2></div>
              <span className="selection-count">{strings.selectedCount(selectedServiceIds.length)}</span>
            </div>
            <div className="service-options" role="group" aria-label={strings.servicesLabel}>
              {loading && !data ? <p className="loading-copy">{strings.loading}</p> : data?.services.map((service) => {
                const selected = selectedServiceIds.includes(service.id);
                return <ServiceOption
                  key={service.id}
                  service={service}
                  selected={selected}
                  disabled={!selected && selectedServiceIds.length >= 3}
                  onToggle={() => toggleService(service.id)}
                />;
              })}
            </div>
            <p className="service-limit-hint">{selectionNotice || strings.servicesHint}</p>
            {(errors.serviceIds || selectionNotice) && <p className="field-error service-error" role="alert">{errors.serviceIds ?? selectionNotice}</p>}
          </section>

          <section className="form-card luxury-card">
            <div className="form-section-heading">
              <span className="section-number">03</span>
              <div><p className="eyebrow">{strings.barberLabel}</p><h2>{strings.chooseBarber}</h2></div>
            </div>
            <div className="barber-options" role="group" aria-label={strings.barberLabel}>
              <button
                type="button"
                className={`barber-option any-barber-option${barberChoice === 'any' ? ' is-selected' : ''}`}
                aria-pressed={barberChoice === 'any'}
                onClick={() => selectBarber('any')}
              >
                <span className="any-barber-icon"><Sparkles size={20} strokeWidth={1.5} /></span>
                <span className="barber-option-copy"><strong>{strings.anyBarber}</strong><small>{strings.fastest}</small></span>
                <span className="barber-option-radio" aria-hidden="true" />
              </button>
              {data?.barbers.map((barber) => (
                <button
                  type="button"
                  key={barber.id}
                  className={`barber-option${barberChoice === barber.id ? ' is-selected' : ''}`}
                  aria-pressed={barberChoice === barber.id}
                  onClick={() => selectBarber(barber.id)}
                >
                  <BarberAvatar barber={barber} size="large" />
                  <span className="barber-option-copy"><strong>{barber.name}</strong><small>{barberStatus(barber.status)}</small></span>
                  <span className="barber-option-radio" aria-hidden="true" />
                </button>
              ))}
            </div>
            {selectedBarber?.status === 'On break' && <p className="availability-note">{strings.barberOnBreak(selectedBarber.name)}</p>}
            {errors.barberId && <p className="field-error" role="alert">{errors.barberId}</p>}
            {data?.workingBarberCount === 0 && <p className="availability-note">{strings.noBarberAvailable}</p>}
          </section>
        </div>

        <aside className="join-summary-column">
          <section className="visit-summary luxury-card" aria-live="polite">
            <p className="eyebrow">{strings.yourSummary}</p>
            <h2>{strings.summaryHeadline}</h2>
            <div className="summary-line"><span>{strings.totalTime}</span><strong>{strings.timeFormat(totalMinutes)}</strong></div>
            <div className="summary-line"><span>{strings.totalPrice}</span><strong>{formatPrice(totalPrice)}</strong></div>
            <div className="summary-divider"><span /></div>
            <div className="summary-wait"><Clock3 size={16} strokeWidth={1.5} /><span>{strings.expectedWait}</span><strong>{estimateLabel(data?.expectedWaitMinutes ?? null)}</strong></div>
            <p className="summary-footnote">{strings.waitApproximate}</p>
            {formNotice && <p className="summary-closed-note">{formNotice}</p>}
            {!data?.onlineJoiningOpen && data && <p className="summary-closed-note">{strings.joiningClosed} {strings.walkInsWelcome}</p>}
            {data?.workingBarberCount === 0 && <p className="summary-closed-note">{strings.noBarberAvailable}</p>}
            <button
              type="submit"
              className="button-primary join-submit-inline"
              disabled={loading || submitting || !data?.onlineJoiningOpen || data.workingBarberCount === 0}
            >
              {submitting ? strings.joining : strings.confirmJoin}<ArrowRight size={17} strokeWidth={1.5} />
            </button>
          </section>
        </aside>

        <div className="join-mobile-dock">
          <div className="join-mobile-total"><span>{strings.totalPrice}</span><strong>{formatPrice(totalPrice)}</strong></div>
          <button type="submit" form="join-form" className="button-primary" disabled={loading || submitting || !data?.onlineJoiningOpen || data.workingBarberCount === 0}>
            {submitting ? strings.joining : strings.confirmJoin}<ArrowRight size={17} strokeWidth={1.5} />
          </button>
        </div>
      </form>
    </div>
  );
}
